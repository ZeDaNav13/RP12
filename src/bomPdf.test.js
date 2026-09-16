import assert from "node:assert/strict";
import test from "node:test";

import { saveBomPdf } from "./bomPdf.js";

const MODEL = {
  normalizedMdc: "MDC_iS.CP10_M1Xx_AF",
  phcReference: "PHC-001",
  state: "complete",
  issues: [],
  rows: [
    { materialPhc: "MAT-CORE", description: "Core material", quantity: 2 },
    { materialPhc: "MAT-ALWAYS", description: "Always material", quantity: 0.5 }
  ]
};

function createRecordingPdf({ onSave } = {}) {
  const operations = [];

  return {
    operations,
    text(value, x, y) {
      operations.push({ type: "text", value, x, y });
    },
    save(filename) {
      operations.push({ type: "save", filename });
      return onSave?.(filename);
    }
  };
}

function renderedText(pdf) {
  return pdf.operations
    .filter((operation) => operation.type === "text")
    .map((operation) => String(operation.value));
}

test("saveBomPdf renders the normalized MDC, resolved PHC, and Materials Total rows", async () => {
  const pdf = createRecordingPdf();

  await saveBomPdf({
    model: MODEL,
    createPdf: () => pdf,
    filename: "bom.pdf"
  });

  const text = renderedText(pdf);
  assert.ok(text.includes("MDC_iS.CP10_M1Xx_AF"));
  assert.ok(text.includes("PHC-001"));
  assert.ok(text.includes("MAT-CORE"));
  assert.ok(text.includes("Core material"));
  assert.ok(text.includes("2"));
  assert.ok(text.includes("MAT-ALWAYS"));
  assert.ok(text.includes("Always material"));
  assert.ok(text.includes("0.5"));
});

test("saveBomPdf renders the required absent-PHC text", async () => {
  const pdf = createRecordingPdf();

  await saveBomPdf({
    model: { ...MODEL, phcReference: null },
    createPdf: () => pdf,
    filename: "bom.pdf"
  });

  assert.ok(renderedText(pdf).includes("PHC reference not found"));
});

test("saveBomPdf preserves incomplete state and supplied issues without provenance", async () => {
  const pdf = createRecordingPdf();
  const incomplete = {
    ...MODEL,
    state: "incomplete",
    issues: [{
      severity: "problem",
      kind: "unmapped_component",
      message: "AQ — no material mapping defined"
    }],
    rows: [{ materialPhc: "MAT-CORE", description: "Core material", quantity: 2 }]
  };

  await saveBomPdf({ model: incomplete, createPdf: () => pdf, filename: "bom.pdf" });

  const text = renderedText(pdf);
  assert.ok(text.includes("BOM state: incomplete"));
  assert.ok(text.includes("AQ — no material mapping defined"));
  assert.equal(text.includes("sourceComponent"), false);
  assert.equal(text.includes("CP10"), false);
});

test("saveBomPdf saves with the supplied filename", async () => {
  const pdf = createRecordingPdf();

  await saveBomPdf({
    model: MODEL,
    createPdf: () => pdf,
    filename: "MDC_iS.CP10_M1Xx_AF-bom.pdf"
  });

  assert.deepEqual(pdf.operations.filter((operation) => operation.type === "save"), [
    { type: "save", filename: "MDC_iS.CP10_M1Xx_AF-bom.pdf" }
  ]);
});

test("saveBomPdf resolves only after PDF saving succeeds", async () => {
  let releaseSave;
  let resolved = false;
  const pdf = createRecordingPdf({
    onSave: () => new Promise((resolve) => {
      releaseSave = resolve;
    })
  });

  const exportPromise = saveBomPdf({ model: MODEL, createPdf: () => pdf, filename: "bom.pdf" })
    .then(() => {
      resolved = true;
    });

  await Promise.resolve();
  assert.equal(resolved, false);
  releaseSave();
  await exportPromise;
  assert.equal(resolved, true);
});

test("saveBomPdf performs no browser-local history write", async () => {
  const originalStorage = globalThis.localStorage;
  const pdf = createRecordingPdf();
  globalThis.localStorage = {
    setItem() {
      throw new Error("history writes are outside the PDF adapter");
    }
  };

  try {
    await saveBomPdf({ model: MODEL, createPdf: () => pdf, filename: "bom.pdf" });
  } finally {
    if (originalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalStorage;
    }
  }
});
