import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const selectorAppPath = path.resolve(testDir, "..", "src", "SelectorApp.jsx");
const materialsAppPath = path.resolve(testDir, "..", "src", "MaterialsApp.jsx");
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");
const componentsPath = path.resolve(testDir, "..", "public", "components", "components.csv");
const toolHeaderPath = path.resolve(testDir, "..", "src", "shared", "ToolHeader.jsx");
const stylesPath = path.resolve(testDir, "..", "src", "styles.css");

const COMPONENT_CODES = [
  "CP10", "CP20", "CP30", "CP40", "CP50", "CP60", "BDP", "BDC",
  "Cl2mA", "Cl5mA", "Cl10mA", "Cl20mA", "Cl2m0c", "Cl20m0c", "pH", "CD",
  "AF", "AQ", "BF", "BQ", "CF", "CQ", "DF", "FF", "BDW"
];

test("Selector and Materiais use independent roots with the approved header and presentation layout", async () => {
  const [selectorSource, materialsAppSource, materialsSource, componentsSource, headerSource, stylesSource] = await Promise.all([
    fs.readFile(selectorAppPath, "utf8"),
    fs.readFile(materialsAppPath, "utf8"),
    fs.readFile(materialsToolPath, "utf8"),
    fs.readFile(componentsPath, "utf8"),
    fs.readFile(toolHeaderPath, "utf8"),
    fs.readFile(stylesPath, "utf8")
  ]);

  assert.match(selectorSource, /const APP_TITLE = "Selector MDC";/);
  assert.match(selectorSource, /<ToolHeader title=\{APP_TITLE\}\s*\/>/);
  assert.match(selectorSource, /document\.title\s*=\s*APP_TITLE/);
  assert.doesNotMatch(selectorSource, /Ferramenta MDC/);
  assert.doesNotMatch(selectorSource, /MaterialsTool|MaterialsApp|workspaceSwitch|workspace|setWorkspace/);
  assert.match(materialsAppSource, /const APP_TITLE = "Lista de Materiais MDC";/);
  assert.match(materialsAppSource, /<ToolHeader title=\{APP_TITLE\}\s*\/>/);
  assert.match(materialsAppSource, /document\.title\s*=\s*APP_TITLE/);
  assert.doesNotMatch(materialsAppSource, /Ferramenta MDC/);
  assert.doesNotMatch(materialsAppSource, /SelectorApp|workspaceSwitch|workspace|setWorkspace|questions\//);
  assert.match(headerSource, /<h1>\{title\}<\/h1>/);
  assert.match(headerSource, /Logo_iS2-removebg-preview\.png/);
  assert.doesNotMatch(headerSource, /<nav|<button|<a\s|href=|onClick=|<p|<h2/);

  assert.match(materialsSource, /<h1>Modelo MdC<\/h1>/);
  assert.match(materialsSource, /className="materialsInputRow"/);
  assert.match(materialsSource, />\s*Mostrar Materiais/);
  assert.match(materialsSource, /className="[^"]*materialsProcessing/);
  assert.match(materialsSource, /<h2>Processamento<\/h2>/);
  assert.match(materialsSource, /className="summaryList"/);
  assert.match(materialsSource, /className="summaryRow"/);
  assert.match(materialsSource, /<h2>Materiais por Componente<\/h2>/);
  assert.match(materialsSource, /<thead><tr><th>PHC<\/th><th>Componente<\/th><th>PHC do material<\/th><th>Descrição<\/th><th>Quantidade<\/th><\/tr><\/thead>/);
  assert.match(materialsSource, /<td><\/td><td>\{row\.sourceComponent\}<\/td><td>\{row\.materialPhc\}<\/td><td>\{row\.description\}<\/td><td>\{row\.quantity\}<\/td>/);
  assert.doesNotMatch(materialsSource, /<td>\{row\.materialPhc\}<\/td><td>\{row\.sourceComponent\}/);
  assert.doesNotMatch(materialsSource, /componentPhc|components\/components\.csv/);
  assert.equal(
    componentsSource,
    `component_code,component_phc\n${COMPONENT_CODES.map((code) => `${code},`).join("\n")}\n`
  );
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
  assert.match(stylesSource, /\.toolHeader\.screenOnly\s*\{[\s\S]*display:\s*flex[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center[\s\S]*flex-wrap:\s*nowrap/);
  assert.match(stylesSource, /\.headerLogo\s*\{[\s\S]*width:\s*var\(--workspace-nav-control-size\)/);
  assert.match(stylesSource, /\.materialsExportActions\s*\{[\s\S]*justify-content:\s*center/);
  assert.doesNotMatch(stylesSource, /\.workspaceSwitch/);
});

test("Materials narrow screens keep the calculation action and technical tables readable", async () => {
  const stylesSource = await fs.readFile(stylesPath, "utf8");
  const narrowBreakpointStart = stylesSource.indexOf("@media (max-width: 900px)");
  const printMediaStart = stylesSource.indexOf("@media print", narrowBreakpointStart);
  const narrowStyles = stylesSource.slice(narrowBreakpointStart, printMediaStart);
  const materialsTableRule = narrowStyles.match(
    /\.materialsComponents table,\s*\.materialsTotals table\s*\{([^}]*)\}/
  )?.[1] ?? "";

  assert.doesNotMatch(narrowStyles, /\.materialsInputRow\s*\{[^}]*flex-direction/);
  assert.match(narrowStyles, /\.materialsCalculate\s*\{[^}]*width:\s*100%/);
  assert.match(narrowStyles, /\.materialsReferenceActions\s*\{[^}]*width:\s*100%/);
  assert.match(narrowStyles, /\.materialsComponents \.tableWrap,\s*\.materialsTotals \.tableWrap\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(materialsTableRule, /min-width:\s*720px/);
  assert.match(materialsTableRule, /width:\s*100%/);
  assert.doesNotMatch(materialsTableRule, /width:\s*max-content/);
  assert.match(materialsTableRule, /max-width:\s*none/);
  assert.match(materialsTableRule, /table-layout:\s*auto/);
  assert.match(narrowStyles, /\.materialsComponents (?:th|td):not\(:nth-child\(4\)\),\s*\.materialsTotals (?:th|td):not\(:nth-child\(2\)\)\s*\{[^}]*word-break:\s*normal/);
  assert.match(narrowStyles, /\.materialsComponents td:nth-child\(4\),\s*\.materialsTotals td:nth-child\(2\)\s*\{[^}]*overflow-wrap:\s*normal/);
});
