function isBlocked(result) {
  return result.state === "blocked";
}

export function assertBomPdfEligible(result) {
  if (isBlocked(result) || result.exportEligibility?.pdf !== true) {
    throw new Error("PDF export is not eligible");
  }
}

export function assertBomExcelEligible(result) {
  if (isBlocked(result) || result.exportEligibility?.excel !== true) {
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
