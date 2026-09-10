import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMdcReference, resolveIs2ModelCode } from "./mdc.js";

test("normalizeMdcReference removes whitespace and collapses repeated underscores", () => {
  assert.equal(
    normalizeMdcReference("MDC_iS.CP10___M3 Cl2mA/pH/CD.PT_CF_BDW"),
    "MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW"
  );
});

test("normalizeMdcReference leaves an already-normalized MDC unchanged", () => {
  assert.equal(
    normalizeMdcReference("MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW"),
    "MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW"
  );
});

test("resolveIs2ModelCode uses the selected model row technical code", () => {
  const modelRows = [
    { option: "Renamed model label", code: "CP10" },
    { option: "Sem modelo escolhido", code: "_" }
  ];

  assert.equal(resolveIs2ModelCode(modelRows, "Renamed model label"), "CP10");
  assert.equal(resolveIs2ModelCode(modelRows, "Sem modelo escolhido"), "_");
});
