function hasNonblankMaterialPhc(row) {
  return typeof row.materialPhc === "string" && row.materialPhc.trim().length > 0;
}

function isBlocked(result) {
  return result.state === "blocked";
}

export function assertBomPdfEligible(result) {
  if (isBlocked(result) || result.exportEligibility?.pdf !== true) {
    throw new Error("PDF export is not eligible");
  }
}

export function assertBomExcelEligible(result) {
  if (isBlocked(result)) {
    throw new Error("Excel export is not eligible");
  }

  if (result.materialTotals.some((row) => !hasNonblankMaterialPhc(row))) {
    throw new Error("Excel export requires a material PHC for every included material");
  }

  const hasUnsupportedProblem = result.issues.some(
    (issue) => issue.severity === "problem" && issue.kind !== "unmapped_component"
  );
  if (hasUnsupportedProblem) {
    throw new Error("Excel export is not eligible");
  }
}

export function createBomExportModel(result) {
  assertBomPdfEligible(result);

  return {
    normalizedMdc: result.input.normalizedMdc,
    phcReference: result.phc.reference,
    state: result.state,
    issues: result.issues,
    rows: result.materialTotals.map(({ materialPhc, description, quantity }) => ({
      materialPhc,
      description,
      quantity
    }))
  };
}
