import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseBomCsv } from "../src/domain/bom-csv.js";
import {
  canonicalizeComposition,
  compositionKey,
  physicalComponentsForConfiguration
} from "../src/domain/equipmentComposition.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");

async function readQuestionCsv(filename) {
  const text = await fs.readFile(path.join(rootDir, "public/questions", filename), "utf8");
  const [headers, ...values] = parseBomCsv(text);

  return {
    headers,
    rows: values.map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
    )
  };
}

function rowForOption(rows, option) {
  const row = rows.find((candidate) => candidate.option === option);
  assert.ok(row, `missing row for option: ${option}`);
  return row;
}

function assertPhcs(rows, expected) {
  Object.entries(expected).forEach(([option, phc]) => {
    assert.equal(rowForOption(rows, option).phc, phc, `unexpected PHC for ${option}`);
  });
}

test("canonicalizeComposition ignores blanks, aggregates quantities, and sorts PHCs", () => {
  assert.deepEqual(
    canonicalizeComposition([
      { phc: "  " },
      { phc: "49.10301032368N" },
      { phc: "534.B310CP10" },
      { phc: "49.10301032368N", quantity: 1 }
    ]),
    [
      { phc: "49.10301032368N", quantity: 2 },
      { phc: "534.B310CP10", quantity: 1 }
    ]
  );
});

test("compositionKey is independent of input order", () => {
  const first = [
    { phc: "534.PSCF" },
    { phc: "49.10301032368N", quantity: 2 },
    { phc: "534.B310CP10" }
  ];
  const second = [
    { phc: "534.B310CP10" },
    { phc: "49.10301032368N" },
    { phc: "534.PSCF" },
    { phc: "49.10301032368N" }
  ];

  assert.equal(compositionKey(first), "49.10301032368N:2|534.B310CP10:1|534.PSCF:1");
  assert.equal(compositionKey(first), compositionKey(second));
});

test("physical composition ignores Selector pump-question position", () => {
  const selectedPump = { phc: "49.10301032368N", option: "VMS0706" };
  const firstPosition = physicalComponentsForConfiguration({
    selectedPumpRows: [{ ...selectedPump, questionPosition: 0 }]
  });
  const fourthPosition = physicalComponentsForConfiguration({
    selectedPumpRows: [{ ...selectedPump, questionPosition: 3 }]
  });

  assert.equal(compositionKey(firstPosition), "49.10301032368N:1");
  assert.equal(compositionKey(firstPosition), compositionKey(fourthPosition));
});

test("same MDC probe code with different physical PHCs has a different composition key", async () => {
  const { rows } = await readQuestionCsv("sonda_cloro.csv");
  const cs4 = rowForOption(rows, "Cloro 0-5 mA Reiss CS4");
  const as2 = rowForOption(rows, "Cloro Reiss AS2 mA 0-5/0-1.7 c/RV1");

  assert.equal(cs4.code, "Cl5mA");
  assert.equal(as2.code, "Cl5mA");
  assert.notEqual(cs4.phc, as2.phc);
  assert.notEqual(
    compositionKey(physicalComponentsForConfiguration({ selectedProbeRows: [cs4] })),
    compositionKey(physicalComponentsForConfiguration({ selectedProbeRows: [as2] }))
  );
});

test("BDW uses its two physical PHCs and excludes its logical row", async () => {
  const { rows } = await readQuestionCsv("bdw.csv");
  const composition = physicalComponentsForConfiguration({ bdwApplies: true, bdwRows: rows });

  assert.deepEqual(composition, [
    { phc: "2097.SC2A2A9", quantity: 1 },
    { phc: "2097.SR2221U", quantity: 1 }
  ]);
});

test("mandatory physical rows contribute while blank PHC selections do not", async () => {
  const [models, pumps, ph, conductivity, mandatoryAddons] = await Promise.all([
    readQuestionCsv("is2_modelo.csv"),
    readQuestionCsv("bomba_biocida_inorganico.csv"),
    readQuestionCsv("sonda_ph.csv"),
    readQuestionCsv("sonda_condutividade.csv"),
    readQuestionCsv("mandatory_addons.csv")
  ]);

  const composition = physicalComponentsForConfiguration({
    selectedModelRow: rowForOption(models.rows, "CP10"),
    selectedPumpRows: [rowForOption(pumps.rows, "Sem Bombas")],
    selectedProbeRows: [
      rowForOption(ph.rows, "Sem sonda de pH"),
      rowForOption(conductivity.rows, "Sem sonda de condutividade")
    ],
    mandatoryAddonRows: mandatoryAddons.rows
  });

  assert.deepEqual(composition, [
    { phc: "534.B310CP10", quantity: 1 },
    { phc: "ELET.EVC532", quantity: 1 }
  ]);
});

test("Selector question CSVs expose authoritative PHCs as their first column", async () => {
  const filenames = [
    "is2_modelo.csv",
    "bomba_biocida_inorganico.csv",
    "bomba_biocida_organico.csv",
    "bomba_controlo_ph.csv",
    "bomba_inibidor.csv",
    "sonda_cloro.csv",
    "sonda_ph.csv",
    "sonda_condutividade.csv",
    "porta_sondas.csv",
    "circuito.csv",
    "bdw.csv",
    "mandatory_addons.csv"
  ];
  const csvs = Object.fromEntries(
    await Promise.all(
      filenames.map(async (filename) => [filename, await readQuestionCsv(filename)])
    )
  );

  filenames.forEach((filename) => {
    assert.equal(csvs[filename].headers[0], "phc", `${filename} must have PHC first`);
  });

  assertPhcs(csvs["is2_modelo.csv"].rows, {
    CP10: "534.B310CP10",
    CP20: "534.B310CP20",
    CP30: "534.B310CP30",
    CP40: "534.B310CP40",
    CP50: "534.B310CP50",
    CP60: "534.B310CP60",
    Nenhum: ""
  });

  [
    "bomba_biocida_inorganico.csv",
    "bomba_biocida_organico.csv",
    "bomba_controlo_ph.csv",
    "bomba_inibidor.csv"
  ].forEach((filename) => {
    assertPhcs(csvs[filename].rows, {
      VMS0706: "49.10301032368N",
      VCL0706: "49.10301032116N",
      "Sem Bombas": ""
    });
  });

  assertPhcs(csvs["sonda_cloro.csv"].rows, {
    "Cloro 0-2 mA Reiss CS4": "1148.3426313",
    "Cloro 0-5 mA Reiss CS4": "1148.3426314",
    "Cloro 0-10 mA Reiss CS4": "1148.3426315",
    "Cloro Reiss AS3 mA 0-5/0-1.7 c/RV1": "1148.3426742",
    "Cloro Reiss AS3 mA 0-20/0-7 c/RV1": "1148.3426744",
    "Cloro Reiss AS2 mA 0-5/0-1.7 c/RV1": "1148.3426792",
    "Cloro Reiss AS2 mA 0-20/0-7 c/RV1": "1148.3426794",
    "Cloro 0-2 Reiss CS4 m0c": "1148.3426360",
    "Cloro 0-20 Reiss CS4 m0c": "1148.3426361",
    "Cloro Reiss AS3 m0c 0-2/0-0.7 c/RV1": "1148.3426720",
    "Cloro Reiss AS3 m0c 0-20/0-7 c/RV1": "1148.3426721",
    "Cloro Reiss AS2 m0c 0-2/0-0.7 c/RV1": "1148.3426770",
    "Cloro Reiss AS2 m0c 0-20/0-7 c/RV1": "1148.3426771",
    "Sem sonda de cloro": ""
  });

  assertPhcs(csvs["sonda_ph.csv"].rows, {
    "pH m0c": "1717.WS102-PH-N",
    "Sem sonda de pH": ""
  });
  assertPhcs(csvs["sonda_condutividade.csv"].rows, {
    "Condutividade m0c": "1717.WS102-EC-N",
    "Sem sonda de condutividade": ""
  });
  assertPhcs(csvs["porta_sondas.csv"].rows, {
    AF: "534.PSAF",
    AQ: "534.PSAQ",
    BF: "534.PSBF",
    BQ: "534.PSBQ",
    CF: "534.PSCF",
    CQ: "534.PSCQ",
    DF: "534.PSDF",
    FF: "534.PSFF"
  });
  csvs["circuito.csv"].rows.forEach((row) => assert.equal(row.phc, ""));
  assertPhcs(csvs["bdw.csv"].rows, {
    BDW: "",
    "Atuador p/ valvula de esfera Sintesi 230V 50/60Hz On": "2097.SR2221U",
    'Válvula Latão Sintesi 1/2" MF': "2097.SC2A2A9"
  });
  assertPhcs(csvs["mandatory_addons.csv"].rows, {
    "Cabo M12": "ELET.EVC532",
    "Material diverso": ""
  });
});
