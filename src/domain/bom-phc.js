import { parseBomCsv } from "./bom-csv.js";
import { normalizeMdcReference } from "./mdc.js";

export function createPhcLookup(csvText) {
  const records = parseBomCsv(csvText);
  const headers = records[0] ?? [];
  const referenceIndex = headers.indexOf("referencia_phc");
  const assemblyCodeIndex = headers.indexOf("assembly_code");

  if (referenceIndex === -1) {
    throw new Error("Invalid PHC CSV: missing required PHC CSV header: referencia_phc");
  }
  if (assemblyCodeIndex === -1) {
    throw new Error("Invalid PHC CSV: missing required PHC CSV header: assembly_code");
  }

  const referencesByMdc = new Map();

  for (const [recordIndex, record] of records.slice(1).entries()) {
    const rowNumber = recordIndex + 2;
    const requiredValues = [
      ["referencia_phc", record[referenceIndex]],
      ["assembly_code", record[assemblyCodeIndex]]
    ];

    for (const [header, value] of requiredValues) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new Error(`Invalid PHC CSV row ${rowNumber}: missing required value: ${header}`);
      }
    }

    referencesByMdc.set(normalizeMdcReference(record[assemblyCodeIndex]), record[referenceIndex]);
  }

  return {
    find(normalizedMdc) {
      return referencesByMdc.get(normalizedMdc) ?? null;
    }
  };
}
