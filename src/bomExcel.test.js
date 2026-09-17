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

test("creates a parseable Materials Total workbook from consolidated rows only", async () => {
  const bytes = createBomExcelWorkbook(COMPLETE_MODEL);
  const { workbook, worksheet, rows } = await readSheetRows(bytes);

  assert.deepEqual(workbook.SheetNames, ["Materials Total"]);
  assert.ok(worksheet);
  assert.deepEqual(rows, [
    ["Normalized MDC", "MDC_iS.CP10_M1Xx_AF"],
    ["Equipment PHC", "PHC-001"],
    ["BOM Status", "complete"],
    [],
    ["Material PHC", "Description", "Total Qty"],
    ["MAT-CORE", "Material núcleo", 2],
    ["MAT-ALWAYS", "Abraçadeira", 0.5]
  ]);
  assert.equal(worksheet.C6.t, "n");
  assert.equal(worksheet.C7.t, "n");
  assert.equal(rows.flat().includes("CP10"), false);
  assert.equal(rows.filter((row) => row[0] === "MAT-CORE").length, 1);
});

test("preserves a blank material PHC and incomplete context in the workbook", async () => {
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
    ["Normalized MDC", "MDC_iS.CP10_M1Xx_AF"],
    ["Equipment PHC", "PHC reference not found"],
    ["BOM Status", "incomplete"],
    ["Issues / Warnings"],
    ["PHC reference not found"],
    ["AQ — no material mapping defined"],
    ["Material português — material PHC not found"],
    [],
    ["Material PHC", "Description", "Total Qty"],
    ["", "Tubo de ligação", 1.25],
    ["MAT-2", "Válvula de pressão", 3]
  ]);
  assert.equal(worksheet.A10.v, "");
  assert.equal(worksheet.C10.t, "n");
  assert.equal(worksheet.C11.t, "n");
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
