import assert from "node:assert/strict";
import test from "node:test";

import { calculateBomMaterials } from "./bom.js";

function parsedMdc(components) {
  return { components };
}

function matrix(rows, componentCodes) {
  return {
    rows,
    componentCodes: new Set(componentCodes)
  };
}

function matrixRow(rowId, materialPhc, description, quantities) {
  return { rowId, materialPhc, description, quantities };
}

test("calculates component contributions, provenance, totals, ALWAYS fractions, and unmapped components", () => {
  const result = calculateBomMaterials(
    parsedMdc([
      { code: "CP10", count: 1 },
      { code: "BDP", count: 2 },
      { code: "AF", count: 1 },
      { code: "BDW", count: 1 },
      { code: "AQ", count: 1 },
      { code: "Cl30mA", count: 1 }
    ]),
    matrix(
      [
        matrixRow("matrix-row-2", "MAT-SCREW", "M5 screw", { CP10: 4, BDP: 2, AF: 2, BDW: 0, ALWAYS: 0 }),
        matrixRow("matrix-row-3", "MAT-BDW", "BDW assembly", { CP10: 0, BDP: 0, AF: 0, BDW: 1, ALWAYS: 0 }),
        matrixRow("matrix-row-4", "MAT-HALF", "Half material", { CP10: 0, BDP: 0, AF: 0, BDW: 0, ALWAYS: 0.5 }),
        matrixRow("matrix-row-5", "MAT-FOUR-TENTHS", "Four tenths material", { CP10: 0, BDP: 0, AF: 0, BDW: 0, ALWAYS: 0.4 }),
        matrixRow("matrix-row-6", "MAT-ONE-TWO", "One point two material", { CP10: 0, BDP: 0, AF: 0, BDW: 0, ALWAYS: 1.2 })
      ],
      ["ALWAYS", "CP10", "BDP", "AF", "BDW"]
    )
  );

  assert.deepEqual(result.contributions, [
    { sourceComponent: "CP10", sourceCount: 1, materialPhc: "MAT-SCREW", matrixRowId: "matrix-row-2", description: "M5 screw", quantity: 4 },
    { sourceComponent: "BDP", sourceCount: 2, materialPhc: "MAT-SCREW", matrixRowId: "matrix-row-2", description: "M5 screw", quantity: 4 },
    { sourceComponent: "AF", sourceCount: 1, materialPhc: "MAT-SCREW", matrixRowId: "matrix-row-2", description: "M5 screw", quantity: 2 },
    { sourceComponent: "BDW", sourceCount: 1, materialPhc: "MAT-BDW", matrixRowId: "matrix-row-3", description: "BDW assembly", quantity: 1 },
    { sourceComponent: "ALWAYS", sourceCount: 1, materialPhc: "MAT-HALF", matrixRowId: "matrix-row-4", description: "Half material", quantity: 0.5 },
    { sourceComponent: "ALWAYS", sourceCount: 1, materialPhc: "MAT-FOUR-TENTHS", matrixRowId: "matrix-row-5", description: "Four tenths material", quantity: 0.4 },
    { sourceComponent: "ALWAYS", sourceCount: 1, materialPhc: "MAT-ONE-TWO", matrixRowId: "matrix-row-6", description: "One point two material", quantity: 1.2 }
  ]);
  assert.deepEqual(result.materialTotals, [
    { materialIdentity: "phc:MAT-SCREW", materialPhc: "MAT-SCREW", matrixRowId: null, description: "M5 screw", quantity: 10 },
    { materialIdentity: "phc:MAT-BDW", materialPhc: "MAT-BDW", matrixRowId: null, description: "BDW assembly", quantity: 1 },
    { materialIdentity: "phc:MAT-HALF", materialPhc: "MAT-HALF", matrixRowId: null, description: "Half material", quantity: 0.5 },
    { materialIdentity: "phc:MAT-FOUR-TENTHS", materialPhc: "MAT-FOUR-TENTHS", matrixRowId: null, description: "Four tenths material", quantity: 0.4 },
    { materialIdentity: "phc:MAT-ONE-TWO", materialPhc: "MAT-ONE-TWO", matrixRowId: null, description: "One point two material", quantity: 1.2 }
  ]);
  assert.deepEqual(result.unmappedComponents, ["AQ", "Cl30mA"]);
  assert.deepEqual(result.missingMaterialPhcs, []);
});

test("keeps blank-PHC rows distinct and aggregates repeated contributions by matrix row", () => {
  const result = calculateBomMaterials(
    parsedMdc([
      { code: "CP10", count: 1 },
      { code: "AF", count: 1 }
    ]),
    matrix(
      [
        matrixRow("matrix-row-2", "", "Unreferenced material", { CP10: 2, AF: 3, ALWAYS: 0 }),
        matrixRow("matrix-row-3", "", "Unreferenced material", { CP10: 5, AF: 0, ALWAYS: 0 }),
        matrixRow("matrix-row-4", "", "Zero material", { CP10: 0, AF: 0, ALWAYS: 0 })
      ],
      ["ALWAYS", "CP10", "AF"]
    )
  );

  assert.deepEqual(result.contributions, [
    { sourceComponent: "CP10", sourceCount: 1, materialPhc: "", matrixRowId: "matrix-row-2", description: "Unreferenced material", quantity: 2 },
    { sourceComponent: "CP10", sourceCount: 1, materialPhc: "", matrixRowId: "matrix-row-3", description: "Unreferenced material", quantity: 5 },
    { sourceComponent: "AF", sourceCount: 1, materialPhc: "", matrixRowId: "matrix-row-2", description: "Unreferenced material", quantity: 3 }
  ]);
  assert.deepEqual(result.materialTotals, [
    { materialIdentity: "row:matrix-row-2", materialPhc: "", matrixRowId: "matrix-row-2", description: "Unreferenced material", quantity: 5 },
    { materialIdentity: "row:matrix-row-3", materialPhc: "", matrixRowId: "matrix-row-3", description: "Unreferenced material", quantity: 5 }
  ]);
  assert.deepEqual(result.missingMaterialPhcs, [
    { matrixRowId: "matrix-row-2", description: "Unreferenced material" },
    { matrixRowId: "matrix-row-3", description: "Unreferenced material" }
  ]);
});

test("treats a present zero component column as mapped without a contribution", () => {
  const result = calculateBomMaterials(
    parsedMdc([{ code: "NEWCODE", count: 1 }]),
    matrix([matrixRow("matrix-row-2", "MAT-1", "Mapped zero", { NEWCODE: 0, ALWAYS: 0 })], ["ALWAYS", "NEWCODE"])
  );

  assert.deepEqual(result.contributions, []);
  assert.deepEqual(result.materialTotals, []);
  assert.deepEqual(result.unmappedComponents, []);
  assert.deepEqual(result.missingMaterialPhcs, []);
});

test("keeps known contributions when a present component column has unknown quantities", () => {
  const result = calculateBomMaterials(
    parsedMdc([{ code: "NEWCODE", count: 2 }]),
    matrix(
      [
        matrixRow("matrix-row-2", "MAT-UNKNOWN", "Unknown mapping", { NEWCODE: null, ALWAYS: 0 }),
        matrixRow("matrix-row-3", "MAT-KNOWN", "Known mapping", { NEWCODE: 3, ALWAYS: 0 }),
        matrixRow("matrix-row-4", "MAT-ZERO", "Confirmed zero", { NEWCODE: 0, ALWAYS: 0 })
      ],
      ["ALWAYS", "NEWCODE"]
    )
  );

  assert.deepEqual(result.contributions, [
    { sourceComponent: "NEWCODE", sourceCount: 2, materialPhc: "MAT-KNOWN", matrixRowId: "matrix-row-3", description: "Known mapping", quantity: 6 }
  ]);
  assert.deepEqual(result.unmappedComponents, ["NEWCODE"]);
});

test("uses future matrix component columns without a hardcoded catalogue", () => {
  const result = calculateBomMaterials(
    parsedMdc([{ code: "NEWCODE", count: 2 }]),
    matrix([matrixRow("matrix-row-2", "MAT-NEW", "Future material", { NEWCODE: 3, ALWAYS: 0 })], ["ALWAYS", "NEWCODE"])
  );

  assert.deepEqual(result.contributions, [
    { sourceComponent: "NEWCODE", sourceCount: 2, materialPhc: "MAT-NEW", matrixRowId: "matrix-row-2", description: "Future material", quantity: 6 }
  ]);
  assert.deepEqual(result.materialTotals, [
    { materialIdentity: "phc:MAT-NEW", materialPhc: "MAT-NEW", matrixRowId: null, description: "Future material", quantity: 6 }
  ]);
  assert.deepEqual(result.unmappedComponents, []);
});

test("preserves component, matrix-row, ALWAYS, total, and missing-PHC encounter order", () => {
  const result = calculateBomMaterials(
    parsedMdc([
      { code: "SECOND", count: 1 },
      { code: "FIRST", count: 1 }
    ]),
    matrix(
      [
        matrixRow("matrix-row-2", "", "First row", { SECOND: 2, FIRST: 3, ALWAYS: 4 }),
        matrixRow("matrix-row-3", "", "Second row", { SECOND: 5, FIRST: 6, ALWAYS: 7 })
      ],
      ["ALWAYS", "FIRST", "SECOND"]
    )
  );

  assert.deepEqual(
    result.contributions.map(({ sourceComponent, matrixRowId, quantity }) => ({ sourceComponent, matrixRowId, quantity })),
    [
      { sourceComponent: "SECOND", matrixRowId: "matrix-row-2", quantity: 2 },
      { sourceComponent: "SECOND", matrixRowId: "matrix-row-3", quantity: 5 },
      { sourceComponent: "FIRST", matrixRowId: "matrix-row-2", quantity: 3 },
      { sourceComponent: "FIRST", matrixRowId: "matrix-row-3", quantity: 6 },
      { sourceComponent: "ALWAYS", matrixRowId: "matrix-row-2", quantity: 4 },
      { sourceComponent: "ALWAYS", matrixRowId: "matrix-row-3", quantity: 7 }
    ]
  );
  assert.deepEqual(
    result.materialTotals.map(({ materialIdentity, quantity }) => ({ materialIdentity, quantity })),
    [
      { materialIdentity: "row:matrix-row-2", quantity: 9 },
      { materialIdentity: "row:matrix-row-3", quantity: 18 }
    ]
  );
  assert.deepEqual(result.missingMaterialPhcs, [
    { matrixRowId: "matrix-row-2", description: "First row" },
    { matrixRowId: "matrix-row-3", description: "Second row" }
  ]);
});
