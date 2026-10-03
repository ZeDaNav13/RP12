import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");

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
  assert.match(source, /hasUsableResult \? \([\s\S]*?>\s*Editar[\s\S]*?>\s*Limpar/);
  assert.doesNotMatch(source, /O resultado está desatualizado\. Calcule novamente antes de exportar\./);
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
