import { jsPDF } from "jspdf";

function defaultCreatePdf() {
  return new jsPDF();
}

function addText(pdf, value, y) {
  pdf.text(String(value), 15, y);
  return y + 8;
}

function addMaterialRow(pdf, row, y) {
  pdf.text(String(row.materialPhc), 15, y);
  pdf.text(String(row.description), 60, y);
  pdf.text(String(row.quantity), 165, y);
  return y + 8;
}

function ensurePage(pdf, y) {
  if (y > 275 && typeof pdf.addPage === "function") {
    pdf.addPage();
    return 20;
  }

  return y;
}

export async function saveBomPdf({ model, createPdf = defaultCreatePdf, filename }) {
  const pdf = createPdf();
  let y = 20;

  y = addText(pdf, "BOM Materials Total", y);
  y = addText(pdf, model.normalizedMdc, y);
  y = addText(pdf, model.phcReference ?? "PHC reference not found", y);
  y = addText(pdf, `BOM state: ${model.state}`, y);

  for (const issue of model.issues) {
    y = ensurePage(pdf, y);
    y = addText(pdf, issue.message, y);
  }

  y = ensurePage(pdf, y);
  y = addMaterialRow(pdf, {
    materialPhc: "Material PHC",
    description: "Description",
    quantity: "Quantity"
  }, y);

  for (const row of model.rows) {
    y = ensurePage(pdf, y);
    y = addMaterialRow(pdf, row, y);
  }

  await pdf.save(filename);
}
