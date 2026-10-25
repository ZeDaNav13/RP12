import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseBomCsv } from "../src/domain/bom-csv.js";
import { compositionKey, physicalComponentsForConfiguration } from "../src/domain/equipmentComposition.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");
const registryPath = path.join(rootDir, "public", "selector_phc_registry.csv");
const allReplyPath = path.join(rootDir, "all_reply_combinations_filtered.csv");

function parseCsv(text) {
  const [headers, ...values] = parseBomCsv(text);
  return values.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
}

async function readQuestionRows(filename) {
  const text = await fs.readFile(path.join(rootDir, "public", "questions", filename), "utf8");
  return parseCsv(text);
}

function rowByOption(rows, option, label) {
  const row = rows.find((candidate) => candidate.option === option);
  assert.ok(row, `missing ${label} option: ${option}`);
  return row;
}

function rowByCode(rows, code, label) {
  const row = rows.find((candidate) => candidate.code === code);
  assert.ok(row, `missing ${label} code: ${code}`);
  return row;
}

function referenceNumber(reference) {
  const match = /^534\.iS2(\d{11})$/.exec(reference);
  assert.ok(match, `invalid equipment PHC reference: ${reference}`);
  return Number(match[1]);
}

async function loadQuestionRows() {
  const [models, pumps, chlorine, ph, conductivity, portaSondas, bdw, mandatoryAddons] = await Promise.all([
    readQuestionRows("is2_modelo.csv"),
    readQuestionRows("bomba_biocida_inorganico.csv"),
    readQuestionRows("sonda_cloro.csv"),
    readQuestionRows("sonda_ph.csv"),
    readQuestionRows("sonda_condutividade.csv"),
    readQuestionRows("porta_sondas.csv"),
    readQuestionRows("bdw.csv"),
    readQuestionRows("mandatory_addons.csv")
  ]);

  return { models, pumps, chlorine, ph, conductivity, portaSondas, bdw, mandatoryAddons };
}

function physicalKeyForOutputRow(row, questionRows) {
  const modelRow = rowByOption(questionRows.models, row.is2_modelo_reply, "model");
  const proportionalPump = rowByCode(questionRows.pumps, "BDP", "proportional pump");
  const constantPump = rowByCode(questionRows.pumps, "BDC", "constant pump");
  const chlorineRow = rowByOption(questionRows.chlorine, row.sonda_cloro_reply, "chlorine probe");
  const phRow = rowByOption(questionRows.ph, row.sonda_ph_reply, "pH probe");
  const conductivityRow = rowByOption(
    questionRows.conductivity,
    row.sonda_condutividade_reply,
    "conductivity probe"
  );
  const portaSondasRow = rowByCode(
    questionRows.portaSondas,
    row.porta_sondas_code,
    "porta-sondas"
  );

  return compositionKey(
    physicalComponentsForConfiguration({
      selectedModelRow: modelRow,
      selectedPumpRows: [
        ...Array(Number(row.pump_vms0706_count)).fill(proportionalPump),
        ...Array(Number(row.pump_vcl0706_count)).fill(constantPump)
      ],
      selectedProbeRows: [chlorineRow, phRow, conductivityRow],
      portaSondasRow,
      bdwApplies: row.circuito_bdw_enabled === "1",
      bdwRows: questionRows.bdw,
      mandatoryAddonRows: questionRows.mandatoryAddons
    })
  );
}

function groupRows(rows, property) {
  return rows.reduce((groups, row) => {
    const key = row[property];
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
    return groups;
  }, new Map());
}

test("canonical registry maps every Selector configuration by physical composition", async () => {
  await assert.doesNotReject(
    fs.access(registryPath),
    "public/selector_phc_registry.csv must exist as the canonical composition registry"
  );

  const [registryText, allReplyText, questionRows] = await Promise.all([
    fs.readFile(registryPath, "utf8"),
    fs.readFile(allReplyPath, "utf8"),
    loadQuestionRows()
  ]);
  const [registryHeader] = parseBomCsv(registryText);
  const registryRows = parseCsv(registryText);
  const outputRows = parseCsv(allReplyText);

  assert.deepEqual(registryHeader, ["referencia_phc", "composition_key"]);
  assert.equal(registryRows.length, 7020);
  assert.equal(new Set(registryRows.map((row) => row.referencia_phc)).size, 7020);
  assert.equal(new Set(registryRows.map((row) => row.composition_key)).size, 7020);

  const registryNumbers = registryRows.map((row) => referenceNumber(row.referencia_phc));
  assert.deepEqual(registryNumbers, Array.from({ length: 7020 }, (_, index) => index + 1));
  assert.equal(registryRows[5939].referencia_phc, "534.iS200000005940");
  assert.equal(registryRows[5940].referencia_phc, "534.iS200000005941");
  assert.equal(registryRows.at(-1)?.referencia_phc, "534.iS200000007020");

  assert.equal(outputRows.length, 11700);
  assert.equal(new Set(outputRows.map((row) => row.assembly_code)).size, 5940);
  assert.equal(new Set(outputRows.map((row) => row.referencia_phc)).size, 7020);

  const referenceForComposition = new Map(
    registryRows.map((row) => [row.composition_key, row.referencia_phc])
  );
  outputRows.forEach((row) => {
    const key = physicalKeyForOutputRow(row, questionRows);
    assert.equal(referenceForComposition.get(key), row.referencia_phc, row.assembly_code);
  });
});

test("physical composition permits MDC collisions and reuses identical equipment PHCs", async () => {
  const [registryText, allReplyText, questionRows] = await Promise.all([
    fs.readFile(registryPath, "utf8"),
    fs.readFile(allReplyPath, "utf8"),
    loadQuestionRows()
  ]);
  const referenceForComposition = new Map(
    parseCsv(registryText).map((row) => [row.composition_key, row.referencia_phc])
  );
  const outputRows = parseCsv(allReplyText);

  const chlorineMdcGroups = groupRows(
    outputRows.filter((row) => row.sonda_cloro_code === "Cl5mA"),
    "assembly_code"
  );
  const collision = [...chlorineMdcGroups.values()].find(
    (rows) => new Set(rows.map((row) => row.referencia_phc)).size > 1
  );
  assert.ok(collision, "expected a real Cl5mA MDC collision with distinct physical PHCs");

  const collisionKeys = collision.map((row) => physicalKeyForOutputRow(row, questionRows));
  assert.equal(new Set(collisionKeys).size, new Set(collision.map((row) => row.referencia_phc)).size);
  collision.forEach((row, index) => {
    assert.equal(referenceForComposition.get(collisionKeys[index]), row.referencia_phc);
  });

  const rowsByReference = groupRows(outputRows, "referencia_phc");
  const reuse = [...rowsByReference.values()].find((rows) => rows.length > 1);
  assert.ok(reuse, "expected non-physical Selector contexts to reuse an equipment PHC");
  const reusedKeys = reuse.map((row) => physicalKeyForOutputRow(row, questionRows));
  assert.equal(new Set(reusedKeys).size, 1);

  const bdwRow = outputRows.find((row) => row.circuito_bdw_enabled === "1");
  assert.ok(bdwRow, "expected at least one BDW configuration");
  const bdwComposition = physicalKeyForOutputRow(bdwRow, questionRows);
  assert.match(bdwComposition, /2097\.SC2A2A9:1/);
  assert.match(bdwComposition, /2097\.SR2221U:1/);
  assert.match(bdwComposition, /ELET\.EVC532:1/);
  assert.doesNotMatch(bdwComposition, /Material diverso/);
});
