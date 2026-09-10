import { useEffect, useMemo, useState } from "react";
import releaseVersion from "../release-version.json";
import logo from "./assets/Logo_iS2-removebg-preview.png";
import printLogo from "./assets/iS2 Logo Fundo Branco.png";
import { resolveIs2ModelCode } from "./domain/mdc.js";
import {
  isTechnicalAbsenceRow,
  isTechnicalAbsenceSelection,
  sortTechnicalAbsenceLast
} from "./domain/options.js";

const QUESTION_DEFS = [
  {
    id: "is2_modelo",
    detailLabel: "IS₂",
    label: "IS2",
    csvFile: "is2_modelo.csv"
  },
  {
    id: "bomba_biocida_inorganico",
    detailLabel: "Biocida Inorgânico",
    label: "Biocida Inorgânico",
    csvFile: "bomba_biocida_inorganico.csv"
  },
  {
    id: "bomba_biocida_organico",
    detailLabel: "Biocida Orgânico",
    label: "Biocida Orgânico",
    csvFile: "bomba_biocida_organico.csv"
  },
  {
    id: "bomba_controlo_ph",
    detailLabel: "Controlo de pH",
    label: "Controlo de pH",
    csvFile: "bomba_controlo_ph.csv"
  },
  {
    id: "bomba_inibidor",
    detailLabel: "Inibidor",
    label: "Inibidor",
    csvFile: "bomba_inibidor.csv"
  },
  {
    id: "sonda_cloro",
    detailLabel: "Cloro",
    label: "Cloro",
    csvFile: "sonda_cloro.csv"
  },
  {
    id: "sonda_ph",
    detailLabel: "pH",
    label: "pH",
    csvFile: "sonda_ph.csv"
  },
  {
    id: "sonda_condutividade",
    detailLabel: "Condutividade",
    label: "Condutividade",
    csvFile: "sonda_condutividade.csv"
  }
];

const CIRCUITO_DEF = {
  id: "circuito",
  csvFile: "circuito.csv"
};

const PORTA_SONDAS_DEF = {
  id: "porta_sondas",
  csvFile: "porta_sondas.csv"
};

const BDW_DEF = {
  id: "bdw",
  csvFile: "bdw.csv"
};

const MANDATORY_ADDONS_DEF = {
  id: "mandatory_addons",
  csvFile: "mandatory_addons.csv"
};

const DEFAULT_STYLEGUIDE = {
  main_dark: "#292929",
  secondary_dark: "#777777",
  secondary_white: "#D1D1D1",
  off_white: "#F0EEE9",
  main_white: "#FFFFFF",
  text: "#292929",
  print_text: "#111111",
  print_line: "#DDDDDD",
  print_bg: "#FFFFFF"
};

const pumpQuestionIds = [
  "bomba_biocida_inorganico",
  "bomba_biocida_organico",
  "bomba_controlo_ph",
  "bomba_inibidor"
];

const probeQuestionIds = ["sonda_cloro", "sonda_ph", "sonda_condutividade"];
const OPEN_COOLING_CIRCUIT = "Circuito Aberto de Arrefecimento";
const SANITARY_HOT_WATER_CIRCUIT = "Água Quente Sanitária";
const openCoolingWaterTypes = ["Água Limpa", "Água Suja"];
const PHC_REFERENCE_PREFIX = "534.iS2";
const PHC_REFERENCE_START = 1n;
const PHC_REFERENCE_WIDTH = 11;
const EMPTY_OPTION = "";
const APP_VERSION = releaseVersion.version;

function phcReferenceForIndex(index) {
  const number = PHC_REFERENCE_START + BigInt(index);
  return `${PHC_REFERENCE_PREFIX}${String(number).padStart(PHC_REFERENCE_WIDTH, "0")}`;
}

function keyFor(questionId, option) {
  return `${questionId}:${option}`;
}

function buildEmptyAnswers() {
  return Object.fromEntries(QUESTION_DEFS.map((question) => [question.id, EMPTY_OPTION]));
}

function isProbeOptionVisibleForCircuit(circuito, openCoolingWaterType, row) {
  if (isTechnicalAbsenceRow(row)) return true;
  const option = row.option;
  if (circuito === OPEN_COOLING_CIRCUIT) {
    return openCoolingWaterType === "Água Suja" ? /\bAS2\b/i.test(option) : /\bCS4\b/i.test(option);
  }
  if (circuito === SANITARY_HOT_WATER_CIRCUIT) return /\bAS3\b/i.test(option);
  return /\bCS4\b/i.test(option);
}

function getProbeRowsForCircuit(rows, questionId, circuito, openCoolingWaterType) {
  if (questionId !== "sonda_cloro") return rows;
  return rows.filter((row) =>
    isProbeOptionVisibleForCircuit(circuito, openCoolingWaterType, row)
  );
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

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

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

function getOptionRow(questionRows, questionId, option) {
  if (!option) return null;
  return (questionRows[questionId] ?? []).find((row) => row.option === option) ?? null;
}

function getOptionPrice(questionRows, questionId, option) {
  return getOptionRow(questionRows, questionId, option)?.price ?? 0;
}

function getDisplayQuestionRows(questionRows, questionId) {
  return sortTechnicalAbsenceLast(questionRows[questionId] ?? []);
}

function isQuestionSelectionAbsent(questionRows, questionId, selectedOption) {
  return isTechnicalAbsenceSelection(questionRows[questionId] ?? [], selectedOption);
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

function formatSondaSegment(probeCodes, cloroSelection) {
  const selectedCodes = probeCodes.filter((code) => code !== "-");
  const selectedCount = selectedCodes.length;
  if (selectedCount === 0) return "";

  const ptCloroOptions = new Set([
    "Cloro 0-2 Reiss CS4 m0c",
    "Cloro 0-20 Reiss CS4 m0c",
    "Cloro Reiss AS3 m0c 0-2/0-0.7 c/RV1",
    "Cloro Reiss AS3 m0c 0-20/0-7 c/RV1",
    "Cloro Reiss AS2 m0c 0-2/0-0.7 c/RV1",
    "Cloro Reiss AS2 m0c 0-20/0-7 c/RV1"
  ]);

  const hasPhOrCond = probeCodes[1] !== "-" || probeCodes[2] !== "-";
  const hasPtCloro = ptCloroOptions.has((cloroSelection ?? "").trim());
  const ptSuffix = hasPhOrCond || hasPtCloro ? ".PT" : "";
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

function resolvePortaSondasCode(probeCodes, cloroSelection) {
  const baseLetter = resolvePortaSondasBaseLetter(probeCodes);
  if (!baseLetter) return "";

  const qSuffixCloroOptions = new Set([
    "Cloro Reiss AS3 mA 0-5/0-1.7 c/RV1",
    "Cloro Reiss AS3 mA 0-20/0-7 c/RV1",
    "Cloro Reiss AS3 m0c 0-2/0-0.7 c/RV1",
    "Cloro Reiss AS3 m0c 0-20/0-7 c/RV1"
  ]);

  const suffix = qSuffixCloroOptions.has((cloroSelection ?? "").trim()) ? "Q" : "F";
  return `${baseLetter}${suffix}`;
}

function isTruthyFlag(value) {
  return ["1", "true", "yes", "sim"].includes((value ?? "").toString().trim().toLowerCase());
}

function needsBDW(questionRows, circuito) {
  const circuitoRow = getOptionRow(questionRows, CIRCUITO_DEF.id, circuito);
  return isTruthyFlag(circuitoRow?.bdw_enabled);
}

function hasSelectedModel(questionRows, modelOption) {
  return Boolean(modelOption) && !isQuestionSelectionAbsent(questionRows, "is2_modelo", modelOption);
}

function getMandatoryAddOns(questionRows, modelOption) {
  return hasSelectedModel(questionRows, modelOption)
    ? questionRows[MANDATORY_ADDONS_DEF.id] ?? []
    : [];
}

function buildDetailRow(id, question, selection, code, price) {
  return {
    id,
    question,
    selection,
    code,
    price
  };
}

function buildCircuitVariants(questionRows) {
  return (questionRows[CIRCUITO_DEF.id] ?? [])
    .filter((row) => !isTechnicalAbsenceRow(row))
    .flatMap((circuitoRow) => {
      if (circuitoRow.option !== OPEN_COOLING_CIRCUIT) {
        return [{ circuito: circuitoRow.option, openCoolingWaterType: "" }];
      }

      return openCoolingWaterTypes.map((type) => ({
        circuito: circuitoRow.option,
        openCoolingWaterType: type
      }));
    });
}

function hasSelectedCode(codes) {
  return codes.some((code) => code !== "-");
}

function getSelectedCodes(questionRows, questionIds, answers) {
  return questionIds.map((questionId) => {
    const option = answers[questionId] ?? "";
    return (defaultAssemblyCode(questionRows, questionId, option) ?? "-").trim() || "-";
  });
}

function cartesian(rows) {
  return rows.reduce(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]]
  );
}

function buildPumpCombinations(questionRows) {
  const pumpRows = questionRows.bomba_biocida_inorganico ?? [];
  const proportionalPump = pumpRows.find((row) => row.code === "BDP");
  const constantPump = pumpRows.find((row) => row.code === "BDC");
  if (!proportionalPump || !constantPump) return [];

  const combinations = [];
  for (let proportionalCount = 0; proportionalCount <= 4; proportionalCount += 1) {
    for (let constantCount = 0; constantCount <= 4 - proportionalCount; constantCount += 1) {
      const pumpCodes = [
        ...Array(proportionalCount).fill(proportionalPump.code),
        ...Array(constantCount).fill(constantPump.code)
      ];
      combinations.push({
        proportionalCount,
        constantCount,
        pumpSegment: pumpCodes.length > 0 ? `D${formatPumpCounts(pumpCodes)}` : "_"
      });
    }
  }
  return combinations;
}

function normalizeAssemblyCode(value) {
  return value.replace(/\s+/g, "").replace(/_+/g, "_");
}

function buildAssemblyCode(questionRows, modelOption, pumpSegment, probeCodes, cloroOption, circuito) {
  const sondaSegment = formatSondaSegment(probeCodes, cloroOption);
  const portaSondasCode = resolvePortaSondasCode(probeCodes, cloroOption);
  const bdwSegment = needsBDW(questionRows, circuito) ? "BDW" : "";

  return normalizeAssemblyCode(
    [
      `MDC_iS.${defaultAssemblyCode(questionRows, "is2_modelo", modelOption) || "-"}`,
      pumpSegment,
      sondaSegment,
      portaSondasCode,
      bdwSegment
    ]
      .filter(Boolean)
      .join("_")
  );
}

function buildUniqueAssemblyCodes(questionRows) {
  const modelRows = (questionRows.is2_modelo ?? []).filter((row) => !isTechnicalAbsenceRow(row));
  const pumpCombinations = buildPumpCombinations(questionRows);
  const circuitVariants = buildCircuitVariants(questionRows);
  const assemblyCodes = [];
  const seen = new Set();

  for (const modelRow of modelRows) {
    for (const pumpCombination of pumpCombinations) {
      for (const { circuito, openCoolingWaterType } of circuitVariants) {
        const probeLists = probeQuestionIds.map((questionId) =>
          getProbeRowsForCircuit(
            questionRows[questionId] ?? [],
            questionId,
            circuito,
            openCoolingWaterType
          )
        );

        for (const [sondaCloro, sondaPh, sondaCondutividade] of cartesian(probeLists)) {
          const probeCodes = [sondaCloro, sondaPh, sondaCondutividade].map(
            (row) => (row.code ?? "-").trim() || "-"
          );
          if (!hasSelectedCode(probeCodes)) continue;

          const assemblyCode = buildAssemblyCode(
            questionRows,
            modelRow.option,
            pumpCombination.pumpSegment,
            probeCodes,
            sondaCloro.option,
            circuito
          );
          if (seen.has(assemblyCode)) continue;

          seen.add(assemblyCode);
          assemblyCodes.push(assemblyCode);
        }
      }
    }
  }

  return assemblyCodes;
}

function getPhcReference(assemblyCodes, assemblyCode, canGeneratePrice, hasModel, hasCircuito) {
  if (!canGeneratePrice || !hasModel || !hasCircuito) return "-";
  const index = assemblyCodes.indexOf(assemblyCode);
  return index < 0 ? "-" : phcReferenceForIndex(index);
}

function money(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(value);
}

function applyStyleguide(rawStyleguide) {
  const styleguide = {
    ...DEFAULT_STYLEGUIDE,
    ...(rawStyleguide ?? {})
  };

  const root = document.documentElement;
  root.style.setProperty("--main-blue", styleguide.main_dark);
  root.style.setProperty("--secondary-dark", styleguide.secondary_dark);
  root.style.setProperty("--secondary-white", styleguide.secondary_white);
  root.style.setProperty("--white", styleguide.off_white);
  root.style.setProperty("--main-white", styleguide.main_white);
  root.style.setProperty("--text-color", styleguide.text);
  root.style.setProperty("--print-text", styleguide.print_text);
  root.style.setProperty("--print-line", styleguide.print_line);
  root.style.setProperty("--print-bg", styleguide.print_bg);

  const encodedArrowColor = styleguide.secondary_dark.replace("#", "%23");
  const arrowSvg = `url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='${encodedArrowColor}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")`;
  root.style.setProperty("--select-arrow-icon", arrowSvg);
}

export default function App() {
  const [questionRows, setQuestionRows] = useState({});
  const [answers, setAnswers] = useState(buildEmptyAnswers);
  const [circuito, setCircuito] = useState("");
  const [openCoolingWaterType, setOpenCoolingWaterType] = useState(openCoolingWaterTypes[0]);
  const [showPrice, setShowPrice] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [loadError, setLoadError] = useState("");

  const question1 = QUESTION_DEFS.slice(0, 1);
  const questions2to5 = QUESTION_DEFS.slice(1, 5);
  const questions6to8 = QUESTION_DEFS.slice(5, 8);

  useEffect(() => {
    let cancelled = false;

    async function loadStyleguide() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}styleguide.json`, {
          cache: "no-store"
        });
        if (!response.ok) {
          applyStyleguide(DEFAULT_STYLEGUIDE);
          return;
        }
        const loadedStyleguide = await response.json();
        if (!cancelled) {
          applyStyleguide(loadedStyleguide);
        }
      } catch {
        if (!cancelled) {
          applyStyleguide(DEFAULT_STYLEGUIDE);
        }
      }
    }

    loadStyleguide();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestionData() {
      try {
        const defs = [...QUESTION_DEFS, CIRCUITO_DEF, PORTA_SONDAS_DEF, BDW_DEF, MANDATORY_ADDONS_DEF];
        const loaded = await Promise.all(
          defs.map(async (def) => {
            const response = await fetch(`${import.meta.env.BASE_URL}questions/${def.csvFile}`, {
              cache: "no-store"
            });
            if (!response.ok) {
              throw new Error(`Failed to load ${def.csvFile}`);
            }
            const csvText = await response.text();
            return [def.id, parseCsv(csvText)];
          })
        );

        if (!cancelled) {
          setQuestionRows(Object.fromEntries(loaded));
          setLoadError("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError("Erro ao carregar CSVs das perguntas.");
        }
      }
    }

    loadQuestionData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Object.keys(questionRows).length === 0) return;

    setAnswers((prev) => {
      const next = buildEmptyAnswers();
      QUESTION_DEFS.forEach((q) => {
        const options = (questionRows[q.id] ?? []).map((row) => row.option);
        if (prev[q.id] && options.includes(prev[q.id])) {
          next[q.id] = prev[q.id];
        }
      });
      return next;
    });

    setCircuito((prev) => {
      const options = (questionRows[CIRCUITO_DEF.id] ?? []).map((row) => row.option);
      return prev && options.includes(prev) ? prev : "";
    });
  }, [questionRows]);

  useEffect(() => {
    if (Object.keys(questionRows).length === 0) return;

    setAnswers((prev) => {
      const next = { ...prev };
      let changed = false;

      probeQuestionIds.forEach((questionId) => {
        const visibleRows = getProbeRowsForCircuit(
          questionRows[questionId] ?? [],
          questionId,
          circuito,
          openCoolingWaterType
        );
        const visibleOptions = visibleRows.map((row) => row.option);
        const selected = prev[questionId] ?? "";

        if (selected && !visibleOptions.includes(selected)) {
          next[questionId] = EMPTY_OPTION;
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [circuito, openCoolingWaterType, questionRows]);

  const total = useMemo(() => {
    const baseTotal = QUESTION_DEFS.reduce((sum, q) => {
      const selected = answers[q.id];
      return sum + getOptionPrice(questionRows, q.id, selected);
    }, 0);

    const probeCodes = probeQuestionIds.map((questionId) => {
      const option = answers[questionId] ?? "";
      return (defaultAssemblyCode(questionRows, questionId, option) ?? "-").trim() || "-";
    });

    const portaSondasCode = resolvePortaSondasCode(probeCodes, answers.sonda_cloro);
    const portaSondasTotal = getOptionPrice(questionRows, PORTA_SONDAS_DEF.id, portaSondasCode);
    const bdwTotal = needsBDW(questionRows, circuito)
      ? getOptionPrice(questionRows, BDW_DEF.id, "BDW")
      : 0;
    const mandatoryAddOnsTotal = getMandatoryAddOns(questionRows, answers.is2_modelo).reduce(
      (sum, row) => sum + (row.price ?? 0),
      0
    );
    return baseTotal + portaSondasTotal + bdwTotal + mandatoryAddOnsTotal;
  }, [answers, circuito, questionRows]);

  const pumpCodes = useMemo(
    () => getSelectedCodes(questionRows, pumpQuestionIds, answers),
    [answers, questionRows]
  );

  const probeCodes = useMemo(
    () => getSelectedCodes(questionRows, probeQuestionIds, answers),
    [answers, questionRows]
  );

  const hasProbes = hasSelectedCode(probeCodes);
  const canGeneratePrice = hasProbes;
  const priceText = canGeneratePrice && showPrice ? money(total) : "---";
  const currentPumpSegment =
    pumpCodes.filter((code) => code !== "-").length > 0
      ? `D${formatPumpCounts(pumpCodes.filter((code) => code !== "-"))}`
      : "_";

  const detailedRows = useMemo(() => {
    const baseRows = QUESTION_DEFS.map((q) => {
      const selection = answers[q.id] ?? "";
      const code = defaultAssemblyCode(questionRows, q.id, selection) || "-";
      const price = selection ? getOptionPrice(questionRows, q.id, selection) : 0;
      return buildDetailRow(q.id, q.detailLabel ?? q.id, selection, code, price);
    });

    const rows = [...baseRows];

    const probeCodes = probeQuestionIds.map((questionId) => {
      const option = answers[questionId] ?? "";
      return (defaultAssemblyCode(questionRows, questionId, option) ?? "-").trim() || "-";
    });

    const portaSondasCode = resolvePortaSondasCode(probeCodes, answers.sonda_cloro);
    if (portaSondasCode) {
      rows.push(
        buildDetailRow(
          "porta-sondas",
          "Porta-Sondas",
          "Automático",
          portaSondasCode,
          getOptionPrice(questionRows, PORTA_SONDAS_DEF.id, portaSondasCode)
        )
      );
    }

    if (needsBDW(questionRows, circuito)) {
      const circuitoSelection =
        circuito === OPEN_COOLING_CIRCUIT ? `${circuito} - ${openCoolingWaterType}` : circuito;

      rows.push(
        buildDetailRow(
          "bdw",
          "Circuito",
          circuitoSelection,
          "BDW",
          getOptionPrice(questionRows, BDW_DEF.id, "BDW")
        )
      );
    }

    getMandatoryAddOns(questionRows, answers.is2_modelo).forEach((row, index) => {
      rows.push(
        buildDetailRow(
          `mandatory-addon-${index}`,
          "Acessório obrigatório",
          row.option,
          row.code?.trim() || "-",
          row.price ?? 0
        )
      );
    });

    return rows;
  }, [answers, circuito, openCoolingWaterType, questionRows]);

  const detailedRowsWithValue = detailedRows.filter(
    (row) => row.selection && !isTechnicalAbsenceRow(row)
  );

  const printedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date()),
    []
  );

  const assemblyLine = useMemo(
    () => {
      if (!answers.is2_modelo) return "-";

      return buildAssemblyCode(
        questionRows,
        answers.is2_modelo ?? "",
        currentPumpSegment,
        probeCodes,
        answers.sonda_cloro,
        circuito
      );
    },
    [answers.is2_modelo, answers.sonda_cloro, circuito, currentPumpSegment, probeCodes, questionRows]
  );

  const uniqueAssemblyCodes = useMemo(
    () => buildUniqueAssemblyCodes(questionRows),
    [questionRows]
  );

  const phcReference = useMemo(
    () =>
      getPhcReference(
        uniqueAssemblyCodes,
        assemblyLine,
        canGeneratePrice,
        !isQuestionSelectionAbsent(questionRows, "is2_modelo", answers.is2_modelo),
        Boolean(circuito)
      ),
    [answers.is2_modelo, assemblyLine, canGeneratePrice, circuito, uniqueAssemblyCodes]
  );

  const is2Description = useMemo(() => {
    const selected = answers.is2_modelo;
    return getOptionRow(questionRows, "is2_modelo", selected)?.description ?? "";
  }, [answers.is2_modelo, questionRows]);

  const circuitoDescription = useMemo(
    () => getOptionRow(questionRows, CIRCUITO_DEF.id, circuito)?.description ?? "",
    [circuito, questionRows]
  );

  const showOpenCoolingWaterType = circuito === OPEN_COOLING_CIRCUIT;

  const circuitoOptions = useMemo(
    () => getDisplayQuestionRows(questionRows, CIRCUITO_DEF.id).map((row) => row.option),
    [questionRows]
  );

  const visibleProbeRowsByQuestion = useMemo(
    () =>
      Object.fromEntries(
        probeQuestionIds.map((questionId) => [
          questionId,
          sortTechnicalAbsenceLast(
            getProbeRowsForCircuit(
              questionRows[questionId] ?? [],
              questionId,
              circuito,
              openCoolingWaterType
            )
          )
        ])
      ),
    [circuito, openCoolingWaterType, questionRows]
  );

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Copiado");
      window.setTimeout(() => setCopyMsg(""), 1400);
    } catch {
      setCopyMsg("Falhou a cópia");
      window.setTimeout(() => setCopyMsg(""), 1800);
    }
  };

  const printBudget = () => {
    window.print();
  };

  const handleModelChange = (nextModel) => {
    setAnswers(() => ({
      ...buildEmptyAnswers(),
      is2_modelo: nextModel
    }));
    setCircuito("");
    setOpenCoolingWaterType(openCoolingWaterTypes[0]);
    setShowPrice(false);
  };

  const handleCircuitoChange = (nextCircuito) => {
    setCircuito(nextCircuito);
    setAnswers((prev) => ({
      ...prev,
      ...Object.fromEntries([...pumpQuestionIds, ...probeQuestionIds].map((id) => [id, EMPTY_OPTION]))
    }));
    setOpenCoolingWaterType(openCoolingWaterTypes[0]);
    setShowPrice(false);
  };

  const handleQuestionChange = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value
    }));
    setShowPrice(false);
  };

  const handleOpenCoolingWaterTypeChange = (nextType) => {
    setOpenCoolingWaterType(nextType);
    setAnswers((prev) => ({
      ...prev,
      ...Object.fromEntries([...pumpQuestionIds, ...probeQuestionIds].map((id) => [id, EMPTY_OPTION]))
    }));
    setShowPrice(false);
  };

  return (
    <main className="page">
      <div className="screenOnly">
        <section className="card headerCard">
          <div className="headerRow">
            <div>
              <h1>Selecionador do modelo de MDC</h1>
            </div>
            <img className="headerLogo" src={logo} alt="Logo" />
          </div>
        </section>

        <div className="cardsRow">
          <section className="card questionCard">
            <h2>Modelo</h2>
            <div className="grid">
              {question1.map((q) => (
                <label key={q.id} className="wide">
                  <span className="is2Label">
                    IS<sub>2</sub>
                  </span>
                  <select
                    value={answers[q.id] ?? ""}
                    onChange={(e) => handleModelChange(e.target.value)}
                  >
                    <option value="" hidden />
                    {getDisplayQuestionRows(questionRows, q.id).map((row) => (
                      <option key={row.option} value={row.option}>
                        {row.option}
                      </option>
                    ))}
                  </select>

                  {is2Description ? <p className="muted">{is2Description}</p> : null}

                  <div className="wide circuitoField">
                    <span className="fieldLabel">Circuito</span>
                    <select value={circuito} onChange={(e) => handleCircuitoChange(e.target.value)}>
                      <option value="" hidden />
                      {circuitoOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {circuitoDescription ? <p className="muted">{circuitoDescription}</p> : null}
                    {showOpenCoolingWaterType ? (
                      <div
                        className="segmentedControl"
                        role="radiogroup"
                        aria-label="Tipo de água"
                      >
                        {openCoolingWaterTypes.map((type) => (
                          <button
                            key={type}
                            type="button"
                            className={type === openCoolingWaterType ? "active" : ""}
                            role="radio"
                            aria-checked={type === openCoolingWaterType}
                            onClick={() => handleOpenCoolingWaterTypeChange(type)}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className="card questionCard">
            <h2>Bombas</h2>
            <div className="grid">
              {questions2to5.map((q) => (
                <label key={q.id} className="wide">
                  <span className="fieldLabel">{q.label}</span>
                  <select
                    value={answers[q.id] ?? ""}
                    onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                  >
                    <option value="" hidden />
                    {getDisplayQuestionRows(questionRows, q.id).map((row) => (
                      <option key={row.option} value={row.option}>
                        {row.option}
                      </option>
                    ))}
                  </select>
                  {getOptionRow(questionRows, q.id, answers[q.id])?.description ? (
                    <p className="muted">
                      {getOptionRow(questionRows, q.id, answers[q.id])?.description}
                    </p>
                  ) : null}
                </label>
              ))}
            </div>
          </section>

          <section className="card questionCard">
            <h2>Sondas</h2>
            <div className="grid">
              {questions6to8.map((q) => (
                <label key={q.id} className="wide">
                  <span className="fieldLabel">{q.label}</span>
                  <select
                    value={answers[q.id] ?? ""}
                    onChange={(e) => handleQuestionChange(q.id, e.target.value)}
                  >
                    <option value="" hidden />
                    {(visibleProbeRowsByQuestion[q.id] ?? []).map((row) => (
                      <option key={row.option} value={row.option}>
                        {row.option}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </section>
        </div>

        <section className="card">
          <h2>Resumo</h2>
          <div className="summaryList">
            <div className="summaryRow">
              <span className="summaryLabel">Valor estimado</span>
              <div className="summaryValueWrap">
                <strong className="summaryValue">{priceText}</strong>
                {showPrice && canGeneratePrice ? (
                  <button
                    className="copyIconButton"
                    onClick={() => copyToClipboard(priceText)}
                    aria-label="Copiar valor estimado"
                    title="Copiar"
                  >
                    ⧉
                  </button>
                ) : (
                  <button
                    className="copyIconButton"
                    type="button"
                    onClick={() => setShowPrice(true)}
                    aria-label="Mostrar valor estimado"
                    title="Mostrar"
                    disabled={!canGeneratePrice}
                  >
                    <svg
                      className="summaryIcon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className="summaryRow">
              <span className="summaryLabel">Referência MDC</span>
              <div className="summaryValueWrap">
                <strong className="summaryValue">{assemblyLine}</strong>
                <button
                  className="copyIconButton"
                  onClick={() => copyToClipboard(assemblyLine)}
                  aria-label="Copiar referência MDC"
                  title="Copiar"
                >
                  ⧉
                </button>
              </div>
            </div>

            <div className="summaryRow">
              <span className="summaryLabel">Referência PHC</span>
              <div className="summaryValueWrap">
                <strong className="summaryValue">{phcReference}</strong>
                <button
                  className="copyIconButton"
                  onClick={() => copyToClipboard(phcReference)}
                  aria-label="Copiar referência PHC"
                  title="Copiar"
                  disabled={phcReference === "-"}
                >
                  ⧉
                </button>
              </div>
            </div>
          </div>
          {!canGeneratePrice ? (
            <p className="copyStatus muted">
              Para gerar preço, selecione pelo menos uma sonda.
            </p>
          ) : null}
          {loadError ? <p className="copyStatus muted">{loadError}</p> : null}
          {copyMsg ? <p className="copyStatus muted">{copyMsg}</p> : null}
        </section>

        <section className="card">
          <h2>Detalhado</h2>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Selecção</th>
                  <th>Código</th>
                </tr>
              </thead>
              <tbody>
                {detailedRowsWithValue.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="muted">
                      Sem componentes selecionados.
                    </td>
                  </tr>
                ) : (
                  detailedRowsWithValue.map((row) => (
                    <tr key={row.id}>
                      <td>{row.question}</td>
                      <td>{row.selection}</td>
                      <td>{row.code}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card printActions">
          <button className="primary" onClick={printBudget}>
            Imprimir / Guardar PDF
          </button>
        </section>

        <footer className="footer">
          <a href="https://paperpushers.biz" target="_blank" rel="noreferrer">
            {`PaperPushers 2026 - ${APP_VERSION}`}
          </a>
        </footer>
      </div>

      <section className="printOnly printSheet">
        <header className="printHeader">
          <div className="printCompany">
            <p>Watercare, Tratamento de Águas Lda</p>
            <p>NIPC - 506550672</p>
            <p>Centro Empresarial de Alverca</p>
            <p>Estrada Nacional 10, A5</p>
            <p>
              2615-187 Alverca do Ribatejo
            </p>
          </div>
          <div className="printMeta">
            <div className="printTitleBlock">
              <h1>Orçamento</h1>
              <h2>Modelo MDC</h2>
            </div>
            <img className="printLogo" src={printLogo} alt="Logo" />
          </div>
        </header>

        <section className="printSummary">
          <p>
            <strong>Modelo MDC selecionado:</strong> {answers.is2_modelo || "-"}
          </p>
          <p>
            <strong>Data:</strong> {printedAt}
          </p>
          <p>
            <strong>Codeline:</strong> {assemblyLine}
          </p>
          <p>
            <strong>Referência PHC:</strong> {phcReference}
          </p>
        </section>

        <section className="printDetails">
          <h2>Detalhado</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Selecção</th>
                <th>Código</th>
              </tr>
            </thead>
            <tbody>
              {detailedRowsWithValue.map((row) => (
                <tr key={`print-${row.id}`}>
                  <td>{row.question}</td>
                  <td>{row.selection}</td>
                  <td>{row.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {showPrice && canGeneratePrice ? (
          <section className="printSummary">
            <p>
              <strong>Preço:</strong> {money(total)}
            </p>
          </section>
        ) : null}

      </section>
    </main>
  );
}
