import assert from "node:assert/strict";
import test from "node:test";

import {
  assertBomExcelEligible,
  assertBomPdfEligible,
  createBomExportModel
} from "./bom-export.js";

const COMPLETE_RESULT = {
  state: "complete",
  input: {
    originalMdc: " MDC_iS.CP10_M1Xx_AF ",
    normalizedMdc: "MDC_iS.CP10_M1Xx_AF"
  },
  phc: {
    reference: "PHC-001",
    status: "found"
  },
  contributions: [
    {
      sourceComponent: "CP10",
      sourceCount: 1,
      materialPhc: "MAT-CORE",
      matrixRowId: "matrix-row-2",
      description: "Core material",
      quantity: 2
    }
  ],
  materialTotals: [
    {
      materialIdentity: "phc:MAT-CORE",
      materialPhc: "MAT-CORE",
      matrixRowId: null,
      description: "Core material",
      quantity: 2
    },
    {
      materialIdentity: "phc:MAT-ALWAYS",
      materialPhc: "MAT-ALWAYS",
      matrixRowId: null,
      description: "Always material",
      quantity: 0.5
    }
  ],
  issues: [],
  exportEligibility: {
    pdf: true,
    excel: true
  }
};

function resultWith(overrides) {
  return {
    ...COMPLETE_RESULT,
    ...overrides,
    input: { ...COMPLETE_RESULT.input, ...overrides.input },
    phc: { ...COMPLETE_RESULT.phc, ...overrides.phc },
    exportEligibility: { ...COMPLETE_RESULT.exportEligibility, ...overrides.exportEligibility }
  };
}

test("createBomExportModel projects complete calculated totals without contribution data", () => {
  const model = createBomExportModel(COMPLETE_RESULT);

  assert.deepEqual(model, {
    normalizedMdc: "MDC_iS.CP10_M1Xx_AF",
    phcReference: "PHC-001",
    state: "complete",
    issues: [],
    rows: [
      { materialPhc: "MAT-CORE", description: "Core material", quantity: 2 },
      { materialPhc: "MAT-ALWAYS", description: "Always material", quantity: 0.5 }
    ]
  });
});

test("createBomExportModel uses materialTotals rather than contribution provenance", () => {
  const result = resultWith({
    contributions: [
      ...COMPLETE_RESULT.contributions,
      {
        sourceComponent: "BDP",
        sourceCount: 2,
        materialPhc: "MAT-CORE",
        matrixRowId: "matrix-row-2",
        description: "Core material",
        quantity: 10
      }
    ]
  });

  const model = createBomExportModel(result);

  assert.deepEqual(model.rows, [
    { materialPhc: "MAT-CORE", description: "Core material", quantity: 2 },
    { materialPhc: "MAT-ALWAYS", description: "Always material", quantity: 0.5 }
  ]);
  assert.equal(Object.hasOwn(model.rows[0], "sourceComponent"), false);
  assert.equal(Object.hasOwn(model.rows[0], "matrixRowId"), false);
});

test("PDF eligibility preserves an incomplete result caused by an unmapped component", () => {
  const incomplete = resultWith({
    state: "incomplete",
    issues: [{
      severity: "problem",
      kind: "unmapped_component",
      message: "AQ — no material mapping defined"
    }]
  });

  assert.doesNotThrow(() => assertBomPdfEligible(incomplete));
  assert.deepEqual(createBomExportModel(incomplete).issues, incomplete.issues);
});

test("blocked results cannot produce a PDF export model", () => {
  const blocked = resultWith({
    state: "blocked",
    exportEligibility: { pdf: false, excel: false }
  });

  assert.throws(() => assertBomPdfEligible(blocked), /PDF export is not eligible/);
  assert.throws(() => createBomExportModel(blocked), /PDF export is not eligible/);
});

test("a missing equipment PHC remains PDF-eligible", () => {
  const withoutPhc = resultWith({
    phc: { reference: null, status: "not_found" },
    issues: [{
      severity: "warning",
      kind: "phc_not_found",
      message: "PHC reference not found"
    }]
  });

  assert.doesNotThrow(() => assertBomPdfEligible(withoutPhc));
  assert.equal(createBomExportModel(withoutPhc).phcReference, null);
});

test("a missing material PHC remains PDF-eligible", () => {
  const incomplete = resultWith({
    state: "incomplete",
    materialTotals: [{
      materialIdentity: "row:matrix-row-2",
      materialPhc: "",
      matrixRowId: "matrix-row-2",
      description: "Unreferenced core",
      quantity: 2
    }],
    issues: [{
      severity: "problem",
      kind: "missing_material_phc",
      message: "Unreferenced core (matrix-row-2) — material PHC not found"
    }],
    exportEligibility: { pdf: true, excel: false }
  });

  assert.doesNotThrow(() => assertBomPdfEligible(incomplete));
  assert.deepEqual(createBomExportModel(incomplete).rows, [
    { materialPhc: "", description: "Unreferenced core", quantity: 2 }
  ]);
});

test("Excel eligibility allows complete totals with material PHCs", () => {
  assert.doesNotThrow(() => assertBomExcelEligible(COMPLETE_RESULT));
});

test("Excel eligibility allows unmapped-component incompleteness with material PHCs", () => {
  const incomplete = resultWith({
    state: "incomplete",
    issues: [{
      severity: "problem",
      kind: "unmapped_component",
      message: "AQ — no material mapping defined"
    }]
  });

  assert.doesNotThrow(() => assertBomExcelEligible(incomplete));
});

test("Excel eligibility allows an included material total without a material PHC", () => {
  const incomplete = resultWith({
    state: "incomplete",
    materialTotals: [{
      materialIdentity: "row:matrix-row-2",
      materialPhc: "",
      matrixRowId: "matrix-row-2",
      description: "Unreferenced core",
      quantity: 2
    }],
    exportEligibility: { pdf: true, excel: true }
  });

  assert.doesNotThrow(() => assertBomExcelEligible(incomplete));
});

test("Excel eligibility rejects blocked results", () => {
  const blocked = resultWith({
    state: "blocked",
    exportEligibility: { pdf: false, excel: false }
  });

  assert.throws(() => assertBomExcelEligible(blocked), /Excel export is not eligible/);
});
