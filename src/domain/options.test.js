import assert from "node:assert/strict";
import test from "node:test";

import {
  isTechnicalAbsenceRow,
  isTechnicalAbsenceSelection,
  sortTechnicalAbsenceLast
} from "./options.js";

test("isTechnicalAbsenceRow uses only the technical absence codes", () => {
  assert.equal(isTechnicalAbsenceRow({ option: "Installed option", code: "-" }), true);
  assert.equal(isTechnicalAbsenceRow({ option: "No model chosen", code: "_" }), true);
  assert.equal(isTechnicalAbsenceRow({ option: "Nenhum special label", code: "REAL" }), false);
  assert.equal(isTechnicalAbsenceRow({ option: "Sem code", code: "" }), false);
  assert.equal(isTechnicalAbsenceRow({ option: "Missing code" }), false);
});

test("isTechnicalAbsenceSelection resolves absence from the selected row technical code", () => {
  const hyphenRows = [
    { option: "Disabled by client", code: "-" },
    { option: "Real option", code: "REAL" }
  ];
  const underscoreRows = [
    { option: "No equipment selected", code: "_" },
    { option: "Model A", code: "CP10" }
  ];
  const misleadingLabelRows = [{ option: "Nenhum special product", code: "REAL" }];

  assert.equal(isTechnicalAbsenceSelection(hyphenRows, "Disabled by client"), true);
  assert.equal(isTechnicalAbsenceSelection(underscoreRows, "No equipment selected"), true);
  assert.equal(isTechnicalAbsenceSelection(misleadingLabelRows, "Nenhum special product"), false);
  assert.equal(isTechnicalAbsenceSelection(hyphenRows, "Unknown selection"), false);
  assert.equal(isTechnicalAbsenceSelection(hyphenRows, ""), false);
});

test("sortTechnicalAbsenceLast moves a renamed hyphen absence row after stable substantive rows", () => {
  const rows = [
    { option: "Primeiro", code: "A" },
    { option: "Installed option", code: "-" },
    { option: "Segundo", code: "B" }
  ];

  const sortedRows = sortTechnicalAbsenceLast(rows);

  assert.deepEqual(
    sortedRows.map((row) => row.code),
    ["A", "B", "-"]
  );
  assert.deepEqual(
    rows.map((row) => row.code),
    ["A", "-", "B"]
  );
});

test("sortTechnicalAbsenceLast moves renamed underscore rows last and keeps absence order stable", () => {
  const rows = [
    { option: "No model chosen", code: "_" },
    { option: "Model A", code: "CP10" },
    { option: "Nenhum special label", code: "REAL" },
    { option: "Installed option", code: "-" },
    { option: "Model B", code: "CP20" }
  ];

  assert.deepEqual(
    sortTechnicalAbsenceLast(rows).map((row) => row.code),
    ["CP10", "REAL", "CP20", "_", "-"]
  );
});
