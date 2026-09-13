import assert from "node:assert/strict";
import test from "node:test";

import { buildPumpSegment } from "./pumps.js";

function pumpRow(code, option = code) {
  return { code, option };
}

function pumpRows(proportionalCount, constantCount) {
  return [
    ...Array(proportionalCount).fill(pumpRow("BDP", "Renamed proportional pump")),
    ...Array(constantCount).fill(pumpRow("BDC", "Renamed constant pump")),
    ...Array(4 - proportionalCount - constantCount).fill(
      pumpRow("-", "No pump chosen")
    )
  ];
}

test("buildPumpSegment preserves every legacy BDP/BDC aggregation", () => {
  const cases = [
    [0, 0, "_"],
    [0, 1, "D1BDC"],
    [0, 2, "D2BDC"],
    [0, 3, "D3BDC"],
    [0, 4, "D4BDC"],
    [1, 0, "D1BDP"],
    [1, 1, "D1BDP+1BDC"],
    [1, 2, "D1BDP+2BDC"],
    [1, 3, "D1BDP+3BDC"],
    [2, 0, "D2BDP"],
    [2, 1, "D2BDP+1BDC"],
    [2, 2, "D2BDP+2BDC"],
    [3, 0, "D3BDP"],
    [3, 1, "D3BDP+1BDC"],
    [4, 0, "D4BDP"]
  ];

  cases.forEach(([proportionalCount, constantCount, expected]) => {
    assert.equal(buildPumpSegment(pumpRows(proportionalCount, constantCount)), expected);
  });
});

test("buildPumpSegment is independent of physical pump position", () => {
  const noPump = pumpRow("-", "No pump chosen");
  const proportionalPump = pumpRow("BDP", "Client label A");
  const constantPump = pumpRow("BDC", "Client label B");

  [
    [proportionalPump, constantPump, noPump, noPump],
    [constantPump, proportionalPump, noPump, noPump],
    [noPump, proportionalPump, noPump, constantPump],
    [noPump, noPump, constantPump, proportionalPump]
  ].forEach((rows) => {
    assert.equal(buildPumpSegment(rows), "D1BDP+1BDC");
  });
});

test("buildPumpSegment uses technical codes rather than editable labels", () => {
  assert.equal(
    buildPumpSegment([
      pumpRow("BDC", "A proportional-looking display label"),
      pumpRow("BDP", "Anything customer-facing"),
      pumpRow("-", "An absence label that is not Sem Bombas"),
      pumpRow("BDP", "Another arbitrary label")
    ]),
    "D2BDP+1BDC"
  );
});

test("buildPumpSegment preserves the App's observed handling of unknown technical codes", () => {
  assert.equal(
    buildPumpSegment([
      pumpRow("BDC"),
      pumpRow("ZZZ"),
      pumpRow("BDP"),
      pumpRow("-")
    ]),
    "D1BDP+1BDC+1ZZZ"
  );
});
