export function deriveBomStatus({ phcReference, unmappedComponents, missingMaterialPhcs }) {
  const issues = [];

  if (!phcReference) {
    issues.push({
      severity: "warning",
      kind: "phc_not_found",
      message: "PHC reference not found"
    });
  }

  for (const componentCode of unmappedComponents) {
    issues.push({
      severity: "problem",
      kind: "unmapped_component",
      message: `${componentCode} — no material mapping defined`
    });
  }

  for (const material of missingMaterialPhcs) {
    issues.push({
      severity: "problem",
      kind: "missing_material_phc",
      message: `${material.description} (${material.matrixRowId}) — material PHC not found`
    });
  }

  const incomplete = unmappedComponents.length > 0 || missingMaterialPhcs.length > 0;

  return {
    state: incomplete ? "incomplete" : "complete",
    issues,
    exportEligibility: {
      pdf: true,
      excel: true
    }
  };
}
