import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isChlorineRowCompatible, OPEN_COOLING_WATER_TYPES } from "../src/domain/compatibility.js";
import { isTechnicalAbsenceRow, isTechnicalAbsenceSelection } from "../src/domain/options.js";
import { resolveIs2ModelCode } from "../src/domain/mdc.js";
import { buildPumpSegment } from "../src/domain/pumps.js";
import { requiresPtSuffix, resolvePortaSondasSuffix } from "../src/domain/probes.js";
import { compositionKey, physicalComponentsForConfiguration } from "../src/domain/equipmentComposition.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const questionsDir = path.join(rootDir, "public", "questions");
const outputFile = path.join(rootDir, "all_reply_combinations_filtered.csv");
const registryFile = path.join(rootDir, "public", "selector_phc_registry.csv");

const questionDefs = [
  { id: "is2_modelo", csvFile: "is2_modelo.csv" },
  { id: "bomba_biocida_inorganico", csvFile: "bomba_biocida_inorganico.csv" },
  { id: "bomba_biocida_organico", csvFile: "bomba_biocida_organico.csv" },
  { id: "bomba_controlo_ph", csvFile: "bomba_controlo_ph.csv" },
  { id: "bomba_inibidor", csvFile: "bomba_inibidor.csv" },
  { id: "sonda_cloro", csvFile: "sonda_cloro.csv" },
  { id: "sonda_ph", csvFile: "sonda_ph.csv" },
  { id: "sonda_condutividade", csvFile: "sonda_condutividade.csv" }
];

const circuitoDef = { id: "circuito", csvFile: "circuito.csv" };
const portaSondasDef = { id: "porta_sondas", csvFile: "porta_sondas.csv" };
const bdwDef = { id: "bdw", csvFile: "bdw.csv" };
const mandatoryAddOnsDef = { id: "mandatory_addons", csvFile: "mandatory_addons.csv" };

const probeQuestionIds = ["sonda_cloro", "sonda_ph", "sonda_condutividade"];
const openCoolingWaterTypes = OPEN_COOLING_WATER_TYPES;
const phcReferencePrefix = "534.iS2";
const phcReferenceWidth = 11;
const historicalRowCount = 5940;
const historicalHighestReference = 5940;

function phcReferenceForNumber(number) {
  return `${phcReferencePrefix}${String(number).padStart(phcReferenceWidth, "0")}`;
}

function parsePhcReference(reference) {
  const match = /^534\.iS2(\d{11})$/.exec(reference ?? "");
  if (!match) {
    throw new Error(`Invalid equipment PHC reference: ${reference}`);
  }
  return Number(match[1]);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parsePrice(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/\s/g, "").replace("€", "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());

  return lines
    .slice(1)
    .map((line) => {
      const cells = parseCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = cells[index] ?? "";
      });

      return {
        ...row,
        option: row.option ?? "",
        price: parsePrice(row.price),
        code: row.code ?? "",
        description: row.description ?? ""
      };
    })
    .filter((row) => row.option.length > 0);
}

function parseCsvRecords(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows };
}

async function loadRows(directory = questionsDir) {
  const defs = [...questionDefs, circuitoDef, portaSondasDef, bdwDef, mandatoryAddOnsDef];
  const entries = await Promise.all(
    defs.map(async (def) => {
      const csv = await fs.readFile(path.join(directory, def.csvFile), "utf8");
      return [def.id, parseCsv(csv)];
    })
  );
  return Object.fromEntries(entries);
}

function isProbeOptionVisibleForCircuit(circuitClass, openCoolingWaterType, row) {
  return isChlorineRowCompatible(row, circuitClass, openCoolingWaterType);
}

function getProbeRowsForCircuit(rows, questionId, circuitClass, openCoolingWaterType) {
  if (questionId !== "sonda_cloro") return rows;
  return rows.filter((row) =>
    isProbeOptionVisibleForCircuit(circuitClass, openCoolingWaterType, row)
  );
}

function getOptionRow(questionRows, questionId, option) {
  if (!option) return null;
  return (questionRows[questionId] ?? []).find((row) => row.option === option) ?? null;
}

function getCodeRow(questionRows, questionId, code) {
  return (questionRows[questionId] ?? []).find((row) => row.code === code) ?? null;
}

function getOptionPrice(questionRows, questionId, option) {
  return getOptionRow(questionRows, questionId, option)?.price ?? 0;
}

function defaultAssemblyCode(questionRows, questionId, option) {
  if (questionId === "is2_modelo") {
    return resolveIs2ModelCode(questionRows.is2_modelo ?? [], option);
  }
  return getOptionRow(questionRows, questionId, option)?.code ?? "";
}

function formatSondaSegment(probeCodes, chlorineRow, phRow, conductivityRow) {
  const selectedCodes = probeCodes.filter((code) => code !== "-");
  const selectedCount = selectedCodes.length;
  if (selectedCount === 0) return "";

  const ptSuffix = requiresPtSuffix(chlorineRow, phRow, conductivityRow) ? ".PT" : "";
  return `M${selectedCount} ${selectedCodes.join("/")}${ptSuffix}`;
}

function resolvePortaSondasBaseLetter(probeCodes) {
  const [cloroCode, phCode, condCode] = probeCodes;
  const hasCloro = cloroCode !== "-";
  const hasPh = phCode !== "-";
  const hasCond = condCode !== "-";
  const selectedCount = [hasCloro, hasPh, hasCond].filter(Boolean).length;

  if (hasCloro) {
    if (selectedCount === 1) return "A";
    if (selectedCount === 2) return "B";
    if (selectedCount === 3) return "C";
  }

  if (hasPh && hasCond) return "D";
  if (hasPh || hasCond) return "F";
  return "";
}

function resolvePortaSondasCode(probeCodes, chlorineRow) {
  const baseLetter = resolvePortaSondasBaseLetter(probeCodes);
  if (!baseLetter) return "";

  return `${baseLetter}${resolvePortaSondasSuffix(chlorineRow)}`;
}

function isTruthyFlag(value) {
  return ["1", "true", "yes", "sim"].includes((value ?? "").toString().trim().toLowerCase());
}

function needsBDW(questionRows, circuito) {
  const circuitoRow = getOptionRow(questionRows, circuitoDef.id, circuito);
  return isTruthyFlag(circuitoRow?.bdw_enabled);
}

function hasSelectedModel(questionRows, modelOption) {
  return (
    Boolean(modelOption) &&
    !isTechnicalAbsenceSelection(questionRows.is2_modelo ?? [], modelOption)
  );
}

function getMandatoryAddOns(questionRows, modelOption) {
  return hasSelectedModel(questionRows, modelOption)
    ? questionRows[mandatoryAddOnsDef.id] ?? []
    : [];
}

function getPumpPhysicalRows(questionRows) {
  const pumpQuestionIds = questionDefs
    .map((question) => question.id)
    .filter((questionId) => questionId.startsWith("bomba_"));

  return Object.fromEntries(
    ["BDP", "BDC"].map((code) => {
      const rows = pumpQuestionIds.map((questionId) => {
        const row = getCodeRow(questionRows, questionId, code);
        if (!row?.phc) {
          throw new Error(`Missing physical pump PHC for ${questionId}/${code}`);
        }
        return row;
      });
      const phcs = new Set(rows.map((row) => row.phc));
      if (phcs.size !== 1) {
        throw new Error(`Inconsistent physical pump PHCs for ${code}`);
      }
      return [code, rows[0]];
    })
  );
}

function compositionKeyForConfiguration(
  questionRows,
  {
    modelRow,
    proportionalCount,
    constantCount,
    chlorineRow,
    phRow,
    conductivityRow,
    portaSondasCode,
    bdwEnabled
  }
) {
  const pumpRows = getPumpPhysicalRows(questionRows);
  const portaSondasRow = getCodeRow(questionRows, portaSondasDef.id, portaSondasCode);
  if (!portaSondasRow) {
    throw new Error(`Missing porta-sondas physical row for ${portaSondasCode}`);
  }

  return compositionKey(
    physicalComponentsForConfiguration({
      selectedModelRow: modelRow,
      selectedPumpRows: [
        ...Array(proportionalCount).fill(pumpRows.BDP),
        ...Array(constantCount).fill(pumpRows.BDC)
      ],
      selectedProbeRows: [chlorineRow, phRow, conductivityRow],
      portaSondasRow,
      bdwApplies: bdwEnabled,
      bdwRows: questionRows[bdwDef.id] ?? [],
      mandatoryAddonRows: getMandatoryAddOns(questionRows, modelRow.option)
    })
  );
}

function csvValue(value) {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function price(value) {
  return Number(value).toFixed(2);
}

function cartesian(rows) {
  return rows.reduce(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]]
  );
}

function buildCircuitVariants(questionRows) {
  return questionRows.circuito.filter((row) => !isTechnicalAbsenceRow(row)).flatMap((circuitoRow) => {
    const circuitClass = circuitoRow.circuit_class ?? "general";
    if (circuitClass !== "open_cooling") {
      return [{ circuitoRow, circuitClass, openCoolingWaterType: "" }];
    }

    return openCoolingWaterTypes.map((openCoolingWaterType) => ({
      circuitoRow,
      circuitClass,
      openCoolingWaterType
    }));
  });
}

function buildPumpCombinations(questionRows) {
  const pumpRows = questionRows.bomba_biocida_inorganico;
  const proportionalPump = pumpRows.find((row) => row.code === "BDP");
  const constantPump = pumpRows.find((row) => row.code === "BDC");
  const noPump = pumpRows.find((row) => row.code === "-");
  const combinations = [];

  for (let proportionalCount = 0; proportionalCount <= 4; proportionalCount += 1) {
    for (let constantCount = 0; constantCount <= 4 - proportionalCount; constantCount += 1) {
      const noPumpCount = 4 - proportionalCount - constantCount;
      const selectedPumpRows = [
        ...Array(proportionalCount).fill(proportionalPump),
        ...Array(constantCount).fill(constantPump),
        ...Array(noPumpCount).fill(noPump)
      ];
      const totalPrice =
        proportionalCount * proportionalPump.price + constantCount * constantPump.price;
      const pumpSegment = buildPumpSegment(selectedPumpRows);

      combinations.push({
        proportionalCount,
        constantCount,
        noPumpCount,
        optionSummary: `${proportionalCount} ${proportionalPump.option} + ${constantCount} ${constantPump.option} + ${noPumpCount} ${noPump.option}`,
        codeSummary: `${proportionalCount}BDP-${constantCount}BDC`,
        pumpSegment,
        totalPrice
      });
    }
  }

  return combinations;
}

function normalizeAssemblyCode(value) {
  return value.replace(/\s+/g, "").replace(/_+/g, "_");
}

function hasSelectedCode(codes) {
  return codes.some((code) => code !== "-");
}

function buildOutputRows(questionRows) {
  const modelRows = questionRows.is2_modelo.filter((row) => !isTechnicalAbsenceRow(row));
  const baseCombinations = cartesian([modelRows, buildPumpCombinations(questionRows)]);
  const circuitVariants = buildCircuitVariants(questionRows);
  const outputRows = [];

  for (const baseCombination of baseCombinations) {
    const [modelo, pumpCombination] = baseCombination;

    for (const { circuitoRow, circuitClass, openCoolingWaterType } of circuitVariants) {
      const circuito = circuitoRow.option;
      const probeLists = probeQuestionIds.map((questionId) =>
        getProbeRowsForCircuit(questionRows[questionId], questionId, circuitClass, openCoolingWaterType)
      );

      for (const [sondaCloro, sondaPh, sondaCondutividade] of cartesian(probeLists)) {
        const answers = {
          sonda_cloro: sondaCloro,
          sonda_ph: sondaPh,
          sonda_condutividade: sondaCondutividade
        };
        const probeCodes = probeQuestionIds.map((questionId) => {
          const option = answers[questionId]?.option ?? "";
          return (defaultAssemblyCode(questionRows, questionId, option) ?? "-").trim() || "-";
        });
        if (!hasSelectedCode(probeCodes)) {
          continue;
        }

        const sondaSegment = formatSondaSegment(
          probeCodes,
          sondaCloro,
          sondaPh,
          sondaCondutividade
        );
        const portaSondasCode = resolvePortaSondasCode(probeCodes, sondaCloro);
        const portaSondasPrice = getOptionPrice(questionRows, portaSondasDef.id, portaSondasCode);
        const bdwEnabled = needsBDW(questionRows, circuito);
        const bdwPrice = bdwEnabled ? getOptionPrice(questionRows, bdwDef.id, "BDW") : 0;
        const mandatoryAddOns = getMandatoryAddOns(questionRows, modelo.option);
        const mandatoryAddOnsPrice = mandatoryAddOns.reduce(
          (sum, row) => sum + (row.price ?? 0),
          0
        );
        const mandatoryAddOnsSummary = mandatoryAddOns.map((row) => row.option).join(" + ");
        const assemblyCode = normalizeAssemblyCode(
          [
            `MDC_iS.${defaultAssemblyCode(questionRows, "is2_modelo", modelo.option) || "-"}`,
            pumpCombination.pumpSegment,
            sondaSegment,
            portaSondasCode,
            bdwEnabled ? "BDW" : ""
          ]
            .filter(Boolean)
            .join("_")
        );
        const totalPrice =
          modelo.price +
          pumpCombination.totalPrice +
          sondaCloro.price +
          sondaPh.price +
          sondaCondutividade.price +
          portaSondasPrice +
          bdwPrice +
          mandatoryAddOnsPrice;
        const configurationKey = compositionKeyForConfiguration(questionRows, {
          modelRow: modelo,
          proportionalCount: pumpCombination.proportionalCount,
          constantCount: pumpCombination.constantCount,
          chlorineRow: sondaCloro,
          phRow: sondaPh,
          conductivityRow: sondaCondutividade,
          portaSondasCode,
          bdwEnabled
        });

        outputRows.push({
          assemblyCode,
          compositionKey: configurationKey,
          values: [
          "",
          modelo.option,
          defaultAssemblyCode(questionRows, "is2_modelo", modelo.option),
          price(modelo.price),
          mandatoryAddOnsSummary,
          price(mandatoryAddOnsPrice),
          pumpCombination.optionSummary,
          pumpCombination.codeSummary,
          pumpCombination.proportionalCount,
          pumpCombination.constantCount,
          pumpCombination.noPumpCount,
          pumpCombination.pumpSegment,
          price(pumpCombination.totalPrice),
          sondaCloro.option,
          defaultAssemblyCode(questionRows, "sonda_cloro", sondaCloro.option),
          price(sondaCloro.price),
          sondaPh.option,
          defaultAssemblyCode(questionRows, "sonda_ph", sondaPh.option),
          price(sondaPh.price),
          sondaCondutividade.option,
          defaultAssemblyCode(questionRows, "sonda_condutividade", sondaCondutividade.option),
          price(sondaCondutividade.price),
          circuito,
          openCoolingWaterType,
          bdwEnabled ? "1" : "0",
          portaSondasCode,
          price(portaSondasPrice),
          bdwEnabled ? "BDW" : "",
          price(bdwPrice),
          assemblyCode,
          price(totalPrice)
          ]
        });
      }
    }
  }

  return outputRows;
}

const headers = [
  "referencia_phc",
  "is2_modelo_reply",
  "is2_modelo_code",
  "is2_modelo_price",
  "mandatory_addons_reply",
  "mandatory_addons_price",
  "pump_combo_reply",
  "pump_combo_code",
  "pump_vms0706_count",
  "pump_vcl0706_count",
  "pump_sem_bombas_count",
  "pump_segment",
  "pump_total_price",
  "sonda_cloro_reply",
  "sonda_cloro_code",
  "sonda_cloro_price",
  "sonda_ph_reply",
  "sonda_ph_code",
  "sonda_ph_price",
  "sonda_condutividade_reply",
  "sonda_condutividade_code",
  "sonda_condutividade_price",
  "circuito_reply",
  "circuito_agua_tipo",
  "circuito_bdw_enabled",
  "porta_sondas_code",
  "porta_sondas_price",
  "bdw_code",
  "bdw_price",
  "assembly_code",
  "total_price"
];

function requiredOptionRow(questionRows, questionId, option, description) {
  const row = getOptionRow(questionRows, questionId, option);
  if (!row) {
    throw new Error(`Missing ${description} option in historical all_reply row: ${option}`);
  }
  return row;
}

function requiredCodeRow(questionRows, questionId, code, description) {
  const row = getCodeRow(questionRows, questionId, code);
  if (!row) {
    throw new Error(`Missing ${description} code in historical all_reply row: ${code}`);
  }
  return row;
}

function positiveIntegerValue(row, field) {
  const value = Number(row[field]);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid historical ${field}: ${row[field]}`);
  }
  return value;
}

function compositionKeyForHistoricalRow(questionRows, row) {
  const modelRow = requiredOptionRow(
    questionRows,
    "is2_modelo",
    row.is2_modelo_reply,
    "IS2 model"
  );
  const chlorineRow = requiredOptionRow(
    questionRows,
    "sonda_cloro",
    row.sonda_cloro_reply,
    "chlorine probe"
  );
  const phRow = requiredOptionRow(questionRows, "sonda_ph", row.sonda_ph_reply, "pH probe");
  const conductivityRow = requiredOptionRow(
    questionRows,
    "sonda_condutividade",
    row.sonda_condutividade_reply,
    "conductivity probe"
  );
  const portaSondasCode = requiredCodeRow(
    questionRows,
    "porta_sondas",
    row.porta_sondas_code,
    "porta-sondas"
  ).code;

  return compositionKeyForConfiguration(questionRows, {
    modelRow,
    proportionalCount: positiveIntegerValue(row, "pump_vms0706_count"),
    constantCount: positiveIntegerValue(row, "pump_vcl0706_count"),
    chlorineRow,
    phRow,
    conductivityRow,
    portaSondasCode,
    bdwEnabled: row.circuito_bdw_enabled === "1"
  });
}

function validateRegistryEntries(entries) {
  const referenceToComposition = new Map();
  const compositionToReference = new Map();

  entries.forEach((entry) => {
    const reference = entry.referencia_phc?.trim();
    const key = entry.composition_key?.trim();
    parsePhcReference(reference);
    if (!key) {
      throw new Error(`Registry entry ${reference} has an empty composition_key`);
    }
    if (referenceToComposition.has(reference)) {
      throw new Error(`Duplicate equipment PHC reference in registry: ${reference}`);
    }
    if (compositionToReference.has(key)) {
      throw new Error(`Duplicate composition_key in registry: ${key}`);
    }
    referenceToComposition.set(reference, key);
    compositionToReference.set(key, reference);
  });

  return {
    entries: [...referenceToComposition.entries()]
      .map(([referencia_phc, composition_key]) => ({ referencia_phc, composition_key }))
      .sort((first, second) => parsePhcReference(first.referencia_phc) - parsePhcReference(second.referencia_phc)),
    referenceToComposition,
    compositionToReference
  };
}

function parseRegistry(text) {
  const { headers: registryHeaders, rows } = parseCsvRecords(text);
  if (
    registryHeaders.length !== 2 ||
    registryHeaders[0] !== "referencia_phc" ||
    registryHeaders[1] !== "composition_key"
  ) {
    throw new Error("Invalid selector PHC registry header; expected referencia_phc,composition_key");
  }
  return validateRegistryEntries(rows);
}

function serializeRegistry(entries) {
  return [
    ["referencia_phc", "composition_key"],
    ...entries.map((entry) => [entry.referencia_phc, entry.composition_key])
  ]
    .map((row) => row.map(csvValue).join(","))
    .join("\n")
    .concat("\n");
}

function bootstrapHistoricalRegistry(questionRows, historicalRows) {
  if (historicalRows.length !== historicalRowCount) {
    throw new Error(
      `Selector PHC registry is missing and all_reply is not the ${historicalRowCount}-row historical baseline`
    );
  }

  const entries = historicalRows.map((row) => ({
    referencia_phc: row.referencia_phc,
    composition_key: compositionKeyForHistoricalRow(questionRows, row)
  }));
  const registry = validateRegistryEntries(entries);

  if (registry.referenceToComposition.size !== historicalRowCount) {
    throw new Error("Historical all_reply does not contain 5,940 unique equipment PHC references");
  }
  if (registry.compositionToReference.size !== historicalRowCount) {
    throw new Error("Historical all_reply does not contain 5,940 unique physical compositions");
  }
  const highestReference = Math.max(
    ...registry.entries.map((entry) => parsePhcReference(entry.referencia_phc))
  );
  if (highestReference !== historicalHighestReference) {
    throw new Error(
      `Historical all_reply highest equipment PHC must be ${phcReferenceForNumber(historicalHighestReference)}`
    );
  }

  return registry;
}

async function loadOrBootstrapRegistry(questionRows, file, historicalOutputFile) {
  try {
    return { registry: parseRegistry(await fs.readFile(file, "utf8")), bootstrapped: false };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const { rows: historicalRows } = parseCsvRecords(await fs.readFile(historicalOutputFile, "utf8"));
  return { registry: bootstrapHistoricalRegistry(questionRows, historicalRows), bootstrapped: true };
}

function appendMissingCompositionMappings(registry, configurationRows) {
  const missingKeys = [...new Set(configurationRows.map((row) => row.compositionKey))]
    .filter((key) => !registry.compositionToReference.has(key))
    .sort();
  const highestReference = Math.max(
    0,
    ...registry.entries.map((entry) => parsePhcReference(entry.referencia_phc))
  );

  const appendedEntries = missingKeys.map((composition_key, index) => ({
    referencia_phc: phcReferenceForNumber(highestReference + index + 1),
    composition_key
  }));
  const entries = [...registry.entries, ...appendedEntries];

  return {
    registry: validateRegistryEntries(entries),
    appendedEntries
  };
}

export async function generateCombinations({ projectRoot = rootDir } = {}) {
  const projectQuestionsDir = path.join(projectRoot, "public", "questions");
  const projectOutputFile = path.join(projectRoot, "all_reply_combinations_filtered.csv");
  const projectRegistryFile = path.join(projectRoot, "public", "selector_phc_registry.csv");
  const questionRows = await loadRows(projectQuestionsDir);
  const configurationRows = buildOutputRows(questionRows);
  const { registry: initialRegistry, bootstrapped } = await loadOrBootstrapRegistry(
    questionRows,
    projectRegistryFile,
    projectOutputFile
  );
  const retainedMappings = initialRegistry.entries.length;
  const { registry, appendedEntries } = appendMissingCompositionMappings(
    initialRegistry,
    configurationRows
  );

  const csv = [headers, ...configurationRows.map((row) => {
    const reference = registry.compositionToReference.get(row.compositionKey);
    if (!reference) {
      throw new Error(`Missing equipment PHC for composition: ${row.compositionKey}`);
    }
    return [reference, ...row.values.slice(1)];
  })]
    .map((row) => row.map(csvValue).join(","))
    .join("\n")
    .concat("\n");

  await fs.writeFile(projectRegistryFile, serializeRegistry(registry.entries), "utf8");
  await fs.writeFile(projectOutputFile, csv, "utf8");

  const uniqueAssemblyCodes = new Set(configurationRows.map((row) => row.assemblyCode)).size;
  const uniqueCompositionKeys = new Set(configurationRows.map((row) => row.compositionKey)).size;
  const highestReference = registry.entries.at(-1)?.referencia_phc ?? "";
  const stats = {
    bootstrapped,
    historicalRows: bootstrapped ? historicalRowCount : 0,
    historicalMappings: bootstrapped ? retainedMappings : 0,
    retainedMappings,
    appendedMappings: appendedEntries.length,
    rawConfigurations: configurationRows.length,
    uniqueAssemblyCodes,
    uniqueCompositionKeys,
    registryMappings: registry.entries.length,
    highestReference,
    outputRows: configurationRows.length
  };

  console.log(`Historical rows read: ${stats.historicalRows}`);
  console.log(`Historical unique PHCs: ${stats.historicalMappings}`);
  console.log(`Historical unique composition keys: ${stats.historicalMappings}`);
  console.log(`Raw valid configurations: ${stats.rawConfigurations}`);
  console.log(`Unique MDC codelines: ${stats.uniqueAssemblyCodes}`);
  console.log(`Unique physical compositions: ${stats.uniqueCompositionKeys}`);
  console.log(`Existing registry mappings retained: ${stats.retainedMappings}`);
  console.log(`New registry mappings appended: ${stats.appendedMappings}`);
  console.log(`Highest equipment PHC: ${stats.highestReference}`);
  console.log(`Generated ${path.relative(projectRoot, projectOutputFile)} with ${stats.outputRows} combinations.`);

  return stats;
}

const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
  await generateCombinations();
}
