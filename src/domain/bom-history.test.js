import assert from "node:assert/strict";
import test from "node:test";

import { createBomHistoryStore } from "./bom-history.js";

const MDC_A = "MDC_iS.CP10_M1Xx_AF";
const MDC_B = "MDC_iS.CP20_M1Xx_AF";

function createMemoryStorage(initialValue = null) {
  const values = new Map(initialValue === null ? [] : [["rp12-materials-bom-history", initialValue]]);
  const setCalls = [];

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      setCalls.push({ key, value });
      values.set(key, value);
    },
    setCalls
  };
}

test("returns empty history without writing while reading or previewing", () => {
  const storage = createMemoryStorage();
  const history = createBomHistoryStore({ storage, now: () => "2026-09-15T10:00:00.000Z" });

  assert.deepEqual(history.eventsFor(MDC_A), []);
  assert.equal(history.requiresConfirmation(MDC_A, "pdf"), false);
  assert.equal(history.requiresConfirmation(MDC_A, "excel"), false);
  assert.equal(storage.setCalls.length, 0);
});

test("records successful PDF and Excel exports as independent timestamped events", () => {
  const storage = createMemoryStorage();
  const timestamps = ["2026-09-15T10:00:00.000Z", "2026-09-15T11:00:00.000Z"];
  const history = createBomHistoryStore({ storage, now: () => timestamps.shift() });

  history.recordSuccessfulExport({ normalizedMdc: MDC_A, phcReference: "PHC-001", format: "pdf" });
  assert.equal(history.requiresConfirmation(MDC_A, "pdf"), true);
  assert.equal(history.requiresConfirmation(MDC_A, "excel"), false);

  history.recordSuccessfulExport({ normalizedMdc: MDC_A, phcReference: null, format: "excel" });
  assert.deepEqual(history.eventsFor(MDC_A), [
    { normalizedMdc: MDC_A, phcReference: "PHC-001", format: "pdf", exportedAt: "2026-09-15T10:00:00.000Z" },
    { normalizedMdc: MDC_A, phcReference: null, format: "excel", exportedAt: "2026-09-15T11:00:00.000Z" }
  ]);
  assert.equal(history.requiresConfirmation(MDC_A, "pdf"), true);
  assert.equal(history.requiresConfirmation(MDC_A, "excel"), true);
  assert.equal(storage.setCalls.length, 2);
});

test("records an omitted PHC reference as null", () => {
  const storage = createMemoryStorage();
  const history = createBomHistoryStore({ storage, now: () => "2026-09-15T12:00:00.000Z" });

  history.recordSuccessfulExport({ normalizedMdc: MDC_A, format: "pdf" });

  assert.deepEqual(history.eventsFor(MDC_A), [
    { normalizedMdc: MDC_A, phcReference: null, format: "pdf", exportedAt: "2026-09-15T12:00:00.000Z" }
  ]);
  assert.equal(storage.setCalls.length, 1);
});

test("does not record cancelled or failed exports that never call recordSuccessfulExport", () => {
  const storage = createMemoryStorage();
  const history = createBomHistoryStore({ storage, now: () => "2026-09-15T10:00:00.000Z" });

  assert.deepEqual(history.eventsFor(MDC_A), []);
  assert.deepEqual(history.eventsFor(MDC_B), []);
  assert.equal(storage.setCalls.length, 0);
});

test("filters history by exact normalized MDC identity", () => {
  const storage = createMemoryStorage();
  const history = createBomHistoryStore({ storage, now: () => "2026-09-15T10:00:00.000Z" });

  history.recordSuccessfulExport({ normalizedMdc: MDC_A, phcReference: "PHC-001", format: "pdf" });

  assert.equal(history.eventsFor(MDC_B).length, 0);
  assert.equal(history.requiresConfirmation(MDC_B, "pdf"), false);
  assert.equal(storage.setCalls.length, 1);
});

test("filters invalid stored records without mutating storage during reads", () => {
  const storage = createMemoryStorage(JSON.stringify([
    { normalizedMdc: MDC_A, phcReference: "PHC-001", format: "pdf", exportedAt: "2026-09-15T10:00:00.000Z" },
    { normalizedMdc: MDC_A, phcReference: 42, format: "excel", exportedAt: "2026-09-15T11:00:00.000Z" },
    { normalizedMdc: MDC_A, phcReference: null, format: "csv", exportedAt: "2026-09-15T12:00:00.000Z" },
    { normalizedMdc: MDC_A, phcReference: null, format: "excel", exportedAt: 123 }
  ]));
  const history = createBomHistoryStore({ storage, now: () => "2026-09-15T13:00:00.000Z" });

  assert.deepEqual(history.eventsFor(MDC_A), [
    { normalizedMdc: MDC_A, phcReference: "PHC-001", format: "pdf", exportedAt: "2026-09-15T10:00:00.000Z" }
  ]);
  assert.equal(history.requiresConfirmation(MDC_A, "pdf"), true);
  assert.equal(history.requiresConfirmation(MDC_A, "excel"), false);
  assert.equal(storage.setCalls.length, 0);
});
