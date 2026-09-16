export function createMaterialsViewState({ rawMdc, result, historyEvents }) {
  if (!result) {
    return {
      isStale: false,
      canExportPdf: false,
      canExportExcel: false,
      componentRows: [],
      totalRows: [],
      historyEvents
    };
  }

  const isBlocked = result.state === "blocked";
  const isStale = rawMdc !== result.input.originalMdc;
  const canExport = !isBlocked && !isStale;

  return {
    isStale,
    canExportPdf: canExport && result.exportEligibility.pdf === true,
    canExportExcel: canExport && result.exportEligibility.excel === true,
    componentRows: isBlocked ? [] : result.contributions,
    totalRows: isBlocked ? [] : result.materialTotals,
    historyEvents
  };
}
