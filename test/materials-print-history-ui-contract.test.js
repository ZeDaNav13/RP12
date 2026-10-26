import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");
const stylesPath = path.resolve(testDir, "..", "src", "styles.css");

test("Materials uses browser printing and keeps activity limited to Excel exports", async () => {
  const [materialsSource, stylesSource] = await Promise.all([
    fs.readFile(materialsToolPath, "utf8"),
    fs.readFile(stylesPath, "utf8")
  ]);

  assert.match(materialsSource, /import \{ printMaterialsPdf \} from "\.\/domain\/bom-pdf-workflow\.js";/);
  assert.match(
    materialsSource,
    /function printMaterials\(\)\s*\{\s*if \(!result \|\| !viewState\.canExportPdf\) return;\s*printMaterialsPdf\(\{\s*normalizedMdc: result\.input\.normalizedMdc,\s*documentObject: document,\s*print: \(\) => window\.print\(\)\s*\}\);\s*\}/
  );
  assert.doesNotMatch(materialsSource, /saveBomPdf/);
  assert.doesNotMatch(materialsSource, /requiresConfirmation\([^\n]*"pdf"/);
  assert.doesNotMatch(materialsSource, /recordSuccessfulExport\([^\n]*format:\s*"pdf"/);
  assert.match(materialsSource, /onClick=\{printMaterials\} disabled=\{!viewState\.canExportPdf\}/);
  assert.match(materialsSource, /placeholder="colocar referência MDC aqui"/);
  assert.match(
    materialsSource,
    /<section className="materialsPrintOnly">[\s\S]*?MDC:<\/strong> \{result\.input\.normalizedMdc\}[\s\S]*?PHC do equipamento:<\/strong> \{result\.phc\.reference \?\? "Referência PHC não encontrada"\}[\s\S]*?<table>/
  );
  assert.doesNotMatch(materialsSource, /className="card materialsCard materialsExport"/);
  assert.equal((materialsSource.match(/className="card printActions"/g) ?? []).length, 2);
  assert.match(materialsSource, /const excelHistoryEvents = viewState\.historyEvents\.filter\(\(event\) => event\.format === "excel"\)/);
  assert.match(materialsSource, /excelHistoryEvents\.map\(/);
  assert.match(materialsSource, /exportBomExcel\(/);
  assert.match(stylesSource, /\.materialsPrintOnly\s*\{[\s\S]*display:\s*none/);
  assert.match(stylesSource, /@media print\s*\{[\s\S]*\.screenOnly\s*\{[\s\S]*display:\s*none !important/);
  assert.match(stylesSource, /@media print\s*\{[\s\S]*\.materialsPrintOnly\s*\{[\s\S]*display:\s*block/);
});
