import { parseBomCsv } from "./bom-csv.js";

const REQUIRED_HEADERS = ["material_phc", "description", "ALWAYS"];

function invalidMatrix(row, column, message) {
  return {
    ok: false,
    errors: [{ kind: "invalid_matrix", row, column, message }]
  };
}

function parseQuantity(value) {
  if (value === "") return 0;

  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 0) return null;

  return quantity;
}

export function parseMaterialsMatrix(csvText) {
  const records = parseBomCsv(csvText);
  const headers = records[0] ?? [];

  for (let index = 0; index < REQUIRED_HEADERS.length; index += 1) {
    const header = REQUIRED_HEADERS[index];
    if (headers[index] !== header) {
      return invalidMatrix(1, header, "missing required header");
    }
  }

  const headerSet = new Set();
  for (const header of headers) {
    if (!header) return invalidMatrix(1, header, "blank header");
    if (headerSet.has(header)) return invalidMatrix(1, header, "duplicate header");
    headerSet.add(header);
  }

  const componentHeaders = headers.slice(2);
  const materialPhcs = new Set();
  const rows = [];
  const errors = [];

  for (let recordIndex = 1; recordIndex < records.length; recordIndex += 1) {
    const sourceRow = recordIndex + 1;
    const record = records[recordIndex];

    if (record.length !== headers.length) {
      errors.push({
        kind: "invalid_matrix",
        row: sourceRow,
        column: "row",
        message: "mismatched row width"
      });
      continue;
    }

    const [materialPhc, description, ...quantityValues] = record;
    let rowHasErrors = false;

    if (!description) {
      errors.push({
        kind: "invalid_matrix",
        row: sourceRow,
        column: "description",
        message: "blank description"
      });
      rowHasErrors = true;
    }
    if (materialPhc && materialPhcs.has(materialPhc)) {
      errors.push({
        kind: "invalid_matrix",
        row: sourceRow,
        column: "material_phc",
        message: "duplicate material PHC"
      });
      rowHasErrors = true;
    }
    if (materialPhc) materialPhcs.add(materialPhc);

    const quantities = {};
    for (let quantityIndex = 0; quantityIndex < componentHeaders.length; quantityIndex += 1) {
      const componentCode = componentHeaders[quantityIndex];
      const quantity = parseQuantity(quantityValues[quantityIndex]);
      if (quantity === null) {
        errors.push({
          kind: "invalid_matrix",
          row: sourceRow,
          column: componentCode,
          message: "invalid quantity"
        });
        rowHasErrors = true;
      } else {
        quantities[componentCode] = quantity;
      }
    }

    if (!rowHasErrors) {
      rows.push({
        rowId: `matrix-row-${sourceRow}`,
        materialPhc,
        description,
        quantities
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      rows,
      componentCodes: new Set(componentHeaders)
    }
  };
}
