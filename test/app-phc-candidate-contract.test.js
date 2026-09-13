import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.resolve(testDir, "..", "src", "App.jsx");

function functionSource(source, functionName) {
  const start = source.indexOf(`function ${functionName}(`);
  assert.notEqual(start, -1, `missing ${functionName}`);

  const bodyStart = source.indexOf("{", start);
  let depth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }

  assert.fail(`unterminated ${functionName}`);
}

function forEachCodeCharacter(source, start, visitor) {
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (["'", '"', "`"].includes(character)) {
      quote = character;
      continue;
    }

    const result = visitor(character, index);
    if (result !== undefined) return result;
  }

  return undefined;
}

function findAssemblyCallOpening(source) {
  const callName = "buildAssemblyCode(";
  return forEachCodeCharacter(source, 0, (_character, index) =>
    source.startsWith(callName, index) ? index + callName.length - 1 : undefined
  );
}

function matchingClosingDelimiter(source, openingIndex) {
  const opening = source[openingIndex];
  const closing = { "(": ")", "{": "}", "[": "]" }[opening];
  assert.ok(closing, `unsupported delimiter: ${opening}`);
  let depth = 0;

  return forEachCodeCharacter(source, openingIndex, (character, index) => {
    if (character === opening) depth += 1;
    if (character === closing) depth -= 1;
    return depth === 0 ? index : undefined;
  });
}

function splitTopLevelArguments(source) {
  const argumentsList = [];
  const depths = { "(": 0, "{": 0, "[": 0 };
  const closings = { ")": "(", "}": "{", "]": "[" };
  let argumentStart = 0;

  forEachCodeCharacter(source, 0, (character, index) => {
    if (Object.hasOwn(depths, character)) {
      depths[character] += 1;
    } else if (Object.hasOwn(closings, character)) {
      depths[closings[character]] -= 1;
    } else if (character === "," && Object.values(depths).every((depth) => depth === 0)) {
      argumentsList.push(source.slice(argumentStart, index).trim());
      argumentStart = index + 1;
    }
  });

  argumentsList.push(source.slice(argumentStart).trim());
  return argumentsList;
}

function normalizeSourceFragment(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").replace(/\s+/g, "");
}

function probeOptionsArgumentMatches(argumentSource) {
  const trimmedArgument = argumentSource.trim();
  if (!trimmedArgument.startsWith("{")) return false;

  const closingIndex = matchingClosingDelimiter(trimmedArgument, 0);
  if (closingIndex !== trimmedArgument.length - 1) return false;

  const propertySources = splitTopLevelArguments(trimmedArgument.slice(1, -1));
  const properties = propertySources.map(normalizeSourceFragment);
  return [
    "sonda_cloro:sondaCloro.option",
    "sonda_ph:sondaPh.option",
    "sonda_condutividade:sondaCondutividade.option"
  ].every((expectedProperty) => properties.includes(expectedProperty));
}

function candidateCallContractMatches(candidateSource) {
  const openingIndex = findAssemblyCallOpening(candidateSource);
  if (openingIndex === undefined) return false;

  const closingIndex = matchingClosingDelimiter(candidateSource, openingIndex);
  if (closingIndex === undefined) return false;

  const argumentsList = splitTopLevelArguments(
    candidateSource.slice(openingIndex + 1, closingIndex)
  );
  if (argumentsList.length !== 6) return false;

  const normalizedArguments = argumentsList.map(normalizeSourceFragment);
  return (
    normalizedArguments[0] === "questionRows" &&
    normalizedArguments[1] === "modelRow.option" &&
    normalizedArguments[2] === "pumpCombination.pumpSegment" &&
    normalizedArguments[3] === "probeCodes" &&
    normalizedArguments[5] === "circuito" &&
    probeOptionsArgumentMatches(argumentsList[4])
  );
}

test("candidate matcher rejects a wrong argument despite a later decoy object", () => {
  const brokenSource = `function buildUniqueAssemblyCodes() {
    const candidate = buildAssemblyCode(
      questionRows,
      model.option,
      pumpCombo.segment,
      probeCodes,
      wrongProbeOptions,
      circuito
    );

    const unrelatedDecoy = {
      sonda_cloro: sondaCloro.option,
      sonda_ph: sondaPh.option,
      sonda_condutividade: sondaCondutividade.option
    };
    consume(unrelatedDecoy);
  }`;

  assert.equal(candidateCallContractMatches(brokenSource), false);
});

test("candidate matcher rejects the old direct chlorine option argument", () => {
  const brokenSource = `function buildUniqueAssemblyCodes() {
    const candidate = buildAssemblyCode(
      questionRows,
      modelRow.option,
      pumpCombination.pumpSegment,
      probeCodes,
      sondaCloro.option,
      circuito
    );
  }`;

  assert.equal(candidateCallContractMatches(brokenSource), false);
});

test("candidate matcher accepts the required probe-options argument", () => {
  const correctSource = `function buildUniqueAssemblyCodes() {
    const candidate = buildAssemblyCode(
      questionRows,
      modelRow.option,
      pumpCombination.pumpSegment,
      probeCodes,
      {
        sonda_cloro: sondaCloro.option,
        sonda_ph: sondaPh.option,
        sonda_condutividade: sondaCondutividade.option
      },
      circuito
    );
  }`;

  assert.equal(candidateCallContractMatches(correctSource), true);
});

test("candidate matcher accepts formatted probe-options properties", () => {
  const formattedSource = `function buildUniqueAssemblyCodes() {
    const candidate = buildAssemblyCode(questionRows, modelRow.option, pumpCombination.pumpSegment, probeCodes, {
      sonda_cloro : sondaCloro.option,
      // preserve the pH selection
      sonda_ph: sondaPh.option,
      /* conductivity remains a lookup key */
      sonda_condutividade : sondaCondutividade.option
    }, circuito);
  }`;

  assert.equal(candidateCallContractMatches(formattedSource), true);
});

test("App PHC candidates pass all enumerated probe selections to assembly construction", async () => {
  const appSource = await fs.readFile(appPath, "utf8");
  const candidateSource = functionSource(appSource, "buildUniqueAssemblyCodes");

  assert.equal(candidateCallContractMatches(candidateSource), true);
});
