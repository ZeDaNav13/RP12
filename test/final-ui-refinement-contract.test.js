import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "..", "src", "App.jsx");
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");
const stylesPath = path.resolve(testDir, "..", "src", "styles.css");

test("Selector and Materiais share the approved header and presentation layout", async () => {
  const [appSource, materialsSource, stylesSource] = await Promise.all([
    fs.readFile(appPath, "utf8"),
    fs.readFile(materialsToolPath, "utf8"),
    fs.readFile(stylesPath, "utf8")
  ]);

  assert.match(appSource, /<h1>Ferramenta MdC<\/h1>/);
  assert.match(
    appSource,
    /<nav className="workspaceSwitch screenOnly"[\s\S]*?>[\s\S]*?>\s*Selector[\s\S]*?<img className="headerLogo"[\s\S]*?>\s*Materiais/
  );
  assert.match(appSource, /aria-current=\{workspace === "selector" \? "page" : undefined\}/);
  assert.match(appSource, /aria-current=\{workspace === "materials" \? "page" : undefined\}/);
  assert.match(appSource, /onClick=\{\(\) => setWorkspace\("selector"\)\}/);
  assert.match(appSource, /onClick=\{\(\) => setWorkspace\("materials"\)\}/);
  assert.match(
    appSource,
    /useEffect\(\(\) => \{\s*document\.title = workspace === "materials"\s*\? "Ferramenta MDC - Materiais"\s*:\s*"Ferramenta MDC - Selector";\s*\}, \[workspace\]\);/
  );
  assert.doesNotMatch(appSource, /window\.history|history\.pushState|history\.replaceState|location\.(assign|replace|href)/);

  assert.match(materialsSource, /<h1>Modelo MdC<\/h1>/);
  assert.match(materialsSource, /className="materialsInputRow"/);
  assert.match(materialsSource, />\s*Mostrar Materiais/);
  assert.match(materialsSource, /className="[^"]*materialsProcessing/);
  assert.match(materialsSource, /<h2>Processamento<\/h2>/);
  assert.match(materialsSource, /className="summaryList"/);
  assert.match(materialsSource, /className="summaryRow"/);
  assert.match(materialsSource, /<h2>Materiais por Componente<\/h2>/);
  assert.match(materialsSource, /<h2>Lista Completa<\/h2>/);
  assert.match(materialsSource, />\s*Imprimir \/ Guardar PDF/);
  assert.match(materialsSource, />\s*Guardar Excel/);
  assert.match(materialsSource, /<h2>Actividade<\/h2>/);
  assert.match(materialsSource, /className="materialsExportActions"/);
  assert.match(materialsSource, /formatMaterialIssue\(issue\)/);
  assert.match(materialsSource, /<summary>Detalhes<\/summary>/);
  assert.match(materialsSource, /onClick=\{printMaterials\} disabled=\{!viewState\.canExportPdf\}/);
  assert.match(materialsSource, /onClick=\{exportExcel\} disabled=\{!viewState\.canExportExcel\}/);

  assert.match(stylesSource, /\.materialsInputRow\s*\{[\s\S]*display:\s*flex/);
  assert.match(stylesSource, /--workspace-nav-control-size:\s*72px/);
  assert.match(stylesSource, /\.workspaceSwitch button\s*\{[\s\S]*min-height:\s*var\(--workspace-nav-control-size\)/);
  assert.match(stylesSource, /\.headerLogo\s*\{[\s\S]*width:\s*var\(--workspace-nav-control-size\)/);
  assert.match(stylesSource, /\.materialsExportActions\s*\{[\s\S]*justify-content:\s*center/);
  assert.match(
    stylesSource,
    /@media \(max-width: 900px\)\s*\{[\s\S]*?\.workspaceSwitch\s*\{[\s\S]*?grid-template-areas:\s*[\s\S]*?"logo logo"[\s\S]*?"selector materials"/
  );
});

test("Materials narrow screens keep the calculation action and technical tables readable", async () => {
  const stylesSource = await fs.readFile(stylesPath, "utf8");
  const narrowBreakpointStart = stylesSource.indexOf("@media (max-width: 900px)");
  const printMediaStart = stylesSource.indexOf("@media print", narrowBreakpointStart);
  const narrowStyles = stylesSource.slice(narrowBreakpointStart, printMediaStart);
  const materialsTableRule = narrowStyles.match(
    /\.materialsComponents table,\s*\.materialsTotals table\s*\{([^}]*)\}/
  )?.[1] ?? "";

  assert.match(narrowStyles, /\.materialsInputRow\s*\{[^}]*flex-direction:\s*column/);
  assert.match(narrowStyles, /\.materialsCalculate\s*\{[^}]*width:\s*100%/);
  assert.match(narrowStyles, /\.materialsComponents \.tableWrap,\s*\.materialsTotals \.tableWrap\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(materialsTableRule, /min-width:\s*720px/);
  assert.match(materialsTableRule, /width:\s*100%/);
  assert.doesNotMatch(materialsTableRule, /width:\s*max-content/);
  assert.match(materialsTableRule, /max-width:\s*none/);
  assert.match(materialsTableRule, /table-layout:\s*auto/);
  assert.match(narrowStyles, /\.materialsComponents (?:th|td):not\(:nth-child\(3\)\),\s*\.materialsTotals (?:th|td):not\(:nth-child\(2\)\)\s*\{[^}]*word-break:\s*normal/);
  assert.match(narrowStyles, /\.materialsComponents td:nth-child\(3\),\s*\.materialsTotals td:nth-child\(2\)\s*\{[^}]*overflow-wrap:\s*normal/);
});
