import * as XLSX from "xlsx";

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function workbookRows(model) {
  const rows = [
    ["Normalized MDC", model.normalizedMdc],
    ["Equipment PHC", model.phcReference ?? "PHC reference not found"],
    ["BOM Status", model.state]
  ];

  if (model.issues.length > 0) {
    rows.push(["Issues / Warnings"]);
    for (const issue of model.issues) {
      rows.push([issue.message]);
    }
  }

  rows.push([], ["Material PHC", "Description", "Total Qty"]);
  for (const row of model.rows) {
    rows.push([row.materialPhc, row.description, row.quantity]);
  }

  return rows;
}

function downloadWorkbook(bytes, filename) {
  const blob = new Blob([bytes], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createBomExcelWorkbook(model) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(workbookRows(model));
  worksheet["!cols"] = [{ wch: 24 }, { wch: 48 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Materials Total");

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}

export async function saveBomExcel({ model, filename, download = downloadWorkbook }) {
  const bytes = createBomExcelWorkbook(model);
  await download(bytes, filename);
}
