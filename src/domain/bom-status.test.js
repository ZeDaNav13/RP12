import assert from "node:assert/strict";
import test from "node:test";

import { calculateBom } from "./bom.js";
import { createPhcLookup } from "./bom-phc.js";

const COMPLETE_MDC = "MDC_iS.CP10_M1Xx_AF";

function phcCsv(rows = []) {
  return [
    "referencia_phc,assembly_code,total_price",
    ...rows.map(({ reference, assemblyCode, price = "999.99" }) => `${reference},${assemblyCode},${price}`)
  ].join("\n");
}

function matrixCsv(componentHeaders, rows) {
  return [
    ["material_phc", "description", "ALWAYS", ...componentHeaders].join(","),
    ...rows.map((row) => row.join(","))
  ].join("\n");
}

function completeMatrixCsv({ includeAq = false, blankMaterialPhc = false } = {}) {
  const componentHeaders = ["CP10", "Xx", "AF", ...(includeAq ? ["AQ"] : [])];
  const quantities = ["0", "1", "2", "3", ...(includeAq ? ["0"] : [])];

  return matrixCsv(componentHeaders, [
    [blankMaterialPhc ? "" : "MAT-CORE", blankMaterialPhc ? "Unreferenced core" : "Core material", ...quantities],
    ["MAT-ALWAYS", "Always material", "0.5", ...componentHeaders.map(() => "0")]
  ]);
}

function calculate({
  rawMdc = COMPLETE_MDC,
  matrixCsvText = completeMatrixCsv(),
  phcCsvText = phcCsv([{ reference: "PHC-001", assemblyCode: COMPLETE_MDC }])
} = {}) {
  return calculateBom({ rawMdc, matrixCsvText, phcCsvText });
}

function issueKinds(result) {
  return result.issues.map((issue) => issue.kind);
}

test("createPhcLookup normalizes registry identities and ignores price", () => {
  const lookup = createPhcLookup(
    phcCsv([{ reference: "PHC-001", assemblyCode: "MDC_iS.CP10___M1 Xx_AF", price: "999.99" }])
  );

  assert.equal(lookup.find(COMPLETE_MDC), "PHC-001");
  assert.equal(lookup.find("MDC_iS.CP20_M1Xx_AF"), null);
});

test("createPhcLookup rejects missing identity headers before normalizing rows", () => {
  assert.throws(
    () => createPhcLookup("referencia_phc,total_price\nPHC-001,999.99"),
    /missing required PHC CSV header: assembly_code/
  );
  assert.throws(
    () => createPhcLookup("assembly_code,total_price\nMDC_iS.CP10_M1Xx_AF,999.99"),
    /missing required PHC CSV header: referencia_phc/
  );
});

test("createPhcLookup rejects an HTML runtime payload before it reaches MDC normalization", () => {
  assert.throws(
    () => createPhcLookup("<!doctype html><html><body>RP12</body></html>"),
    (error) => {
      assert.match(error.message, /missing required PHC CSV header: referencia_phc/);
      assert.doesNotMatch(error.message, /replace/);
      return true;
    }
  );
});

test("createPhcLookup rejects incomplete identity rows before normalizing cells", () => {
  const invalidRows = [
    ["short row", "referencia_phc,assembly_code,total_price\n534.iS200000000001", "assembly_code"],
    ["blank assembly code", "referencia_phc,assembly_code,total_price\n534.iS200000000001,,123", "assembly_code"],
    ["blank PHC reference", "referencia_phc,assembly_code,total_price\n,MDC_iS.CP10_M1Xx_AF,123", "referencia_phc"]
  ];

  for (const [label, csvText, missingField] of invalidRows) {
    assert.throws(
      () => createPhcLookup(csvText),
      (error) => {
        assert.match(error.message, new RegExp(`Invalid PHC CSV row 2: missing required value: ${missingField}`));
        assert.doesNotMatch(error.message, /replace/);
        return true;
      },
      label
    );
  }
});

test("calculateBom returns complete with found PHC and reuses Task 3 material results", () => {
  const rawMdc = " MDC_iS.CP10___M1 Xx_AF ";
  const result = calculate({
    rawMdc,
    phcCsvText: phcCsv([{ reference: "PHC-001", assemblyCode: COMPLETE_MDC }])
  });

  assert.equal(result.state, "complete");
  assert.deepEqual(result.input, { originalMdc: rawMdc, normalizedMdc: COMPLETE_MDC });
  assert.deepEqual(result.phc, { reference: "PHC-001", status: "found" });
  assert.deepEqual(result.parsedComponents, [
    { code: "CP10", count: 1 },
    { code: "Xx", count: 1 },
    { code: "AF", count: 1 }
  ]);
  assert.deepEqual(result.contributions, [
    { sourceComponent: "CP10", sourceCount: 1, materialPhc: "MAT-CORE", matrixRowId: "matrix-row-2", description: "Core material", quantity: 1 },
    { sourceComponent: "Xx", sourceCount: 1, materialPhc: "MAT-CORE", matrixRowId: "matrix-row-2", description: "Core material", quantity: 2 },
    { sourceComponent: "AF", sourceCount: 1, materialPhc: "MAT-CORE", matrixRowId: "matrix-row-2", description: "Core material", quantity: 3 },
    { sourceComponent: "ALWAYS", sourceCount: 1, materialPhc: "MAT-ALWAYS", matrixRowId: "matrix-row-3", description: "Always material", quantity: 0.5 }
  ]);
  assert.deepEqual(result.materialTotals, [
    { materialIdentity: "phc:MAT-CORE", materialPhc: "MAT-CORE", matrixRowId: null, description: "Core material", quantity: 6 },
    { materialIdentity: "phc:MAT-ALWAYS", materialPhc: "MAT-ALWAYS", matrixRowId: null, description: "Always material", quantity: 0.5 }
  ]);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});

test("calculateBom blocks a parseable MDC that is absent from the equipment PHC registry", () => {
  const result = calculate({ phcCsvText: phcCsv() });

  assert.equal(result.state, "blocked");
  assert.deepEqual(result.phc, { reference: null, status: "not_found" });
  assert.deepEqual(result.issues, [
    { severity: "problem", kind: "phc_not_found", message: "PHC reference not found" }
  ]);
  assert.deepEqual(result.parsedComponents, []);
  assert.deepEqual(result.contributions, []);
  assert.deepEqual(result.materialTotals, []);
  assert.deepEqual(result.exportEligibility, { pdf: false, excel: false });
});

test("calculateBom makes an unmapped component incomplete without disabling Excel", () => {
  const rawMdc = "MDC_iS.CP10_M1Xx_AQ";
  const result = calculate({
    rawMdc,
    phcCsvText: phcCsv([{ reference: "PHC-001", assemblyCode: rawMdc }])
  });

  assert.equal(result.state, "incomplete");
  assert.equal(result.issues.filter((issue) => issue.kind === "unmapped_component").length, 1);
  assert.match(result.issues.find((issue) => issue.kind === "unmapped_component").message, /AQ/);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});

test("calculateBom makes blank component quantities incomplete without blocking known contributions", () => {
  const result = calculate({
    matrixCsvText: matrixCsv(["CP10", "Xx", "AF"], [
      ["MAT-CORE", "Core material", "0", "1", "", "3"],
      ["MAT-ALWAYS", "Always material", "0.5", "0", "0", "0"]
    ])
  });

  assert.equal(result.state, "incomplete");
  assert.deepEqual(
    result.contributions.map(({ sourceComponent, quantity }) => ({ sourceComponent, quantity })),
    [
      { sourceComponent: "CP10", quantity: 1 },
      { sourceComponent: "AF", quantity: 3 },
      { sourceComponent: "ALWAYS", quantity: 0.5 }
    ]
  );
  assert.equal(result.issues.some((issue) => issue.kind === "unmapped_component" && issue.message.includes("Xx")), true);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});

test("calculateBom keeps included blank-PHC materials incomplete and Excel-eligible", () => {
  const result = calculate({ matrixCsvText: completeMatrixCsv({ blankMaterialPhc: true }) });

  assert.equal(result.state, "incomplete");
  assert.equal(result.issues.filter((issue) => issue.kind === "missing_material_phc").length, 1);
  assert.match(result.issues.find((issue) => issue.kind === "missing_material_phc").message, /Unreferenced core/);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});

test("calculateBom accumulates mixed non-blocking material problems with a found equipment PHC", () => {
  const result = calculate({
    rawMdc: "MDC_iS.CP10_M1Xx_AQ",
    matrixCsvText: completeMatrixCsv({ blankMaterialPhc: true }),
    phcCsvText: phcCsv([{ reference: "PHC-001", assemblyCode: "MDC_iS.CP10_M1Xx_AQ" }])
  });

  assert.equal(result.state, "incomplete");
  assert.deepEqual(issueKinds(result), ["unmapped_component", "missing_material_phc"]);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});

test("calculateBom blocks malformed MDC without adding a PHC warning", () => {
  const result = calculate({ rawMdc: "MDC_iS.CP10_M2Cl2mA" });

  assert.equal(result.state, "blocked");
  assert.deepEqual(result.input, { originalMdc: "MDC_iS.CP10_M2Cl2mA", normalizedMdc: null });
  assert.deepEqual(result.parsedComponents, []);
  assert.deepEqual(result.contributions, []);
  assert.deepEqual(result.materialTotals, []);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].severity, "problem");
  assert.equal(result.issues[0].kind, "malformed_mdc");
  assert.match(result.issues[0].message, /M2Cl2mA/);
  assert.equal(issueKinds(result).includes("phc_not_found"), false);
  assert.deepEqual(result.exportEligibility, { pdf: false, excel: false });
});

test("calculateBom blocks invalid matrices and retains every validation error", () => {
  const result = calculate({
    matrixCsvText: matrixCsv(["CP10", "Xx", "AF"], [
      ["MAT-1", "Invalid material", "0", "two", "-1", "0"]
    ])
  });

  assert.equal(result.state, "blocked");
  assert.deepEqual(result.parsedComponents, []);
  assert.deepEqual(result.contributions, []);
  assert.deepEqual(result.materialTotals, []);
  assert.deepEqual(
    result.issues.map((issue) => ({ severity: issue.severity, kind: issue.kind })),
    [
      { severity: "problem", kind: "invalid_matrix" },
      { severity: "problem", kind: "invalid_matrix" }
    ]
  );
  assert.match(result.issues[0].message, /row 2.*CP10.*invalid quantity/);
  assert.match(result.issues[1].message, /row 2.*Xx.*invalid quantity/);
  assert.deepEqual(result.exportEligibility, { pdf: false, excel: false });
});
