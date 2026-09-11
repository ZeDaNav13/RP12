import assert from "node:assert/strict";
import test from "node:test";

import { requiresPtSuffix } from "./probes.js";

test("chlorine technical m0c codes require the PT suffix", () => {
  assert.equal(
    requiresPtSuffix({ option: "Arbitrary renamed label", code: "Cl2m0c" }),
    true
  );
  assert.equal(
    requiresPtSuffix({ option: "Another arbitrary label", code: "Cl20m0c" }),
    true
  );
  assert.equal(requiresPtSuffix({ option: "Anything", code: "GENERICm0c" }), true);
});

test("chlorine labels do not determine the PT suffix", () => {
  assert.equal(
    requiresPtSuffix({ option: "Label containing m0c to mislead code", code: "Cl5mA" }),
    false
  );
  assert.equal(requiresPtSuffix({ option: "Whatever", code: "-" }), false);
});

test("substantive pH or conductivity requires the PT suffix", () => {
  assert.equal(requiresPtSuffix(undefined, { option: "Renamed", code: "pH" }), true);
  assert.equal(requiresPtSuffix(undefined, undefined, { option: "Renamed", code: "CD" }), true);
  assert.equal(
    requiresPtSuffix(undefined, { option: "Renamed", code: "pH" }, { option: "Renamed", code: "CD" }),
    true
  );
});

test("technical absences and missing probe rows do not require the PT suffix", () => {
  assert.equal(requiresPtSuffix({ code: "-" }, { code: "_" }, { code: "-" }), false);
  assert.equal(requiresPtSuffix(), false);
});
