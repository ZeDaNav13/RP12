import { isTechnicalAbsenceRow } from "./options.js";

export function buildPumpSegment(pumpRows) {
  const orderedCounts = [];

  pumpRows.forEach((row) => {
    const code = row?.code?.trim() ?? "";
    if (!code || isTechnicalAbsenceRow({ ...row, code })) return;

    const existing = orderedCounts.find((item) => item.code === code);
    if (existing) {
      existing.count += 1;
    } else {
      orderedCounts.push({ code, count: 1 });
    }
  });

  const priority = { BDP: 0, BDC: 1 };
  orderedCounts.sort((left, right) => {
    const leftPriority = priority[left.code] ?? 99;
    const rightPriority = priority[right.code] ?? 99;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.code.localeCompare(right.code);
  });

  return orderedCounts.length > 0
    ? `D${orderedCounts.map((item) => `${item.count}${item.code}`).join("+")}`
    : "_";
}
