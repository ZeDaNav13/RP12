import assert from "node:assert/strict";
import test from "node:test";

import { createBomExcelWorkbook, saveBomExcel } from "./bomExcel.js";

const COMPLETE_MODEL = {
  normalizedMdc: "MDC_iS.CP10_M1Xx_AF",
  phcReference: "PHC-001",
  state: "complete",
  issues: [],
  rows: [
    { materialPhc: "MAT-CORE", description: "Material núcleo", quantity: 2 },
    { materialPhc: "MAT-ALWAYS", description: "Abraçadeira", quantity: 0.5 }
  ],
  contributions: [
    { sourceComponent: "CP10", materialPhc: "MAT-CORE", quantity: 1 },
    { sourceComponent: "Xx", materialPhc: "MAT-CORE", quantity: 1 }
  ]
};

async function readWorkbook(bytes) {
  const XLSX = await import("xlsx");
  return XLSX.read(bytes, { type: "array" });
}

async function readSheetRows(bytes) {
  const XLSX = await import("xlsx");
  const workbook = await readWorkbook(bytes);

  return {
    workbook,
    worksheet: workbook.Sheets["Materials Total"],
    rows: XLSX.utils.sheet_to_json(workbook.Sheets["Materials Total"], {
      header: 1,
      blankrows: true
    })
  };
}

test("creates an exact three-column Materials Total workbook from consolidated rows", async () => {
  const bytes = createBomExcelWorkbook(COMPLETE_MODEL);
  const { workbook, worksheet, rows } = await readSheetRows(bytes);

  assert.deepEqual(workbook.SheetNames, ["Materials Total"]);
  assert.ok(worksheet);
  assert.deepEqual(rows, [
    ["Material PHC", "Description", "Quantity"],
    ["MAT-CORE", "Material núcleo", 2],
    ["MAT-ALWAYS", "Abraçadeira", 0.5]
  ]);
  assert.equal(worksheet["!ref"], "A1:C3");
  assert.equal(worksheet.C2.t, "n");
  assert.equal(worksheet.C3.t, "n");
  assert.equal(rows.every((row) => row.length === 3), true);
  assert.equal(rows.flat().some((cell) => /MDC|Equipment PHC|BOM Status|Issues|Warnings/i.test(String(cell))), false);
  assert.equal(rows.flat().includes("CP10"), false);
  assert.equal(rows.filter((row) => row[0] === "MAT-CORE").length, 1);
});

test("preserves a blank material PHC in the exact three-column workbook", async () => {
  const bytes = createBomExcelWorkbook({
    ...COMPLETE_MODEL,
    phcReference: null,
    state: "incomplete",
    issues: [
      { severity: "warning", kind: "phc_not_found", message: "PHC reference not found" },
      { severity: "problem", kind: "unmapped_component", message: "AQ — no material mapping defined" },
      { severity: "problem", kind: "missing_material_phc", message: "Material português — material PHC not found" }
    ],
    rows: [
      { materialPhc: "", description: "Tubo de ligação", quantity: 1.25 },
      { materialPhc: "MAT-2", description: "Válvula de pressão", quantity: 3 }
    ]
  });
  const { worksheet, rows } = await readSheetRows(bytes);

  assert.deepEqual(rows, [
    ["Material PHC", "Description", "Quantity"],
    ["", "Tubo de ligação", 1.25],
    ["MAT-2", "Válvula de pressão", 3]
  ]);
  assert.equal(worksheet["!ref"], "A1:C3");
  assert.equal(worksheet.A2.v, "");
  assert.equal(worksheet.B2.v, "Tubo de ligação");
  assert.equal(worksheet.C2.v, 1.25);
  assert.equal(worksheet.C2.t, "n");
  assert.equal(worksheet.C3.t, "n");
  assert.equal(rows.every((row) => row.length === 3), true);
  assert.equal(rows.flat().some((cell) => /MDC|PHC reference not found|incomplete|Issues|Warnings/i.test(String(cell))), false);
});

test("saves the generated workbook through the supplied browser download boundary", async () => {
  const downloads = [];

  await saveBomExcel({
    model: COMPLETE_MODEL,
    filename: "materials_MDC_iS.CP10_M1Xx_AF.xlsx",
    download: async (bytes, filename) => {
      downloads.push({ bytes, filename });
    }
  });

  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "materials_MDC_iS.CP10_M1Xx_AF.xlsx");
  assert.deepEqual((await readWorkbook(downloads[0].bytes)).SheetNames, ["Materials Total"]);
});
