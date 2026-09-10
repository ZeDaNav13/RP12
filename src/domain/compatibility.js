import { isTechnicalAbsenceRow } from "./options.js";

export const CLEAN_OPEN_COOLING_WATER = "Água Limpa";
export const DIRTY_OPEN_COOLING_WATER = "Água Suja";
export const OPEN_COOLING_WATER_TYPES = [CLEAN_OPEN_COOLING_WATER, DIRTY_OPEN_COOLING_WATER];
const protectedChlorineCodes = new Set(["Cl2mA", "Cl5mA", "Cl10mA", "Cl20mA", "Cl2m0c", "Cl20m0c"]);

function requiredChlorineModel(circuitClass, openCoolingWaterType) {
  if (circuitClass === "open_cooling") {
    return openCoolingWaterType === DIRTY_OPEN_COOLING_WATER ? "AS2" : "CS4";
  }
  if (circuitClass === "sanitary_hot_water") return "AS3";
  return "CS4";
}

export function isChlorineRowCompatible(chlorineRow, circuitClass, openCoolingWaterType) {
  if (isTechnicalAbsenceRow(chlorineRow)) return true;
  if (!chlorineRow?.model) return !protectedChlorineCodes.has(chlorineRow?.code);
  return chlorineRow.model === requiredChlorineModel(circuitClass, openCoolingWaterType);
}
