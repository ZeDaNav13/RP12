import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { parseBomCsv } from "./bom-csv.js";
import { parseBomMdc } from "./bom-mdc.js";
import { parseMaterialsMatrix } from "./bom-matrix.js";

const COMPONENT_HEADERS = [
  "ALWAYS",
  "CP10",
  "CP20",
  "CP30",
  "CP40",
  "CP50",
  "CP60",
  "BDP",
  "BDC",
  "Cl2mA",
  "Cl5mA",
  "Cl10mA",
  "Cl20mA",
  "Cl2m0c",
  "Cl20m0c",
  "pH",
  "CD",
  "AF",
  "AQ",
  "BF",
  "BQ",
  "CF",
  "CQ",
  "DF",
  "FF",
  "BDW"
];

const KNOWN_COMPONENT_HEADERS = [
  "ALWAYS",
  "CP10",
  "CP20",
  "CP30",
  "CP40",
  "CP50",
  "CP60",
  "BDP",
  "BDC",
  "AF",
  "BF",
  "CF",
  "FF",
  "BDW"
];

const UNKNOWN_COMPONENT_HEADERS = [
  "Cl2mA",
  "Cl5mA",
  "Cl10mA",
  "Cl20mA",
  "Cl2m0c",
  "Cl20m0c",
  "pH",
  "CD",
  "AQ",
  "BQ",
  "CQ",
  "DF"
];

function matrixCsv(headers, rows) {
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function validHeaders(...componentHeaders) {
  return ["material_phc", "description", "ALWAYS", ...componentHeaders];
}

function resultErrors(csvText) {
  const result = parseMaterialsMatrix(csvText);
  assert.equal(result.ok, false, JSON.stringify(result));
  return result.errors;
}

function assertMatrixError(csvText, row, column) {
  assert.ok(
    resultErrors(csvText).some(
      (error) => error.kind === "invalid_matrix" && error.row === row && error.column === column
    )
  );
}

function initialQuantities(overrides = {}) {
  return Object.fromEntries(
    COMPONENT_HEADERS.map((header) => [
      header,
      UNKNOWN_COMPONENT_HEADERS.includes(header) ? null : (overrides[header] ?? 0)
    ])
  );
}

test("parseBomCsv parses quotes, doubled quotes, CRLF, and terminal newlines", () => {
  assert.deepEqual(
    parseBomCsv('material_phc,description,ALWAYS,AF\r\n,"Clamp ""Heavy"", d32",0,2\r\n'),
    [
      ["material_phc", "description", "ALWAYS", "AF"],
      ["", 'Clamp "Heavy", d32', "0", "2"]
    ]
  );
});

test("parseMaterialsMatrix requires exact leading identity headers and ALWAYS", () => {
  assertMatrixError(matrixCsv(["description", "material_phc", "ALWAYS"], [["Part", "", "0"]]), 1, "material_phc");
  assertMatrixError(matrixCsv(["MATERIAL_PHC", "description", "ALWAYS"], [["", "Part", "0"]]), 1, "material_phc");
  assertMatrixError(matrixCsv(["material_phc", "ALWAYS", "description"], [["", "0", "Part"]]), 1, "description");
  assertMatrixError(matrixCsv(["material_phc", "description"], [["", "Part"]]), 1, "ALWAYS");
  assertMatrixError(matrixCsv(["material_phc", "description", "ALWAYS", ""], [["", "Part", "0", "0"]]), 1, "");
  assertMatrixError(matrixCsv(validHeaders("AF"), [["", "Part", "0"]]), 2, "row");
});

test("parseMaterialsMatrix preserves case-sensitive dynamic component headers", () => {
  const result = parseMaterialsMatrix(
    matrixCsv(validHeaders("AF", "af", "NEWCODE"), [["", "Part", "0", "2", "3", "4"]])
  );

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual([...result.value.componentCodes], ["ALWAYS", "AF", "af", "NEWCODE"]);
  assert.deepEqual(result.value.rows[0].quantities, {
    ALWAYS: 0,
    AF: 2,
    af: 3,
    NEWCODE: 4
  });
  assertMatrixError(
    matrixCsv(validHeaders("AF", "AF"), [["", "Part", "0", "1", "2"]]),
    1,
    "AF"
  );
});

test("parseMaterialsMatrix preserves valid quantities and rejects invalid source cells", () => {
  const validResult = parseMaterialsMatrix(
    matrixCsv(validHeaders("AF", "BF", "CF", "FF"), [["", "Part", "", "0", "0.5", "0.4", "1.2"]])
  );

  assert.equal(validResult.ok, true, JSON.stringify(validResult));
  assert.deepEqual(validResult.value.rows[0].quantities, {
    ALWAYS: null,
    AF: 0,
    BF: 0.5,
    CF: 0.4,
    FF: 1.2
  });
  assertMatrixError(matrixCsv(validHeaders("AF"), [["", "Part", "0", "-1"]]), 2, "AF");
  assertMatrixError(matrixCsv(validHeaders("AF"), [["", "Part", "0", "two"]]), 2, "AF");
  assertMatrixError(matrixCsv(validHeaders("AF"), [["", "Part", "0", "Infinity"]]), 2, "AF");
});

test("parseMaterialsMatrix validates nonblank PHC uniqueness and blank row identity", () => {
  const blankPhcResult = parseMaterialsMatrix(
    matrixCsv(validHeaders("AF"), [
      ["", "First part", "0", "1"],
      ["", "Second part", "0", "2"]
    ])
  );

  assert.equal(blankPhcResult.ok, true, JSON.stringify(blankPhcResult));
  assert.deepEqual(
    blankPhcResult.value.rows.map((row) => ({ rowId: row.rowId, materialPhc: row.materialPhc })),
    [
      { rowId: "matrix-row-2", materialPhc: "" },
      { rowId: "matrix-row-3", materialPhc: "" }
    ]
  );

  const distinctPhcResult = parseMaterialsMatrix(
    matrixCsv(validHeaders(), [
      ["MAT-1", "First part", "0"],
      ["MAT-2", "Second part", "0"]
    ])
  );
  assert.equal(distinctPhcResult.ok, true, JSON.stringify(distinctPhcResult));
  assertMatrixError(
    matrixCsv(validHeaders(), [
      ["MAT-1", "First part", "0"],
      ["MAT-1", "Second part", "0"]
    ]),
    3,
    "material_phc"
  );
});

test("parseMaterialsMatrix collects independently detectable row errors in source order", () => {
  const result = parseMaterialsMatrix(
    matrixCsv(validHeaders("AF", "BF"), [
      ["MAT-1", "Base material", "0", "1", "1"],
      ["MAT-2", "", "0", "two", "1"],
      ["MAT-1", "Duplicate material", "0", "1", "-1"]
    ])
  );

  assert.deepEqual(result, {
    ok: false,
    errors: [
      { kind: "invalid_matrix", row: 3, column: "description", message: "blank description" },
      { kind: "invalid_matrix", row: 3, column: "AF", message: "invalid quantity" },
      { kind: "invalid_matrix", row: 4, column: "material_phc", message: "duplicate material PHC" },
      { kind: "invalid_matrix", row: 4, column: "BF", message: "invalid quantity" }
    ]
  });
});

test("initial runtime matrix has only approved material rows and component columns", async () => {
  const matrixPath = path.join(process.cwd(), "public/materials/materials_matrix.csv");
  const result = parseMaterialsMatrix(await readFile(matrixPath, "utf8"));

  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.value.rows.length, 14);
  assert.deepEqual([...result.value.componentCodes], COMPONENT_HEADERS);
  assert.equal(result.value.rows.every((row) => row.materialPhc === ""), true);
  assert.equal(
    result.value.rows.every((row) =>
      KNOWN_COMPONENT_HEADERS.every((header) => Number.isFinite(row.quantities[header]))
    ),
    true
  );
  assert.equal(
    result.value.rows.every((row) =>
      UNKNOWN_COMPONENT_HEADERS.every((header) => row.quantities[header] === null)
    ),
    true
  );

  assert.deepEqual(
    result.value.rows.map((row) => ({ description: row.description, quantities: row.quantities })),
    [
      {
        description: "Parafuso Sextavado interior Inox M5x16",
        quantities: initialQuantities({
          CP10: 4,
          CP20: 4,
          CP30: 4,
          CP40: 4,
          CP50: 4,
          CP60: 4,
          BDP: 2,
          BDC: 2,
          AF: 2,
          BF: 2,
          CF: 2,
          FF: 2
        })
      },
      {
        description: "Abraçadeira Astore d32",
        quantities: initialQuantities({ AF: 2, BF: 2, CF: 2, FF: 2 })
      },
      {
        description: "CORPO VALVOLA SINTESI 2 VIE MF IN",
        quantities: initialQuantities({ BDW: 1 })
      },
      {
        description: "SERVOCOMANDO SINTESI 2 PUNTI ON-OFF 8 NR",
        quantities: initialQuantities({ BDW: 1 })
      },
      {
        description: "Parafuso Autoroscante 4,5x20 Philips INOX 304",
        quantities: initialQuantities({ ALWAYS: 2 })
      },
      {
        description: "Platine de montagem painel 900mmx750mm",
        quantities: initialQuantities({ ALWAYS: 1 })
      },
      {
        description: "Suporte INOX 304 Filtro NW 25, 32 FP3",
        quantities: initialQuantities({ ALWAYS: 1 })
      },
      {
        description: "Filtro HYDRA HOT 1'' - com elemento RLH 90mic. Suporte Inox304 AQ",
        quantities: initialQuantities({ ALWAYS: 1 })
      },
      {
        description: "Porca de Redução PVC 1´´x1-4´´",
        quantities: initialQuantities({ ALWAYS: 2 })
      },
      {
        description: "Mt Tubo 6x8mm Rolo",
        quantities: initialQuantities({ ALWAYS: 0.5 })
      },
      {
        description: "MT Calha electrica para Q.Electrico 40(L)x40(A)",
        quantities: initialQuantities({ ALWAYS: 0.4 })
      },
      {
        description: "MT Manga Termoretratil 4.8-2.4mm",
        quantities: initialQuantities({ ALWAYS: 1.2 })
      },
      {
        description: "MT Cabo LIYY 3x0.25",
        quantities: initialQuantities({ ALWAYS: 1 })
      },
      {
        description: "Transição 1-4''M - 8mm ER JG Preto Plastico",
        quantities: initialQuantities({ ALWAYS: 2 })
      }
    ]
  );
});

test("initial runtime matrix covers every component from canonical generated MDC references", async () => {
  const combinationsPath = path.join(process.cwd(), "all_reply_combinations_filtered.csv");
  const [headers, ...rows] = parseBomCsv(await readFile(combinationsPath, "utf8"));
  const assemblyCodeIndex = headers.indexOf("assembly_code");
  const currentComponentCodes = new Set();

  for (const row of rows) {
    const parsed = parseBomMdc(row[assemblyCodeIndex]);
    assert.equal(parsed.ok, true, row[assemblyCodeIndex]);
    parsed.value.components.forEach((component) => currentComponentCodes.add(component.code));
  }

  assert.deepEqual(
    [...currentComponentCodes].sort(),
    COMPONENT_HEADERS.filter((header) => header !== "ALWAYS").sort()
  );
  assert.equal(currentComponentCodes.has("PT"), false);
});
