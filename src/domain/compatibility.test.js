import assert from "node:assert/strict";
import test from "node:test";

import {
  CLEAN_OPEN_COOLING_WATER,
  DIRTY_OPEN_COOLING_WATER,
  isChlorineRowCompatible
} from "./compatibility.js";

const modeledRows = [
  { option: "Completely renamed one", code: "Cl5mA", model: "CS4" },
  { option: "Completely renamed two", code: "Cl5mA", model: "AS2" },
  { option: "Completely renamed three", code: "Cl5mA", model: "AS3" }
];

function compatibleModels(circuitClass, openCoolingWaterType) {
  return modeledRows
    .filter((row) => isChlorineRowCompatible(row, circuitClass, openCoolingWaterType))
    .map((row) => row.model);
}

test("chlorine compatibility uses circuit and chlorine metadata", () => {
  assert.deepEqual(compatibleModels("open_cooling", CLEAN_OPEN_COOLING_WATER), ["CS4"]);
  assert.deepEqual(compatibleModels("open_cooling", DIRTY_OPEN_COOLING_WATER), ["AS2"]);
  assert.deepEqual(compatibleModels("sanitary_hot_water", CLEAN_OPEN_COOLING_WATER), ["AS3"]);
  assert.deepEqual(compatibleModels("general", CLEAN_OPEN_COOLING_WATER), ["CS4"]);
});

test("technical absence and generic chlorine rows are compatible everywhere", () => {
  const absenceRow = { option: "Anything", code: "-", model: "" };
  const genericRow = { option: "Anything else", code: "GENERIC_NEW_CODE", model: "" };
  const contexts = [
    ["open_cooling", CLEAN_OPEN_COOLING_WATER],
    ["open_cooling", DIRTY_OPEN_COOLING_WATER],
    ["sanitary_hot_water", CLEAN_OPEN_COOLING_WATER],
    ["general", CLEAN_OPEN_COOLING_WATER]
  ];

  contexts.forEach(([circuitClass, openCoolingWaterType]) => {
    assert.equal(isChlorineRowCompatible(absenceRow, circuitClass, openCoolingWaterType), true);
    assert.equal(isChlorineRowCompatible(genericRow, circuitClass, openCoolingWaterType), true);
  });
});

test("protected chlorine codes with blank model metadata are incompatible", () => {
  const protectedCodes = ["Cl2mA", "Cl5mA", "Cl10mA", "Cl20mA", "Cl2m0c", "Cl20m0c"];

  protectedCodes.forEach((code) => {
    assert.equal(isChlorineRowCompatible({ option: "Renamed", code, model: "" }, "general"), false);
  });
});
