import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");

test("MaterialsTool wires the fresh Excel workflow and removes the schema gate", async () => {
  const source = await fs.readFile(materialsToolPath, "utf8");

  assert.match(
    source,
    /import \{ exportBomExcel, materialsExcelFilename \} from "\.\/domain\/bom-excel-workflow\.js";/
  );
  assert.match(source, /async function exportExcel\(\)/);
  assert.match(source, /canExportExcel: viewState\.canExportExcel/);
  assert.match(source, /filename: materialsExcelFilename\(normalizedMdc\)/);
  assert.match(source, /onClick=\{exportExcel\} disabled=\{!viewState\.canExportExcel\}/);
  assert.match(source, />\s*Guardar Excel/);
  assert.doesNotMatch(source, /Client PHC import schema required before Excel export is available\./);
  assert.match(source, /historyStore,/);
  assert.match(source, /confirm: \(\) => window\.confirm\(/);
});
