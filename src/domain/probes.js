import { isTechnicalAbsenceRow } from "./options.js";

function isSubstantiveProbeRow(row) {
  return Boolean(row) && !isTechnicalAbsenceRow(row);
}

export function requiresPtSuffix(chlorineRow, phRow, conductivityRow) {
  return (
    isSubstantiveProbeRow(phRow) ||
    isSubstantiveProbeRow(conductivityRow) ||
    chlorineRow?.code?.endsWith("m0c") === true
  );
}
