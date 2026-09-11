import assert from "node:assert/strict";
import test from "node:test";

import { requiresPtSuffix, resolvePortaSondasSuffix } from "./probes.js";

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

test("AS3 chlorine metadata resolves the porta-sondas Q suffix", () => {
  assert.equal(
    resolvePortaSondasSuffix({
      option: "Completely renamed chlorine",
      code: "Cl5mA",
      model: "AS3"
    }),
    "Q"
  );
  assert.equal(
    resolvePortaSondasSuffix({ option: "Another renamed chlorine", code: "Cl2m0c", model: "AS3" }),
    "Q"
  );
});

test("only substantive AS3 chlorine metadata resolves the porta-sondas Q suffix", () => {
  assert.equal(
    resolvePortaSondasSuffix({ option: "AS3 chlorine-looking label", code: "Cl5mA", model: "CS4" }),
    "F"
  );
  assert.equal(resolvePortaSondasSuffix({ code: "Cl5mA", model: "AS2" }), "F");
  assert.equal(resolvePortaSondasSuffix({ code: "GENERIC_NEW_CODE", model: "" }), "F");
  assert.equal(resolvePortaSondasSuffix({ code: "-", model: "" }), "F");
  assert.equal(resolvePortaSondasSuffix({ code: "-", model: "AS3" }), "F");
  assert.equal(resolvePortaSondasSuffix(), "F");
  assert.equal(resolvePortaSondasSuffix({ code: "GENERIC", model: "UNKNOWN" }), "F");
});
