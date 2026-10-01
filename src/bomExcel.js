import * as XLSX from "xlsx";

const XLSX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function workbookRows(model) {
  return [
    ["Material PHC", "Description", "Quantity"],
    ...model.rows.map(({ materialPhc, description, quantity }) => [materialPhc, description, quantity])
  ];
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
