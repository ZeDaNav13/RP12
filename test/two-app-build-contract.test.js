import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoPath = (...segments) => path.resolve(testDir, "..", ...segments);

async function readRequired(filePath) {
  await fs.access(filePath);
  return fs.readFile(filePath, "utf8");
}

function assertDoesNotContain(source, pattern, description) {
  assert.doesNotMatch(source, pattern, description);
}

test("two independent Vite app entries have explicit build contracts", async () => {
  const packageJson = JSON.parse(await readRequired(repoPath("package.json")));
  const scripts = packageJson.scripts ?? {};

  for (const scriptName of ["dev:selector", "dev:ldm", "build:selector", "build:ldm", "build"]) {
    assert.ok(scripts[scriptName], `missing ${scriptName} script`);
  }
  assert.match(scripts["dev:selector"], /--mode selector/);
  assert.match(scripts["dev:ldm"], /--mode ldm/);
  assert.match(scripts["build:selector"], /--mode selector/);
  assert.match(scripts["build:ldm"], /--mode ldm/);
  assert.match(scripts.build, /build:selector/);
  assert.match(scripts.build, /build:ldm/);
  assert.equal(scripts.dev, undefined);
  assert.equal(scripts["build:client"], undefined);

  const [selectorHtml, ldmHtml, selectorEntry, ldmEntry, viteSource] = await Promise.all([
    readRequired(repoPath("apps", "selector", "index.html")),
    readRequired(repoPath("apps", "lista_materiais", "index.html")),
    readRequired(repoPath("apps", "selector", "main.jsx")),
    readRequired(repoPath("apps", "lista_materiais", "main.jsx")),
    readRequired(repoPath("vite.config.js"))
  ]);

  assert.match(selectorHtml, /<title>Ferramenta MDC - Selector<\/title>/);
  assert.match(selectorHtml, /<script type="module" src="\.\/main\.jsx"><\/script>/);
  assert.match(ldmHtml, /<title>Ferramenta MDC - Materiais<\/title>/);
  assert.match(ldmHtml, /<script type="module" src="\.\/main\.jsx"><\/script>/);

  assert.match(selectorEntry, /import SelectorApp from "\.\.\/\.\.\/src\/SelectorApp\.jsx"/);
  assert.match(selectorEntry, /import "\.\.\/\.\.\/src\/styles\.css"/);
  assert.match(selectorEntry, /<SelectorApp\s*\/>/);
  assertDoesNotContain(selectorEntry, /MaterialsApp|MaterialsTool/, "Selector entry must own Selector only");
  assert.match(ldmEntry, /import MaterialsApp from "\.\.\/\.\.\/src\/MaterialsApp\.jsx"/);
  assert.match(ldmEntry, /import "\.\.\/\.\.\/src\/styles\.css"/);
  assert.match(ldmEntry, /<MaterialsApp\s*\/>/);
  assertDoesNotContain(ldmEntry, /SelectorApp/, "LDM entry must own LDM only");

  assert.match(viteSource, /const apps = \{[\s\S]*?selector:\s*\{[\s\S]*?ldm:\s*\{/);
  assert.match(viteSource, /const app = apps\[mode\]/);
  assert.match(viteSource, /if \(!app\)/);
  assert.match(viteSource, /root:\s*appRoot/);
  assert.match(viteSource, /function deploymentPrefix\(\)/);
  assert.match(viteSource, /base:\s*`\$\{deploymentPrefix\(\)\}\$\{app\.base\}`/);
  assert.match(viteSource, /publicDir:\s*path\.resolve\(repoRoot, "public"\)/);
  assert.match(viteSource, /allow:\s*\[repoRoot\]/);
  assert.match(viteSource, /outDir:\s*path\.resolve\(repoRoot, app\.outDir\)/);
  assert.match(viteSource, /emptyOutDir:\s*true/);
  assert.match(viteSource, /selector:\s*\{[\s\S]*?base:\s*"\/selector\/"[\s\S]*?outDir:\s*"dist\/selector"/);
  assert.match(viteSource, /ldm:\s*\{[\s\S]*?base:\s*"\/lista_materiais\/"[\s\S]*?outDir:\s*"dist\/lista_materiais"/);
  assertDoesNotContain(viteSource, /\/mdc_tool\//, "Vite app bases must not use the legacy package path");

  await assert.rejects(fs.access(repoPath("index.html")), { code: "ENOENT" });
  await assert.rejects(fs.access(repoPath("src", "main.jsx")), { code: "ENOENT" });
});
