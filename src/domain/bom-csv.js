export function parseBomCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let hasRowContent = false;

  function finishRow() {
    row.push(field);
    rows.push(row);
    row = [];
    field = "";
    hasRowContent = false;
  }

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = false;
      } else {
        field += character;
      }
      hasRowContent = true;
      continue;
    }

    if (character === '"' && field === "") {
      inQuotes = true;
      hasRowContent = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
      hasRowContent = true;
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      if (hasRowContent) finishRow();
    } else {
      field += character;
      hasRowContent = true;
    }
  }

  if (hasRowContent) finishRow();

  return rows;
}
