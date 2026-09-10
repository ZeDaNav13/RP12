import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(testDir, "..");
const chlorineModels = new Set(["CS4", "AS2", "AS3"]);
const protectedChlorineCodes = new Set(["Cl2mA", "Cl5mA", "Cl10mA", "Cl20mA", "Cl2m0c", "Cl20m0c"]);
const circuitClasses = new Set(["open_cooling", "sanitary_hot_water", "general"]);

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
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows };
}

function assertChlorineMetadataContract(rows) {
  rows.forEach((row) => {
    if (row.model) {
      assert.ok(chlorineModels.has(row.model), `invalid chlorine model: ${row.model}`);
    }
    if (row.code === "-") {
      assert.equal(row.model, "", "technical chlorine absence must have a blank model");
    }
    if (protectedChlorineCodes.has(row.code)) {
      assert.ok(row.model, `protected chlorine code ${row.code} requires model metadata`);
      assert.ok(chlorineModels.has(row.model), `invalid model for protected code ${row.code}`);
    }
  });
}

test("chlorine and circuit CSVs provide the technical metadata contract", async () => {
  const chlorine = parseCsv(
    await fs.readFile(path.join(rootDir, "public", "questions", "sonda_cloro.csv"), "utf8")
  );
  const circuits = parseCsv(
    await fs.readFile(path.join(rootDir, "public", "questions", "circuito.csv"), "utf8")
  );

  assert.ok(chlorine.headers.includes("model"));
  assert.ok(circuits.headers.includes("circuit_class"));

  assertChlorineMetadataContract(chlorine.rows);
  assert.doesNotThrow(() =>
    assertChlorineMetadataContract([{ option: "Future generic sensor", code: "GENERIC", model: "" }])
  );

  circuits.rows.forEach((row) => {
    assert.ok(circuitClasses.has(row.circuit_class), `invalid circuit class: ${row.circuit_class}`);
  });
});
