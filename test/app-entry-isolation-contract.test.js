import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = (...segments) => path.resolve(testDir, "..", "src", ...segments);
const selectorAppPath = sourcePath("SelectorApp.jsx");
const materialsAppPath = sourcePath("MaterialsApp.jsx");
const toolHeaderPath = sourcePath("shared", "ToolHeader.jsx");
const styleguidePath = sourcePath("shared", "styleguide.js");
const legacyAppPath = sourcePath("App.jsx");
const selectorEntryPath = path.resolve(testDir, "..", "apps", "selector", "main.jsx");
const materialsEntryPath = path.resolve(testDir, "..", "apps", "lista_materiais", "main.jsx");
const legacyIndexPath = path.resolve(testDir, "..", "index.html");

async function readRequired(filePath) {
  await fs.access(filePath);
  return fs.readFile(filePath, "utf8");
}

function assertDoesNotContain(source, pattern, description) {
  assert.doesNotMatch(source, pattern, description);
}

test("independent app roots isolate Selector and LDM ownership", async () => {
  const [selectorSource, materialsSource, headerSource, styleguideSource, selectorEntrySource, materialsEntrySource] = await Promise.all([
    readRequired(selectorAppPath),
    readRequired(materialsAppPath),
    readRequired(toolHeaderPath),
    readRequired(styleguidePath),
    readRequired(selectorEntryPath),
    readRequired(materialsEntryPath)
  ]);

  assert.match(selectorSource, /export default function SelectorApp\(/);
  assert.match(selectorSource, /document\.title\s*=\s*"Ferramenta MDC - Selector"/);
  assert.match(selectorSource, /const QUESTION_DEFS = \[/);
  assert.match(selectorSource, /function buildUniqueAssemblyCodes\(/);
  assert.match(selectorSource, /import \{ useStyleguide \} from "\.\/shared\/styleguide\.js"/);
  assert.match(selectorSource, /useStyleguide\(\);/);
  assertDoesNotContain(selectorSource, /MaterialsTool|MaterialsApp|workspace|setWorkspace/, "Selector must not own LDM navigation");
  assertDoesNotContain(selectorSource, /materials\/materials_matrix\.csv|phc_integration\.csv/, "Selector must not load LDM runtime data");
  assertDoesNotContain(selectorSource, /DEFAULT_STYLEGUIDE|function applyStyleguide|function loadStyleguide|styleguide\.json/, "Selector must not duplicate styleguide loading");

  assert.match(materialsSource, /import MaterialsTool from "\.\/MaterialsTool\.jsx"/);
  assert.match(materialsSource, /document\.title\s*=\s*"Ferramenta MDC - Materiais"/);
  assert.match(materialsSource, /<MaterialsTool\s*\/>/);
  assert.match(materialsSource, /import \{ useStyleguide \} from "\.\/shared\/styleguide\.js"/);
  assert.match(materialsSource, /useStyleguide\(\);/);
  assertDoesNotContain(materialsSource, /SelectorApp|QUESTION_DEFS|questions\/|workspace|setWorkspace/, "LDM must not own Selector behavior");
  assertDoesNotContain(materialsSource, /DEFAULT_STYLEGUIDE|function applyStyleguide|function loadStyleguide|styleguide\.json/, "LDM must not duplicate styleguide loading");

  assert.match(headerSource, /export default function ToolHeader\(\{ title \}\)/);
  assert.match(headerSource, /\{title\}/);
  assert.match(headerSource, /Logo_iS2-removebg-preview\.png/);
  assertDoesNotContain(headerSource, /<nav|<button|<a\s|href=|onClick=|workspace/, "ToolHeader must remain presentational");
  assertDoesNotContain(headerSource, /fetch\(|styleguide/, "ToolHeader must not load the styleguide");

  assert.match(styleguideSource, /const DEFAULT_STYLEGUIDE = \{/);
  assert.match(styleguideSource, /function applyStyleguide\(/);
  assert.match(styleguideSource, /fetch\(`\$\{import\.meta\.env\.BASE_URL\}styleguide\.json`, \{\s*cache: "no-store"/);
  for (const variableName of [
    "--main-blue",
    "--secondary-dark",
    "--secondary-white",
    "--white",
    "--main-white",
    "--text-color",
    "--print-text",
    "--print-line",
    "--print-bg",
    "--select-arrow-icon"
  ]) {
    assert.match(styleguideSource, new RegExp(variableName));
  }

  assert.match(selectorEntrySource, /import SelectorApp from "\.\.\/\.\.\/src\/SelectorApp\.jsx"/);
  assert.match(selectorEntrySource, /<SelectorApp\s*\/>/);
  assertDoesNotContain(selectorEntrySource, /MaterialsApp|MaterialsTool/, "Selector entry must mount Selector only");
  assert.match(materialsEntrySource, /import MaterialsApp from "\.\.\/\.\.\/src\/MaterialsApp\.jsx"/);
  assert.match(materialsEntrySource, /<MaterialsApp\s*\/>/);
  assertDoesNotContain(materialsEntrySource, /SelectorApp/, "LDM entry must mount LDM only");

  await assert.rejects(fs.access(legacyAppPath), { code: "ENOENT" });
  await assert.rejects(fs.access(legacyIndexPath), { code: "ENOENT" });
  await assert.rejects(fs.access(sourcePath("main.jsx")), { code: "ENOENT" });

  const routingPattern = /window\.history|history\.pushState|history\.replaceState|location\.assign|location\.replace|location\.href|react-router/i;
  for (const [name, source] of [
    ["SelectorApp", selectorSource],
    ["MaterialsApp", materialsSource],
    ["ToolHeader", headerSource],
    ["selector entry", selectorEntrySource],
    ["LDM entry", materialsEntrySource]
  ]) {
    assertDoesNotContain(source, routingPattern, `${name} must not add routing`);
  }
});
