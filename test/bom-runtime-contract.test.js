import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { calculateBom } from "../src/domain/bom.js";

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDirectory, "fixtures", "bom");
const matrixFixturePath = path.join(fixtureDirectory, "materials_matrix.csv");
const phcFixturePath = path.join(fixtureDirectory, "phc_integration.csv");
const REPRESENTATIVE_MDC = "MDC_iS.CP10_D2BDP+1BDC_M3Cl2mA/pH/CD.PT_CF_BDW";

async function fixtureExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readFixtures() {
  assert.equal(await fixtureExists(matrixFixturePath), true, "Task 5 materials matrix fixture must exist");
  assert.equal(await fixtureExists(phcFixturePath), true, "Task 5 PHC fixture must exist");

  return {
    matrixCsvText: await readFile(matrixFixturePath, "utf8"),
    phcCsvText: await readFile(phcFixturePath, "utf8")
  };
}

test("representative runtime BOM preserves calculation, PHC, ordering, and blank-PHC eligibility", async () => {
  const fixtures = await readFixtures();
  const result = calculateBom({ rawMdc: REPRESENTATIVE_MDC, ...fixtures });

  assert.equal(result.state, "incomplete");
  assert.deepEqual(result.input, {
    originalMdc: REPRESENTATIVE_MDC,
    normalizedMdc: REPRESENTATIVE_MDC
  });
  assert.deepEqual(result.phc, { reference: "PHC-REP-001", status: "found" });
  assert.deepEqual(result.parsedComponents, [
    { code: "CP10", count: 1 },
    { code: "BDP", count: 2 },
    { code: "BDC", count: 1 },
    { code: "Cl2mA", count: 1 },
    { code: "pH", count: 1 },
    { code: "CD", count: 1 },
    { code: "CF", count: 1 },
    { code: "BDW", count: 1 }
  ]);
  assert.deepEqual(result.contributions, [
    { sourceComponent: "CP10", sourceCount: 1, materialPhc: "MAT-M5", matrixRowId: "matrix-row-2", description: "M5 screw", quantity: 4 },
    { sourceComponent: "BDP", sourceCount: 2, materialPhc: "MAT-M5", matrixRowId: "matrix-row-2", description: "M5 screw", quantity: 4 },
    { sourceComponent: "BDC", sourceCount: 1, materialPhc: "MAT-M5", matrixRowId: "matrix-row-2", description: "M5 screw", quantity: 2 },
    { sourceComponent: "CF", sourceCount: 1, materialPhc: "", matrixRowId: "matrix-row-3", description: "CF clamp", quantity: 2 },
    { sourceComponent: "BDW", sourceCount: 1, materialPhc: "MAT-BDW", matrixRowId: "matrix-row-4", description: "BDW valve", quantity: 1 },
    { sourceComponent: "ALWAYS", sourceCount: 1, materialPhc: "MAT-ALWAYS", matrixRowId: "matrix-row-5", description: "Assembly bracket", quantity: 1 }
  ]);
  assert.deepEqual(result.materialTotals, [
    { materialIdentity: "phc:MAT-M5", materialPhc: "MAT-M5", matrixRowId: null, description: "M5 screw", quantity: 10 },
    { materialIdentity: "row:matrix-row-3", materialPhc: "", matrixRowId: "matrix-row-3", description: "CF clamp", quantity: 2 },
    { materialIdentity: "phc:MAT-BDW", materialPhc: "MAT-BDW", matrixRowId: null, description: "BDW valve", quantity: 1 },
    { materialIdentity: "phc:MAT-ALWAYS", materialPhc: "MAT-ALWAYS", matrixRowId: null, description: "Assembly bracket", quantity: 1 }
  ]);
  assert.deepEqual(result.issues.map((issue) => issue.kind), [
    "unmapped_component",
    "unmapped_component",
    "unmapped_component",
    "missing_material_phc"
  ]);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});

test("AQ remains parse-valid and incomplete when its matrix column is absent", async () => {
  const fixtures = await readFixtures();
  const result = calculateBom({ rawMdc: "MDC_iS.CP10_M1Xx_AQ", ...fixtures });

  assert.equal(result.state, "incomplete");
  assert.deepEqual(result.phc, { reference: "PHC-AQ-001", status: "found" });
  assert.deepEqual(result.parsedComponents, [
    { code: "CP10", count: 1 },
    { code: "Xx", count: 1 },
    { code: "AQ", count: 1 }
  ]);
  assert.deepEqual(result.issues, [
    { severity: "problem", kind: "unmapped_component", message: "AQ — no material mapping defined" }
  ]);
  assert.deepEqual(result.exportEligibility, { pdf: true, excel: true });
});
