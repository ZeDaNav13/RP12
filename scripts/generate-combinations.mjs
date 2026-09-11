import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isChlorineRowCompatible, OPEN_COOLING_WATER_TYPES } from "../src/domain/compatibility.js";
import { isTechnicalAbsenceRow, isTechnicalAbsenceSelection } from "../src/domain/options.js";
import { resolveIs2ModelCode } from "../src/domain/mdc.js";
import { requiresPtSuffix, resolvePortaSondasSuffix } from "../src/domain/probes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const questionsDir = path.join(rootDir, "public", "questions");
const outputFile = path.join(rootDir, "all_reply_combinations_filtered.csv");

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
const phcReferenceStart = 1n;
const phcReferenceWidth = 11;

function phcReferenceForIndex(index) {
  const number = phcReferenceStart + BigInt(index);
  return `${phcReferencePrefix}${String(number).padStart(phcReferenceWidth, "0")}`;
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

async function loadRows() {
  const defs = [...questionDefs, circuitoDef, portaSondasDef, bdwDef, mandatoryAddOnsDef];
  const entries = await Promise.all(
    defs.map(async (def) => {
      const csv = await fs.readFile(path.join(questionsDir, def.csvFile), "utf8");
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

function getOptionPrice(questionRows, questionId, option) {
  return getOptionRow(questionRows, questionId, option)?.price ?? 0;
}

function defaultAssemblyCode(questionRows, questionId, option) {
  if (questionId === "is2_modelo") {
    return resolveIs2ModelCode(questionRows.is2_modelo ?? [], option);
  }
  return getOptionRow(questionRows, questionId, option)?.code ?? "";
}

function formatPumpCounts(pumpCodes) {
  const orderedCounts = [];
  pumpCodes.forEach((code) => {
    const existing = orderedCounts.find((item) => item.code === code);
    if (existing) {
      existing.count += 1;
    } else {
      orderedCounts.push({ code, count: 1 });
    }
  });

  const priority = { BDP: 0, BDC: 1 };
  orderedCounts.sort((a, b) => {
    const pa = priority[a.code] ?? 99;
    const pb = priority[b.code] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.code.localeCompare(b.code);
  });

  return orderedCounts.map((item) => `${item.count}${item.code}`).join("+");
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
      const pumpCodes = [
        ...Array(proportionalCount).fill(proportionalPump.code),
        ...Array(constantCount).fill(constantPump.code)
      ];
      const totalPrice =
        proportionalCount * proportionalPump.price + constantCount * constantPump.price;
      const pumpSegment = pumpCodes.length > 0 ? `D${formatPumpCounts(pumpCodes)}` : "_";

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
  const seenAssemblyCodes = new Set();

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
        if (seenAssemblyCodes.has(assemblyCode)) {
          continue;
        }
        seenAssemblyCodes.add(assemblyCode);

        const totalPrice =
          modelo.price +
          pumpCombination.totalPrice +
          sondaCloro.price +
          sondaPh.price +
          sondaCondutividade.price +
          portaSondasPrice +
          bdwPrice +
          mandatoryAddOnsPrice;

        outputRows.push([
          phcReferenceForIndex(outputRows.length),
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
        ]);
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

const questionRows = await loadRows();
const rows = buildOutputRows(questionRows);
const csv = [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n") + "\n";
await fs.writeFile(outputFile, csv, "utf8");

console.log(`Generated ${path.relative(rootDir, outputFile)} with ${rows.length} combinations.`);
