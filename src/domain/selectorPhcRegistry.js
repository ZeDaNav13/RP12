import { parseBomCsv } from "./bom-csv.js";
import { compositionKey, physicalComponentsForConfiguration } from "./equipmentComposition.js";

const EQUIPMENT_PHC_PATTERN = /^534\.iS2\d{11}$/;
const REGISTRY_HEADERS = ["referencia_phc", "composition_key"];

export function parseSelectorPhcRegistry(text) {
  const [headers, ...rows] = parseBomCsv(text);
  if (
    headers.length !== REGISTRY_HEADERS.length ||
    headers.some((header, index) => header !== REGISTRY_HEADERS[index])
  ) {
    throw new Error("Invalid selector PHC registry header");
  }

  const registryByComposition = new Map();
  const compositionsByReference = new Map();

  rows.forEach((cells) => {
    if (cells.length !== REGISTRY_HEADERS.length) {
      throw new Error("Invalid selector PHC registry row");
    }

    const [referencia_phc = "", composition_key = ""] = cells.map((value) => value.trim());
    if (!referencia_phc) {
      throw new Error("Blank referencia_phc in selector PHC registry");
    }
    if (!composition_key) {
      throw new Error("Blank composition_key in selector PHC registry");
    }
    if (!EQUIPMENT_PHC_PATTERN.test(referencia_phc)) {
      throw new Error(`Invalid equipment PHC reference: ${referencia_phc}`);
    }
    if (compositionsByReference.has(referencia_phc)) {
      throw new Error(`Duplicate referencia_phc in selector PHC registry: ${referencia_phc}`);
    }
    if (registryByComposition.has(composition_key)) {
      throw new Error(`Duplicate composition_key in selector PHC registry: ${composition_key}`);
    }

    compositionsByReference.set(referencia_phc, composition_key);
    registryByComposition.set(composition_key, referencia_phc);
  });

  return registryByComposition;
}

export function resolveSelectorPhcReference(registryByComposition, configuration) {
  const physicalComponents = physicalComponentsForConfiguration(configuration);
  return registryByComposition.get(compositionKey(physicalComponents)) ?? "-";
}
