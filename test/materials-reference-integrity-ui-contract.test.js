import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");
const stylesPath = path.resolve(testDir, "..", "src", "styles.css");

test("MaterialsTool locks only usable calculations and resets their view before editing", async () => {
  const source = await fs.readFile(materialsToolPath, "utf8");

  assert.match(source, /const \[validationMessage, setValidationMessage\] = useState\(""\)/);
  assert.match(source, /const inputRef = useRef\(null\)/);
  assert.match(source, /const hasUsableResult = result !== null && result\.state !== "blocked"/);
  assert.match(source, /ref=\{inputRef\}/);
  assert.match(source, /readOnly=\{hasUsableResult\}/);
  assert.match(
    source,
    /function resetCalculatedView\(\)\s*\{\s*setResult\(null\);\s*setHistoryEvents\(\[\]\);\s*setExportMessage\(""\);\s*setValidationMessage\(""\);\s*\}/
  );
  assert.match(
    source,
    /function editCalculatedReference\(\)\s*\{\s*resetCalculatedView\(\);\s*inputRef\.current\?\.focus\(\);\s*\}/
  );
  assert.match(
    source,
    /function clearCalculatedReference\(\)\s*\{\s*resetCalculatedView\(\);\s*setRawMdc\(""\);\s*inputRef\.current\?\.focus\(\);\s*\}/
  );
  assert.match(
    source,
    /\{!hasUsableResult \? \([\s\S]*?className="primary materialsCalculate"[\s\S]*?>\s*Mostrar Materiais[\s\S]*?: null\}/
  );
  assert.match(
    source,
    /\{hasUsableResult \? \([\s\S]*?<div className="materialsReferenceActions">[\s\S]*?className="primary materialsEdit"[\s\S]*?>Editar[\s\S]*?className="secondary materialsClear"[\s\S]*?>Limpar[\s\S]*?<\/div>[\s\S]*?: null\}/
  );
  assert.doesNotMatch(source, /O resultado está desatualizado\. Calcule novamente antes de exportar\./);
});

test("MaterialsTool keeps calculated-reference actions compact, horizontal, and neutral where appropriate", async () => {
  const styles = await fs.readFile(stylesPath, "utf8");

  assert.match(
    styles,
    /\.materialsReferenceActions\s*\{[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[\s\S]*?gap:\s*8px/
  );
  assert.match(styles, /\.materialsReferenceActions button\s*\{[\s\S]*?width:\s*100%/);
  assert.match(styles, /\.materialsClear\s*\{[\s\S]*?background:\s*var\(--main-white\)[\s\S]*?color:\s*var\(--main-blue\)/);
});

test("MaterialsTool clears a previous calculation when equipment PHC validation blocks", async () => {
  const source = await fs.readFile(materialsToolPath, "utf8");

  assert.match(
    source,
    /if \(nextResult\.state === "blocked"\)\s*\{\s*resetCalculatedView\(\);[\s\S]*?Referência MDC não reconhecida: PHC do equipamento não encontrado\.[\s\S]*?return;\s*\}/
  );
  assert.match(source, /\{validationMessage \? <p className="materialsNotice">\{validationMessage\}<\/p> : null\}/);
  assert.doesNotMatch(source, /historyStore\.(?:clear|remove|reset)/);
});

test("MaterialsTool validates PHC runtime data before enabling calculation", async () => {
  const source = await fs.readFile(materialsToolPath, "utf8");

  assert.match(source, /import \{ createPhcLookup \} from "\.\/domain\/bom-phc\.js";/);
  assert.match(
    source,
    /const \[matrixCsvText, phcCsvText\] = await Promise\.all\(\[\s*matrixResponse\.text\(\),\s*phcResponse\.text\(\)\s*\]\);\s*createPhcLookup\(phcCsvText\);\s*if \(!cancelled\) \{\s*setRuntimeData\(\{ status: "ready", matrixCsvText, phcCsvText \}\);/
  );
  assert.match(source, /catch \{\s*if \(!cancelled\) \{\s*setRuntimeData\(\{ status: "error", matrixCsvText: "", phcCsvText: "" \}\);/);
  assert.match(source, /disabled=\{runtimeData\.status !== "ready"\}/);
});
