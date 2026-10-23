function normalizedPhc(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function canonicalizeComposition(items) {
  const quantitiesByPhc = new Map();

  items.forEach((item) => {
    const phc = normalizedPhc(item?.phc);
    if (!phc) return;

    const quantity = item.quantity ?? 1;
    quantitiesByPhc.set(phc, (quantitiesByPhc.get(phc) ?? 0) + quantity);
  });

  return [...quantitiesByPhc]
    .sort(([firstPhc], [secondPhc]) => (firstPhc < secondPhc ? -1 : firstPhc > secondPhc ? 1 : 0))
    .map(([phc, quantity]) => ({ phc, quantity }));
}

export function compositionKey(items) {
  return canonicalizeComposition(items)
    .map(({ phc, quantity }) => `${phc}:${quantity}`)
    .join("|");
}

export function physicalComponentsForConfiguration({
  selectedModelRow,
  selectedPumpRows = [],
  selectedProbeRows = [],
  portaSondasRow,
  bdwApplies = false,
  bdwRows = [],
  mandatoryAddonRows = []
} = {}) {
  return canonicalizeComposition([
    selectedModelRow,
    ...selectedPumpRows,
    ...selectedProbeRows,
    portaSondasRow,
    ...(bdwApplies ? bdwRows : []),
    ...mandatoryAddonRows
  ]);
}
