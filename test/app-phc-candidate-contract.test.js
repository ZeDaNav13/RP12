import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "..", "src", "SelectorApp.jsx");

test("Selector PHC lookup passes current selected physical rows to the registry resolver", async () => {
  const source = await fs.readFile(appPath, "utf8");

  assert.match(source, /const selectedModelRow = getOptionRow\(/);
  assert.match(source, /const selectedProbeRows = probeQuestionIds\.map\(/);
  assert.match(source, /getOptionRow\(questionRows, questionId, answers\[questionId\]/);
  assert.match(source, /selectedPumpRows:\s*pumpRows,/);
  assert.match(source, /portaSondasRow,/);
  assert.match(source, /bdwApplies:\s*needsBDW\(questionRows, circuito\),/);
  assert.match(source, /bdwRows:\s*questionRows\[BDW_DEF\.id\] \?\? \[\],/);
  assert.match(
    source,
    /mandatoryAddonRows:\s*getMandatoryAddOns\(questionRows, answers\.is2_modelo\)/
  );
  assert.match(source, /return resolveSelectorPhcReference\(selectorPhcRegistry, \{/);
  assert.doesNotMatch(source, /buildUniqueAssemblyCodes|phcReferenceForIndex|getPhcReference/);
});
