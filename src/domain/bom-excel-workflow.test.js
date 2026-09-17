import assert from "node:assert/strict";
import test from "node:test";

import { createBomHistoryStore } from "./bom-history.js";
import { exportBomExcel, materialsExcelFilename } from "./bom-excel-workflow.js";

const NORMALIZED_MDC = "MDC_iS.CP10_M1Xx_AF";

const ELIGIBLE_RESULT = {
  state: "complete",
  input: {
    originalMdc: NORMALIZED_MDC,
    normalizedMdc: NORMALIZED_MDC
  },
  phc: {
    reference: "PHC-001",
    status: "found"
  },
  contributions: [],
  materialTotals: [
    {
      materialIdentity: "phc:MAT-CORE",
      materialPhc: "MAT-CORE",
      matrixRowId: null,
      description: "Core material",
      quantity: 2
    }
  ],
  issues: [],
  exportEligibility: {
    pdf: true,
    excel: true
  }
};

function createMemoryStorage() {
  const values = new Map();
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

function createHistory() {
  const storage = createMemoryStorage();
  let timestamp = 0;
  const historyStore = createBomHistoryStore({
    storage,
    now: () => `2026-09-17T10:00:0${timestamp += 1}.000Z`
  });

  return { historyStore, storage };
}

test("creates deterministic Excel filenames while replacing only unsafe characters", () => {
  assert.equal(
    materialsExcelFilename("MDC_iS.CP10_M2Cl2mA/pH.PT_AF"),
    "materials_MDC_iS.CP10_M2Cl2mA_pH.PT_AF.xlsx"
  );
});

test("exports a fresh eligible result and records Excel history only after saving", async () => {
  const { historyStore, storage } = createHistory();
  const saved = [];
  let completeSave;

  const exportPromise = exportBomExcel({
    result: ELIGIBLE_RESULT,
    canExportExcel: true,
    historyStore,
    confirm: () => {
      throw new Error("confirmation should not be requested for a new Excel export");
    },
    filename: "materials_MDC_iS.CP10_M1Xx_AF.xlsx",
    saveExcel: ({ model, filename }) => new Promise((resolve) => {
      saved.push({ model, filename });
      completeSave = resolve;
    })
  });

  await Promise.resolve();
  assert.equal(storage.setCalls.length, 0);
  assert.equal(historyStore.eventsFor(NORMALIZED_MDC).length, 0);

  completeSave();
  const outcome = await exportPromise;

  assert.equal(outcome.exported, true);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].filename, "materials_MDC_iS.CP10_M1Xx_AF.xlsx");
  assert.deepEqual(historyStore.eventsFor(NORMALIZED_MDC), [
    {
      normalizedMdc: NORMALIZED_MDC,
      phcReference: "PHC-001",
      format: "excel",
      exportedAt: "2026-09-17T10:00:01.000Z"
    }
  ]);
});

test("does not export blocked or stale results supplied as Excel-ineligible", async () => {
  const { historyStore, storage } = createHistory();
  let saveCalls = 0;

  for (const result of [
    { ...ELIGIBLE_RESULT, state: "blocked", exportEligibility: { pdf: false, excel: false } },
    ELIGIBLE_RESULT
  ]) {
    const outcome = await exportBomExcel({
      result,
      canExportExcel: false,
      historyStore,
      confirm: () => true,
      filename: "materials.xlsx",
      saveExcel: async () => {
        saveCalls += 1;
      }
    });

    assert.equal(outcome.exported, false);
  }

  assert.equal(saveCalls, 0);
  assert.equal(storage.setCalls.length, 0);
});

test("exports incomplete totals with a blank material PHC", async () => {
  const { historyStore } = createHistory();
  const result = {
    ...ELIGIBLE_RESULT,
    state: "incomplete",
    materialTotals: [{
      materialIdentity: "row:matrix-row-2",
      materialPhc: "",
      matrixRowId: "matrix-row-2",
      description: "Unreferenced core",
      quantity: 2
    }],
    issues: [{
      severity: "problem",
      kind: "missing_material_phc",
      message: "Unreferenced core (matrix-row-2) — material PHC not found"
    }]
  };
  const saved = [];

  const outcome = await exportBomExcel({
    result,
    canExportExcel: true,
    historyStore,
    confirm: () => true,
    filename: "materials.xlsx",
    saveExcel: async ({ model }) => saved.push(model)
  });

  assert.equal(outcome.exported, true);
  assert.deepEqual(saved[0].rows, [
    { materialPhc: "", description: "Unreferenced core", quantity: 2 }
  ]);
});

test("requires confirmation only for a prior Excel export and leaves PDF history independent", async () => {
  const { historyStore } = createHistory();
  historyStore.recordSuccessfulExport({
    normalizedMdc: NORMALIZED_MDC,
    phcReference: "PHC-001",
    format: "pdf"
  });
  let confirmations = 0;
  let saveCalls = 0;

  await exportBomExcel({
    result: ELIGIBLE_RESULT,
    canExportExcel: true,
    historyStore,
    confirm: () => {
      confirmations += 1;
      return true;
    },
    filename: "materials.xlsx",
    saveExcel: async () => {
      saveCalls += 1;
    }
  });

  assert.equal(confirmations, 0);
  assert.equal(saveCalls, 1);
  assert.equal(historyStore.requiresConfirmation(NORMALIZED_MDC, "pdf"), true);
  assert.equal(historyStore.requiresConfirmation(NORMALIZED_MDC, "excel"), true);
});

test("cancels or confirms a repeat Excel export without affecting PDF history", async () => {
  const { historyStore } = createHistory();
  historyStore.recordSuccessfulExport({
    normalizedMdc: NORMALIZED_MDC,
    phcReference: "PHC-001",
    format: "pdf"
  });
  historyStore.recordSuccessfulExport({
    normalizedMdc: NORMALIZED_MDC,
    phcReference: "PHC-001",
    format: "excel"
  });
  let saveCalls = 0;

  const cancelled = await exportBomExcel({
    result: ELIGIBLE_RESULT,
    canExportExcel: true,
    historyStore,
    confirm: () => false,
    filename: "materials.xlsx",
    saveExcel: async () => {
      saveCalls += 1;
    }
  });

  assert.equal(cancelled.exported, false);
  assert.equal(saveCalls, 0);
  assert.equal(historyStore.eventsFor(NORMALIZED_MDC).filter((event) => event.format === "excel").length, 1);

  const repeated = await exportBomExcel({
    result: ELIGIBLE_RESULT,
    canExportExcel: true,
    historyStore,
    confirm: () => true,
    filename: "materials.xlsx",
    saveExcel: async () => {
      saveCalls += 1;
    }
  });

  assert.equal(repeated.exported, true);
  assert.equal(saveCalls, 1);
  assert.equal(historyStore.eventsFor(NORMALIZED_MDC).filter((event) => event.format === "pdf").length, 1);
  assert.equal(historyStore.eventsFor(NORMALIZED_MDC).filter((event) => event.format === "excel").length, 2);
});
