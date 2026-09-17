import assert from "node:assert/strict";
import test from "node:test";

import { createMaterialsViewState } from "./bom-ui-state.js";

const RAW_MDC = "MDC_iS.CP10_M1Xx_AF";
const CONTRIBUTIONS = [
  {
    sourceComponent: "CP10",
    sourceCount: 1,
    materialPhc: "MAT-CORE",
    matrixRowId: "matrix-row-2",
    description: "Core material",
    quantity: 2
  }
];
const MATERIAL_TOTALS = [
  {
    materialIdentity: "phc:MAT-CORE",
    materialPhc: "MAT-CORE",
    matrixRowId: null,
    description: "Core material",
    quantity: 2
  }
];
const HISTORY_EVENTS = [
  {
    normalizedMdc: RAW_MDC,
    phcReference: "PHC-001",
    format: "pdf",
    exportedAt: "2026-09-16T10:00:00.000Z"
  }
];

function resultWith(overrides = {}) {
  return {
    state: "complete",
    input: {
      originalMdc: RAW_MDC,
      normalizedMdc: RAW_MDC,
      ...overrides.input
    },
    contributions: CONTRIBUTIONS,
    materialTotals: MATERIAL_TOTALS,
    issues: [],
    exportEligibility: {
      pdf: true,
      excel: true,
      ...overrides.exportEligibility
    },
    ...overrides
  };
}

test("returns no rows or exports before calculation while retaining supplied history", () => {
  const viewState = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: null,
    historyEvents: HISTORY_EVENTS
  });

  assert.deepEqual(viewState, {
    isStale: false,
    canExportPdf: false,
    canExportExcel: false,
    componentRows: [],
    totalRows: [],
    historyEvents: HISTORY_EVENTS
  });
});

test("keeps an unchanged non-blocked calculation fresh", () => {
  const viewState = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith(),
    historyEvents: []
  });

  assert.equal(viewState.isStale, false);
  assert.equal(viewState.canExportPdf, true);
  assert.equal(viewState.canExportExcel, true);
});

test("marks a calculation stale when the raw MDC input changes", () => {
  const viewState = createMaterialsViewState({
    rawMdc: "MDC_iS.CP20_M1Xx_AF",
    result: resultWith(),
    historyEvents: []
  });

  assert.equal(viewState.isStale, true);
});

test("disables both exports for a stale result without changing its rows", () => {
  const viewState = createMaterialsViewState({
    rawMdc: "MDC_iS.CP20_M1Xx_AF",
    result: resultWith(),
    historyEvents: []
  });

  assert.equal(viewState.canExportPdf, false);
  assert.equal(viewState.canExportExcel, false);
  assert.equal(viewState.componentRows, CONTRIBUTIONS);
  assert.equal(viewState.totalRows, MATERIAL_TOTALS);
});

test("hides all rows and exports for a blocked result", () => {
  const viewState = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith({
      state: "blocked",
      contributions: [{ sourceComponent: "CP10" }],
      materialTotals: [{ materialPhc: "MAT-CORE" }],
      exportEligibility: { pdf: false, excel: false }
    }),
    historyEvents: []
  });

  assert.deepEqual(viewState.componentRows, []);
  assert.deepEqual(viewState.totalRows, []);
  assert.equal(viewState.canExportPdf, false);
  assert.equal(viewState.canExportExcel, false);
});

test("exposes non-blocked contributions and totals in their supplied order", () => {
  const viewState = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith(),
    historyEvents: []
  });

  assert.equal(viewState.componentRows, CONTRIBUTIONS);
  assert.equal(viewState.totalRows, MATERIAL_TOTALS);
});

test("preserves supplied history events unchanged", () => {
  const viewState = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith(),
    historyEvents: HISTORY_EVENTS
  });

  assert.equal(viewState.historyEvents, HISTORY_EVENTS);
});

test("exports PDF only while an eligible result remains fresh", () => {
  const fresh = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith({ exportEligibility: { pdf: true, excel: false } }),
    historyEvents: []
  });
  const stale = createMaterialsViewState({
    rawMdc: "MDC_iS.CP20_M1Xx_AF",
    result: resultWith({ exportEligibility: { pdf: true, excel: false } }),
    historyEvents: []
  });

  assert.equal(fresh.canExportPdf, true);
  assert.equal(stale.canExportPdf, false);
});

test("reports Excel eligibility only while an eligible result remains fresh", () => {
  const fresh = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith({ exportEligibility: { pdf: false, excel: true } }),
    historyEvents: []
  });
  const stale = createMaterialsViewState({
    rawMdc: "MDC_iS.CP20_M1Xx_AF",
    result: resultWith({ exportEligibility: { pdf: false, excel: true } }),
    historyEvents: []
  });

  assert.equal(fresh.canExportExcel, true);
  assert.equal(stale.canExportExcel, false);
});

test("keeps missing-material-PHC results PDF-eligible and Excel-eligible", () => {
  const viewState = createMaterialsViewState({
    rawMdc: RAW_MDC,
    result: resultWith({
      state: "incomplete",
      exportEligibility: { pdf: true, excel: true }
    }),
    historyEvents: []
  });

  assert.equal(viewState.canExportPdf, true);
  assert.equal(viewState.canExportExcel, true);
});

test("does not access browser storage or write history", () => {
  const originalStorage = globalThis.localStorage;
  globalThis.localStorage = new Proxy({}, {
    get() {
      throw new Error("UI state must not access browser storage");
    }
  });

  try {
    createMaterialsViewState({
      rawMdc: RAW_MDC,
      result: resultWith(),
      historyEvents: HISTORY_EVENTS
    });
  } finally {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalStorage;
    }
  }
});
