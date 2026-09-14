import assert from "node:assert/strict";
import test from "node:test";

import { parseBomMdc } from "./bom-mdc.js";

function parsedValue(reference) {
  const result = parseBomMdc(reference);
  assert.equal(result.ok, true, JSON.stringify(result));
  return result.value;
}

function malformed(reference, segment) {
  const result = parseBomMdc(reference);
  assert.deepEqual(result, {
    ok: false,
    error: {
      kind: "malformed_mdc",
      segment,
      message: "invalid MDC structure"
    }
  });
}

test("parseBomMdc normalizes and preserves component encounter order", () => {
  assert.deepEqual(
    parseBomMdc("MDC_iS.CP10___D2BDP+1BDC_M3 Cl2mA/pH/CD.PT_CF_BDW"),
    {
      ok: true,
      value: {
        normalizedMdc: "MDC_iS.CP10_D2BDP+1BDC_M3Cl2mA/pH/CD.PT_CF_BDW",
        components: [
          { code: "CP10", count: 1 },
          { code: "BDP", count: 2 },
          { code: "BDC", count: 1 },
          { code: "Cl2mA", count: 1 },
          { code: "pH", count: 1 },
          { code: "CD", count: 1 },
          { code: "CF", count: 1 },
          { code: "BDW", count: 1 }
        ],
        hasPtSuffix: true
      }
    }
  );
});

test("parseBomMdc accepts every canonical model", () => {
  ["CP10", "CP20", "CP30", "CP40", "CP50", "CP60"].forEach((model) => {
    assert.deepEqual(parsedValue(`MDC_iS.${model}_M1Cl2mA_AF`).components, [
      { code: model, count: 1 },
      { code: "Cl2mA", count: 1 },
      { code: "AF", count: 1 }
    ]);
  });
});

test("parseBomMdc rejects a model outside the canonical set", () => {
  malformed("MDC_iS.CP99_M1Cl2mA_AF", "CP99");
});

test("parseBomMdc accepts no-pump references", () => {
  assert.deepEqual(parsedValue("MDC_iS.CP10_M1Cl2mA_AF").components, [
    { code: "CP10", count: 1 },
    { code: "Cl2mA", count: 1 },
    { code: "AF", count: 1 }
  ]);
});

test("parseBomMdc parses canonical and helper-shaped pump segments", () => {
  const cases = [
    ["D1BDP", [{ code: "BDP", count: 1 }]],
    ["D2BDP+1BDC", [{ code: "BDP", count: 2 }, { code: "BDC", count: 1 }]],
    ["D1BDC", [{ code: "BDC", count: 1 }]],
    ["D2BDC", [{ code: "BDC", count: 2 }]],
    ["D1BDX", [{ code: "BDX", count: 1 }]]
  ];

  cases.forEach(([pumpSegment, expectedPumps]) => {
    assert.deepEqual(
      parsedValue(`MDC_iS.CP10_${pumpSegment}_M1Cl2mA_AF`).components.slice(0, expectedPumps.length + 1),
      [{ code: "CP10", count: 1 }, ...expectedPumps]
    );
  });
});

test("parseBomMdc aggregates repeated pump codes in first encounter order", () => {
  assert.deepEqual(
    parsedValue("MDC_iS.CP10_D1BDP+2BDP+1BDC_M1Cl2mA_AF").components.slice(0, 3),
    [
      { code: "CP10", count: 1 },
      { code: "BDP", count: 3 },
      { code: "BDC", count: 1 }
    ]
  );
  assert.deepEqual(
    parsedValue("MDC_iS.CP10_D1BDX+2BDX_M1Cl2mA_AF").components.slice(0, 2),
    [{ code: "CP10", count: 1 }, { code: "BDX", count: 3 }]
  );
});

test("parseBomMdc rejects non-positive and non-integer pump counts", () => {
  malformed("MDC_iS.CP10_D0BDP_M1Cl2mA_AF", "D0BDP");
  malformed("MDC_iS.CP10_D1.5BDP_M1Cl2mA_AF", "D1.5BDP");
});

test("parseBomMdc requires the probe count to match its slash-separated probes", () => {
  assert.deepEqual(parsedValue("MDC_iS.CP10_M2Cl2mA/pH_BF").components, [
    { code: "CP10", count: 1 },
    { code: "Cl2mA", count: 1 },
    { code: "pH", count: 1 },
    { code: "BF", count: 1 }
  ]);
  malformed("MDC_iS.CP10_M2Cl2mA_BF", "M2Cl2mA");
});

test("parseBomMdc accepts structurally valid new probe codes", () => {
  assert.deepEqual(parsedValue("MDC_iS.CP10_M1Cl30mA_AF").components, [
    { code: "CP10", count: 1 },
    { code: "Cl30mA", count: 1 },
    { code: "AF", count: 1 }
  ]);
});

test("parseBomMdc aggregates repeated probe codes in first encounter order", () => {
  assert.deepEqual(parsedValue("MDC_iS.CP10_M3Cl30mA/pH/Cl30mA_AF").components, [
    { code: "CP10", count: 1 },
    { code: "Cl30mA", count: 2 },
    { code: "pH", count: 1 },
    { code: "AF", count: 1 }
  ]);
});

test("parseBomMdc keeps PT as a probe modifier rather than a component", () => {
  const parsed = parsedValue("MDC_iS.CP10_M2Cl2mA/pH.PT_BF_BDW");

  assert.equal(parsed.hasPtSuffix, true);
  assert.deepEqual(parsed.components, [
    { code: "CP10", count: 1 },
    { code: "Cl2mA", count: 1 },
    { code: "pH", count: 1 },
    { code: "BF", count: 1 },
    { code: "BDW", count: 1 }
  ]);
  assert.equal(parsed.components.some((component) => component.code === "PT"), false);
});

test("parseBomMdc rejects invalid or repeated PT modifiers", () => {
  malformed("MDC_iS.CP10_M1Cl2mA.PT.PT_AF", "M1Cl2mA.PT.PT");
  malformed("MDC_iS.CP10_PT_M1Cl2mA_AF", "PT");
});

test("parseBomMdc accepts every current porta-sondas code and optional BDW", () => {
  ["AF", "AQ", "BF", "BQ", "CF", "CQ", "DF", "FF"].forEach((portaCode) => {
    const withoutBdw = parsedValue(`MDC_iS.CP10_M1Cl2mA_${portaCode}`);
    assert.equal(withoutBdw.components.at(-1).code, portaCode);
    assert.equal(withoutBdw.components.some((component) => component.code === "BDW"), false);

    const withBdw = parsedValue(`MDC_iS.CP10_M1Cl2mA_${portaCode}_BDW`);
    assert.deepEqual(withBdw.components.slice(-2), [
      { code: portaCode, count: 1 },
      { code: "BDW", count: 1 }
    ]);
  });
});

test("parseBomMdc reports malformed prefix, missing model, and invalid ordering", () => {
  malformed("MDC_IS.CP10_M1Cl2mA_AF", "MDC_IS");
  malformed("MDC_iS._M1Cl2mA_AF", "_");
  malformed("MDC_iS.CP10_AF_M1Cl2mA", "AF");
  malformed("MDC_iS.CP10_M1Cl2mA_BDW_AF", "AF");
});

test("parseBomMdc reports non-string and blank input as malformed", () => {
  malformed(null, "MDC input");
  malformed("", "MDC input");
  malformed("   ", "MDC input");
});

test("parseBomMdc rejects duplicate structural segments", () => {
  malformed("MDC_iS.CP10_D1BDP_D1BDC_M1Cl2mA_AF", "D1BDC");
  malformed("MDC_iS.CP10_M1Cl2mA_AF_AF", "AF");
  malformed("MDC_iS.CP10_M1Cl2mA_AF_BDW_BDW", "BDW");
});
