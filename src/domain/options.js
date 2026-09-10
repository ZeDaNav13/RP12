export function isTechnicalAbsenceRow(row) {
  return row?.code === "-" || row?.code === "_";
}

export function sortTechnicalAbsenceLast(rows) {
  const substantiveRows = [];
  const absenceRows = [];

  rows.forEach((row) => {
    if (isTechnicalAbsenceRow(row)) {
      absenceRows.push(row);
    } else {
      substantiveRows.push(row);
    }
  });

  return [...substantiveRows, ...absenceRows];
}
