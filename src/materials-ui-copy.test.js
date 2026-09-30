import assert from "node:assert/strict";
import test from "node:test";

import { formatMaterialIssue, formatMaterialState } from "./materials-ui-copy.js";

test("formatMaterialState translates only displayed BOM states", () => {
  assert.equal(formatMaterialState("complete"), "completo");
  assert.equal(formatMaterialState("incomplete"), "incompleto");
  assert.equal(formatMaterialState("blocked"), "bloqueado");
  assert.equal(formatMaterialState("future_state"), "future_state");
});

test("formatMaterialIssue translates known issue kinds while preserving technical context", () => {
  const issues = [
    { kind: "phc_not_found", message: "PHC reference not found" },
    { kind: "unmapped_component", message: "Cl2m0c — no material mapping defined" },
    { kind: "missing_material_phc", message: "Parafuso (matrix-row-2) — material PHC not found" },
    { kind: "malformed_mdc", message: "M2Cl2mA: invalid MDC structure" },
    { kind: "invalid_matrix", message: "row 3, AF: invalid quantity" }
  ];

  assert.deepEqual(issues.map(formatMaterialIssue), [
    "Referência PHC não encontrada",
    "Cl2m0c — sem mapeamento de materiais definido",
    "Parafuso (matrix-row-2) — referência PHC do material não encontrada",
    "M2Cl2mA: estrutura MDC inválida",
    "linha 3, AF: quantidade inválida"
  ]);
  assert.deepEqual(issues, [
    { kind: "phc_not_found", message: "PHC reference not found" },
    { kind: "unmapped_component", message: "Cl2m0c — no material mapping defined" },
    { kind: "missing_material_phc", message: "Parafuso (matrix-row-2) — material PHC not found" },
    { kind: "malformed_mdc", message: "M2Cl2mA: invalid MDC structure" },
    { kind: "invalid_matrix", message: "row 3, AF: invalid quantity" }
  ]);
});

test("formatMaterialIssue keeps unknown future issues visible", () => {
  const issue = { kind: "future_issue", message: "Future technical detail" };

  assert.equal(formatMaterialIssue(issue), "Future technical detail");
});
