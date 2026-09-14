import { parseBomCsv } from "./bom-csv.js";
import { normalizeMdcReference } from "./mdc.js";

export function createPhcLookup(csvText) {
  const records = parseBomCsv(csvText);
  const headers = records[0];
  const referenceIndex = headers.indexOf("referencia_phc");
  const assemblyCodeIndex = headers.indexOf("assembly_code");
  const referencesByMdc = new Map();

  for (const record of records.slice(1)) {
    referencesByMdc.set(normalizeMdcReference(record[assemblyCodeIndex]), record[referenceIndex]);
  }

  return {
    find(normalizedMdc) {
      return referencesByMdc.get(normalizedMdc) ?? null;
    }
  };
}
