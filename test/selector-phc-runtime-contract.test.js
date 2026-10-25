import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parseBomCsv } from "../src/domain/bom-csv.js";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");

function parseCsv(text) {
  const [headers, ...values] = parseBomCsv(text);
  return values.map((cells) =>
    Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
  );
}

async function readQuestionRows(filename) {
  return parseCsv(await fs.readFile(path.join(rootDir, "public", "questions", filename), "utf8"));
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

async function registryModule() {
  return import("../src/domain/selectorPhcRegistry.js");
}

async function canonicalSelectionRows() {
  const [models, inorganicPumps, inhibitorPumps, chlorine, ph, conductivity, portaSondas, bdw, addons] =
    await Promise.all([
      readQuestionRows("is2_modelo.csv"),
      readQuestionRows("bomba_biocida_inorganico.csv"),
      readQuestionRows("bomba_inibidor.csv"),
      readQuestionRows("sonda_cloro.csv"),
      readQuestionRows("sonda_ph.csv"),
      readQuestionRows("sonda_condutividade.csv"),
      readQuestionRows("porta_sondas.csv"),
      readQuestionRows("bdw.csv"),
      readQuestionRows("mandatory_addons.csv")
    ]);

  return { models, inorganicPumps, inhibitorPumps, chlorine, ph, conductivity, portaSondas, bdw, addons };
}

test("Selector runtime fetches the composition registry and removes the MDC-index PHC path", async () => {
  const source = await fs.readFile(path.join(rootDir, "src", "SelectorApp.jsx"), "utf8");

  assert.match(source, /selector_phc_registry\.csv/);
  assert.match(source, /resolveSelectorPhcReference/);
  assert.doesNotMatch(source, /phcReferenceForIndex/);
  assert.doesNotMatch(source, /buildUniqueAssemblyCodes/);
  assert.doesNotMatch(source, /getPhcReference/);
});

test("registry parser validates canonical mappings and rejects malformed identity data", async () => {
  const { parseSelectorPhcRegistry } = await registryModule();
  const text = await fs.readFile(path.join(rootDir, "public", "selector_phc_registry.csv"), "utf8");
  const registry = parseSelectorPhcRegistry(text);

  assert.equal(registry.size, 7020);
  assert.equal(
    registry.get(
      "1148.3426314:1|1717.WS102-EC-N:1|1717.WS102-PH-N:1|2097.SC2A2A9:1|2097.SR2221U:1|534.B310CP10:1|534.PSCF:1|ELET.EVC532:1"
    ),
    "534.iS200000000005"
  );
  assert.throws(
    () => parseSelectorPhcRegistry("composition_key,referencia_phc\nkey,534.iS200000000001\n"),
    /header/i
  );
  assert.throws(
    () =>
      parseSelectorPhcRegistry(
        "referencia_phc,composition_key\n534.iS200000000001,key\n534.iS200000000002,key\n"
      ),
    /duplicate composition_key/i
  );
  assert.throws(
    () =>
      parseSelectorPhcRegistry(
        "referencia_phc,composition_key\n534.iS200000000001,one\n534.iS200000000001,two\n"
      ),
    /duplicate referencia_phc/i
  );
  assert.throws(
    () => parseSelectorPhcRegistry("referencia_phc,composition_key\nbad-reference,key\n"),
    /invalid equipment PHC/i
  );
  assert.throws(
    () => parseSelectorPhcRegistry("referencia_phc,composition_key\n,key\n"),
    /blank referencia_phc/i
  );
  assert.throws(
    () => parseSelectorPhcRegistry("referencia_phc,composition_key\n534.iS200000000001,\n"),
    /blank composition_key/i
  );
});

test("real Cl5mA variants resolve by physical composition rather than shared MDC code", async () => {
  const { parseSelectorPhcRegistry, resolveSelectorPhcReference } = await registryModule();
  const rows = await canonicalSelectionRows();
  const registry = parseSelectorPhcRegistry(
    await fs.readFile(path.join(rootDir, "public", "selector_phc_registry.csv"), "utf8")
  );
  const commonSelection = {
    selectedModelRow: rowByOption(rows.models, "CP10", "model"),
    selectedPumpRows: [],
    selectedProbeRows: [
      rowByOption(rows.ph, "pH m0c", "pH probe"),
      rowByOption(rows.conductivity, "Condutividade m0c", "conductivity probe")
    ],
    portaSondasRow: rowByCode(rows.portaSondas, "CF", "porta-sondas"),
    bdwApplies: true,
    bdwRows: rows.bdw,
    mandatoryAddonRows: rows.addons
  };
  const cs4 = rowByOption(rows.chlorine, "Cloro 0-5 mA Reiss CS4", "CS4 chlorine probe");
  const as2 = rowByOption(
    rows.chlorine,
    "Cloro Reiss AS2 mA 0-5/0-1.7 c/RV1",
    "AS2 chlorine probe"
  );

  assert.equal(cs4.code, "Cl5mA");
  assert.equal(as2.code, "Cl5mA");
  assert.notEqual(cs4.phc, as2.phc);

  const cs4Reference = resolveSelectorPhcReference(registry, {
    ...commonSelection,
    selectedProbeRows: [cs4, ...commonSelection.selectedProbeRows]
  });
  const as2Reference = resolveSelectorPhcReference(registry, {
    ...commonSelection,
    selectedProbeRows: [as2, ...commonSelection.selectedProbeRows]
  });

  assert.equal(cs4Reference, "534.iS200000000005");
  assert.equal(as2Reference, "534.iS200000006745");
  assert.notEqual(cs4Reference, as2Reference);
});

test("equivalent pump PHCs from different Selector question positions reuse one equipment PHC", async () => {
  const { parseSelectorPhcRegistry, resolveSelectorPhcReference } = await registryModule();
  const rows = await canonicalSelectionRows();
  const registry = parseSelectorPhcRegistry(
    await fs.readFile(path.join(rootDir, "public", "selector_phc_registry.csv"), "utf8")
  );
  const commonSelection = {
    selectedModelRow: rowByOption(rows.models, "CP10", "model"),
    selectedProbeRows: [rowByOption(rows.ph, "pH m0c", "pH probe")],
    portaSondasRow: rowByCode(rows.portaSondas, "FF", "porta-sondas"),
    bdwApplies: false,
    bdwRows: rows.bdw,
    mandatoryAddonRows: rows.addons
  };
  const inorganicPump = rowByOption(rows.inorganicPumps, "VMS0706", "inorganic pump");
  const inhibitorPump = rowByOption(rows.inhibitorPumps, "VMS0706", "inhibitor pump");

  assert.equal(inorganicPump.phc, inhibitorPump.phc);
  const firstPositionReference = resolveSelectorPhcReference(registry, {
    ...commonSelection,
    selectedPumpRows: [inorganicPump]
  });
  const fourthPositionReference = resolveSelectorPhcReference(registry, {
    ...commonSelection,
    selectedPumpRows: [inhibitorPump]
  });

  assert.notEqual(firstPositionReference, "-");
  assert.equal(firstPositionReference, fourthPositionReference);
});
