import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");
const appPath = path.resolve(testDir, "..", "src", "App.jsx");

test("Materials workspace presents its user-facing copy in Portuguese", async () => {
  const [materialsSource, appSource] = await Promise.all([
    fs.readFile(materialsToolPath, "utf8"),
    fs.readFile(appPath, "utf8")
  ]);

  assert.match(appSource, /onClick=\{\(\) => setWorkspace\("materials"\)\}[\s\S]*?>\s*Materiais/);
  assert.match(materialsSource, /<h1>Modelo MdC<\/h1>/);
  assert.match(materialsSource, />\s*Mostrar Materiais/);
  assert.match(materialsSource, /<h2>Processamento<\/h2>/);
  assert.match(materialsSource, /className="summaryLabel">MDC normalizado<\/span>/);
  assert.match(materialsSource, /className="summaryLabel">PHC do equipamento<\/span>/);
  assert.match(materialsSource, /className="summaryLabel">Estado<\/span>/);
  assert.match(materialsSource, /formatMaterialState\(result\.state\)/);
  assert.match(materialsSource, /<summary>Detalhes<\/summary>/);
  assert.match(materialsSource, /<h2>Materiais por Componente<\/h2>/);
  assert.match(materialsSource, /<h2>Lista Completa<\/h2>/);
  assert.match(materialsSource, />\s*Imprimir \/ Guardar PDF/);
  assert.match(materialsSource, />\s*Guardar Excel/);
  assert.match(materialsSource, /<h2>Actividade<\/h2>/);
  assert.match(materialsSource, /Não existem exportações anteriores para este MDC\./);
  assert.match(materialsSource, /Formato: \{event\.format\.toUpperCase\(\)\}\{" — "\}Exportado em:/);
  assert.match(materialsSource, /O resultado está desatualizado\. Calcule novamente antes de exportar\./);
  assert.match(materialsSource, /formatMaterialIssue\(issue\)/);
  assert.doesNotMatch(materialsSource, /<li[^>]*>\{issue\.message\}<\/li>/);
});
