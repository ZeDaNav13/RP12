import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function renameCsvOption(text, currentOption, renamedOption) {
  let renamed = false;
  const lines = text.split(/\r?\n/).map((line, index) => {
    if (index > 0 && line.startsWith(`${currentOption},`)) {
      renamed = true;
      return `${renamedOption}${line.slice(currentOption.length)}`;
    }
    return line;
  });

  assert.equal(renamed, true, `missing fixture option: ${currentOption}`);
  return lines.join("\n");
}

function technicalIdentities(rows) {
  return rows.map((row) => ({
    referencia_phc: row.referencia_phc,
    is2_modelo_code: row.is2_modelo_code,
    pump_combo_code: row.pump_combo_code,
    pump_segment: row.pump_segment,
    sonda_cloro_code: row.sonda_cloro_code,
    sonda_ph_code: row.sonda_ph_code,
    sonda_condutividade_code: row.sonda_condutividade_code,
    circuito_reply: row.circuito_reply,
    circuito_agua_tipo: row.circuito_agua_tipo,
    porta_sondas_code: row.porta_sondas_code,
    bdw_code: row.bdw_code,
    assembly_code: row.assembly_code
  }));
}

async function createGeneratorFixture() {
  const fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), "rp12-generator-"));

  await fs.mkdir(path.join(fixtureRoot, "scripts"), { recursive: true });
  await fs.mkdir(path.join(fixtureRoot, "src", "domain"), { recursive: true });
  await fs.copyFile(
    path.join(rootDir, "scripts", "generate-combinations.mjs"),
    path.join(fixtureRoot, "scripts", "generate-combinations.mjs")
  );
  await fs.copyFile(
    path.join(rootDir, "src", "domain", "options.js"),
    path.join(fixtureRoot, "src", "domain", "options.js")
  );
  await fs.copyFile(
    path.join(rootDir, "src", "domain", "mdc.js"),
    path.join(fixtureRoot, "src", "domain", "mdc.js")
  );
  await fs.cp(path.join(rootDir, "public", "questions"), path.join(fixtureRoot, "public", "questions"), {
    recursive: true
  });

  return fixtureRoot;
}

async function renameFixtureOption(fixtureRoot, filename, currentOption, renamedOption) {
  const csvPath = path.join(fixtureRoot, "public", "questions", filename);
  const csv = await fs.readFile(csvPath, "utf8");
  await fs.writeFile(csvPath, renameCsvOption(csv, currentOption, renamedOption), "utf8");
}

test("generator keeps technical identities when editable absence and model labels change", async (context) => {
  const fixtureRoot = await createGeneratorFixture();
  context.after(() => fs.rm(fixtureRoot, { recursive: true, force: true }));

  await renameFixtureOption(fixtureRoot, "is2_modelo.csv", "CP10", "Sem modelo técnico CP10");
  await renameFixtureOption(fixtureRoot, "is2_modelo.csv", "Nenhum", "No equipment selected");
  await renameFixtureOption(fixtureRoot, "sonda_cloro.csv", "Sem sonda de cloro", "Chlorine probe disabled");

  await execFileAsync(process.execPath, ["scripts/generate-combinations.mjs"], { cwd: fixtureRoot });

  const canonicalRows = parseCsv(await fs.readFile(path.join(rootDir, "all_reply_combinations_filtered.csv"), "utf8"));
  const fixtureRows = parseCsv(await fs.readFile(path.join(fixtureRoot, "all_reply_combinations_filtered.csv"), "utf8"));

  assert.ok(
    fixtureRows.some(
      (row) =>
        row.is2_modelo_reply === "Sem modelo técnico CP10" &&
        row.is2_modelo_code === "CP10" &&
        row.assembly_code.includes("MDC_iS.CP10")
    )
  );
  assert.equal(
    fixtureRows.some((row) => row.is2_modelo_reply === "No equipment selected"),
    false
  );
  assert.ok(
    fixtureRows.some(
      (row) => row.sonda_cloro_reply === "Chlorine probe disabled" && row.sonda_cloro_code === "-"
    )
  );
  assert.deepEqual(technicalIdentities(fixtureRows), technicalIdentities(canonicalRows));
});
