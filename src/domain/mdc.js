export function normalizeMdcReference(value) {
  return value.replace(/\s+/g, "").replace(/_+/g, "_");
}

export function resolveIs2ModelCode(modelRows, selectedOption) {
  return modelRows.find((row) => row.option === selectedOption)?.code ?? "";
}
