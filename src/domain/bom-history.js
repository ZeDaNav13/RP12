const EXPORT_FORMATS = new Set(["pdf", "excel"]);

function isStoredEvent(value) {
  return (
    value &&
    typeof value.normalizedMdc === "string" &&
    (typeof value.phcReference === "string" || value.phcReference === null) &&
    EXPORT_FORMATS.has(value.format) &&
    typeof value.exportedAt === "string"
  );
}

export function createBomHistoryStore({ storage, now, key = "rp12-materials-bom-history" }) {
  function readEvents() {
    const storedValue = storage.getItem(key);
    if (!storedValue) return [];

    try {
      const parsedValue = JSON.parse(storedValue);
      return Array.isArray(parsedValue) ? parsedValue.filter(isStoredEvent) : [];
    } catch {
      return [];
    }
  }

  return {
    eventsFor(normalizedMdc) {
      return readEvents().filter((event) => event.normalizedMdc === normalizedMdc);
    },

    requiresConfirmation(normalizedMdc, format) {
      return readEvents().some(
        (event) => event.normalizedMdc === normalizedMdc && event.format === format
      );
    },

    recordSuccessfulExport({ normalizedMdc, phcReference = null, format }) {
      const event = {
        normalizedMdc,
        phcReference,
        format,
        exportedAt: now()
      };
      if (!isStoredEvent(event)) return;

      storage.setItem(key, JSON.stringify([...readEvents(), event]));
    }
  };
}
