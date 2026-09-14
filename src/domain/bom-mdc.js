import { normalizeMdcReference } from "./mdc.js";

const MODEL_CODES = new Set(["CP10", "CP20", "CP30", "CP40", "CP50", "CP60"]);
const PORTA_SONDAS_CODES = new Set(["AF", "AQ", "BF", "BQ", "CF", "CQ", "DF", "FF"]);
const PREFIX = "MDC_iS.";

function malformed(segment) {
  return {
    ok: false,
    error: {
      kind: "malformed_mdc",
      segment,
      message: "invalid MDC structure"
    }
  };
}

function parsePumpSegment(segment) {
  if (!segment.startsWith("D")) return null;

  const pumpParts = segment.slice(1).split("+");
  if (pumpParts.length === 0 || pumpParts.some((part) => !part)) return null;

  const components = [];
  for (const part of pumpParts) {
    const match = part.match(/^([1-9]\d*)([A-Za-z][A-Za-z0-9]*)$/);
    if (!match) return null;

    const code = match[2];
    const existingComponent = components.find((component) => component.code === code);

    if (existingComponent) {
      existingComponent.count += Number(match[1]);
    } else {
      components.push({ code, count: Number(match[1]) });
    }
  }

  return components;
}

function parseProbeSegment(segment) {
  if (!segment.startsWith("M")) return null;

  const hasPtSuffix = segment.endsWith(".PT");
  const withoutPtSuffix = hasPtSuffix ? segment.slice(0, -3) : segment;
  if (withoutPtSuffix.includes(".PT")) return null;

  const match = withoutPtSuffix.match(/^M([1-9]\d*)([A-Za-z][A-Za-z0-9]*(?:\/[A-Za-z][A-Za-z0-9]*)*)$/);
  if (!match) return null;

  const probeCodes = match[2].split("/");
  if (Number(match[1]) !== probeCodes.length) {
    return null;
  }

  const components = [];
  for (const code of probeCodes) {
    const existingComponent = components.find((component) => component.code === code);

    if (existingComponent) {
      existingComponent.count += 1;
    } else {
      components.push({ code, count: 1 });
    }
  }

  return {
    components,
    hasPtSuffix
  };
}

export function parseBomMdc(rawMdc) {
  if (typeof rawMdc !== "string" || !rawMdc.trim()) {
    return malformed("MDC input");
  }

  const normalizedMdc = normalizeMdcReference(rawMdc);
  if (!normalizedMdc.startsWith(PREFIX)) {
    return malformed(normalizedMdc.split(".")[0]);
  }

  const segments = normalizedMdc.slice(PREFIX.length).split("_");
  const [model, ...remainingSegments] = segments;

  if (!MODEL_CODES.has(model)) {
    return malformed(model || "_");
  }

  const components = [{ code: model, count: 1 }];
  let segmentIndex = 0;

  if (remainingSegments[segmentIndex]?.startsWith("D")) {
    const pumpComponents = parsePumpSegment(remainingSegments[segmentIndex]);
    if (!pumpComponents) return malformed(remainingSegments[segmentIndex]);

    components.push(...pumpComponents);
    segmentIndex += 1;
  }

  const probeSegment = remainingSegments[segmentIndex];
  const probe = parseProbeSegment(probeSegment ?? "");
  if (!probe) return malformed(probeSegment ?? "");

  components.push(...probe.components);
  segmentIndex += 1;

  const portaSondasSegment = remainingSegments[segmentIndex];
  if (PORTA_SONDAS_CODES.has(portaSondasSegment)) {
    components.push({ code: portaSondasSegment, count: 1 });
    segmentIndex += 1;
  }

  if (remainingSegments[segmentIndex] === "BDW") {
    components.push({ code: "BDW", count: 1 });
    segmentIndex += 1;
  }

  if (segmentIndex !== remainingSegments.length) {
    return malformed(remainingSegments[segmentIndex]);
  }

  return {
    ok: true,
    value: {
      normalizedMdc,
      components,
      hasPtSuffix: probe.hasPtSuffix
    }
  };
}
