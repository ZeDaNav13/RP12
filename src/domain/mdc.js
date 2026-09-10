export function normalizeMdcReference(value) {
  return value.replace(/\s+/g, "").replace(/_+/g, "_");
}
