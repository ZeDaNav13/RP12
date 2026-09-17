import { saveBomExcel } from "../bomExcel.js";
import { assertBomExcelEligible, createBomExportModel } from "./bom-export.js";

export function materialsExcelFilename(normalizedMdc) {
  return `materials_${normalizedMdc.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")}.xlsx`;
}

export async function exportBomExcel({
  result,
  canExportExcel,
  historyStore,
  confirm,
  filename,
  saveExcel = saveBomExcel
}) {
  if (!result || !canExportExcel) {
    return { exported: false };
  }

  const normalizedMdc = result.input.normalizedMdc;
  if (historyStore.requiresConfirmation(normalizedMdc, "excel") && !confirm()) {
    return { exported: false };
  }

  assertBomExcelEligible(result);
  const model = createBomExportModel(result);
  await saveExcel({ model, filename });
  historyStore.recordSuccessfulExport({
    normalizedMdc,
    phcReference: model.phcReference,
    format: "excel"
  });

  return {
    exported: true,
    historyEvents: historyStore.eventsFor(normalizedMdc)
  };
}
