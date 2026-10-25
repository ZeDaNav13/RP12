import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { normalizeMdcReference } from "../src/domain/mdc.js";

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
  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });

  return { headers, rows };
}

async function readCanonicalCsv(filename) {
  const csv = await fs.readFile(path.join(rootDir, filename), "utf8");
  return parseCsv(csv);
}

function assertIdentityColumns(headers, filename) {
  assert.ok(headers.includes("referencia_phc"), `${filename} must include referencia_phc`);
  assert.ok(headers.includes("assembly_code"), `${filename} must include assembly_code`);
}

test("historical MDC references retain their permanent PHC identities", async () => {
  const historical = await readCanonicalCsv("phc_integration.csv");
  const current = await readCanonicalCsv("all_reply_combinations_filtered.csv");

  assertIdentityColumns(historical.headers, "phc_integration.csv");
  assertIdentityColumns(current.headers, "all_reply_combinations_filtered.csv");
  assert.equal(historical.rows.length, 5940);
  assert.equal(current.rows.length, 11700);

  const historicalByMdc = new Map();
  const historicalPhcReferences = new Set();

  for (const row of historical.rows) {
    const mdc = normalizeMdcReference(row.assembly_code);
    const phcReference = row.referencia_phc;

    assert.equal(
      historicalByMdc.has(mdc),
      false,
      `duplicate normalized MDC reference in historical registry: ${mdc}`
    );
    assert.equal(
      historicalPhcReferences.has(phcReference),
      false,
      `duplicate PHC reference in historical registry: ${phcReference}`
    );

    historicalByMdc.set(mdc, phcReference);
    historicalPhcReferences.add(phcReference);
  }

  assert.equal(historicalByMdc.size, 5940);
  assert.equal(historicalPhcReferences.size, 5940);

  const currentReferencesByMdc = new Map();
  const missingMappings = [];

  for (const row of current.rows) {
    const mdc = normalizeMdcReference(row.assembly_code);
    const historicalPhcReference = historicalByMdc.get(mdc);
    const references = currentReferencesByMdc.get(mdc) ?? new Set();
    references.add(row.referencia_phc);
    currentReferencesByMdc.set(mdc, references);

    if (historicalPhcReference === undefined) {
      missingMappings.push(mdc);
    }
  }

  const missingHistoricalMappings = [...historicalByMdc.entries()].filter(
    ([mdc, phcReference]) => !currentReferencesByMdc.get(mdc)?.has(phcReference)
  );

  assert.equal(currentReferencesByMdc.size, 5940);
  assert.equal(missingMappings.length, 0, `missing historical mappings: ${missingMappings.length}`);
  assert.equal(
    missingHistoricalMappings.length,
    0,
    `historical mappings missing from current combinations: ${missingHistoricalMappings.length}`
  );
});
