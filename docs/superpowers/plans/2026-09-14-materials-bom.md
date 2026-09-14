# Materials / BOM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate static Materials/BOM workspace that calculates, validates, exports, and locally records a production BOM from a manually entered MDC reference without changing the existing selector.

**Architecture:** Keep BOM parsing, matrix validation, calculation, PHC resolution, status, history, and export-model rules in focused pure domain modules. React loads client-editable CSV data and presents one immutable calculated result; PDF and later Excel adapters consume that result without recalculating it. The existing selector remains mounted and behaviorally unchanged, with a small top-level workspace switch in `App.jsx`.

**Tech Stack:** React 18, Vite 5, Node built-in test runner, static runtime CSV data, plus the explicitly planned `jspdf` dependency for browser-side BOM PDF creation; no Excel dependency is selected until the client supplies its import schema.

**Spec:** `docs/superpowers/specs/2026-09-13-materials-bom-design.md`

## Global Constraints

- Remain a static intranet React/Vite application: no backend, database, API service, runtime Node process, or new infrastructure.
- Preserve existing selector behavior, pricing, question CSV behavior, PHC identity behavior, and the canonical 5,940-row generator output.
- Keep Materials/BOM separate from selector pricing and do not pre-generate BOMs for known MDC references.
- Read one client-editable runtime materials CSV; version 1 has no matrix-editor UI.
- Drive BOM identity solely from protected MDC technical codes, never selector labels or material descriptions.
- Treat a missing matrix component column as unmapped and incomplete; never silently treat it as a zero quantity.
- Treat a missing assembly PHC lookup as a warning only; it neither blocks calculation nor makes an otherwise complete BOM incomplete.
- Block malformed MDC input and invalid matrix structure/quantities; never produce a partial or best-effort BOM from blocked input.
- Permit PDF for complete and incomplete mapped results; block Excel whenever an included material lacks `material_phc`.
- Calculation and history lookup create no history. Append one local event only after a successful export; require confirmation independently for repeated PDF and Excel exports of the same normalized MDC.
- Preserve the client dependency for actual PHC Excel schema (file type, columns, ordering, and import constraints); do not guess it.
- Do not invent material PHCs, AQ/BQ/CQ/DF mappings, probe/sensor mappings, material prices, or selector-pricing changes.
- Keep `.prototype-reference/` read-only and leave `release/mdc_tool_ready_to_upload_v1.6_protected.zip` untracked and untouched.

## Canonical MDC Grammar to Preserve

The existing assembly builder in `src/App.jsx:360` starts with `MDC_iS.<model>`, joins nonempty segments using `_`, then calls `normalizeMdcReference()` from `src/domain/mdc.js`. Normalization removes all whitespace and collapses runs of underscores, so historical PHC entries such as `MDC_iS.CP10___M3 Cl2mA/pH/CD.PT_CF_BDW` normalize to the generated identity `MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW`.

Representative current generated references are:

```text
MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW
MDC_iS.CP10_D1BDP_M3Cl2mA/pH/CD.PT_CF_BDW
MDC_iS.CP10_D2BDP+1BDC_M3Cl2mA/pH/CD.PT_CF_BDW
MDC_iS.CP10_D1BDC_M3Cl2mA/pH/CD.PT_CF_BDW
MDC_iS.CP10_D2BDC_M3Cl2mA/pH/CD.PT_CF_BDW
MDC_iS.CP10_M1Cl2mA_AF_BDW
MDC_iS.CP10_M2Cl2mA/pH.PT_BF_BDW
MDC_iS.CP10_M3Cl5mA/pH/CD.PT_CQ
```

- The model segment is one of the current canonical technical codes `CP10`, `CP20`, `CP30`, `CP40`, `CP50`, or `CP60`; its technical absence is `_` before normalization and therefore produces no model component. A different `CP` value is malformed, not a future-model shortcut.
- The optional pump segment emitted by `buildPumpSegment()` in `src/domain/pumps.js` is `D<count><pump-code>(+<count><pump-code>)*`; no-pump is `_` before normalization and produces no pump components. Current selector rows produce `BDP` and `BDC`, ordered as BDP then BDC when both exist, so valid generated examples include `D1BDP`, `D2BDP+1BDC`, `D1BDC`, and `D2BDC`. The protected helper also emits any other nonempty technical `row.code` supplied to it, so the parser accepts a nonempty technical pump token in this same segment shape as a component rather than misclassifying it as malformed; it does not accept arbitrary extra segment types.
- The optional probe segment is `M<count><probe-code>(/<probe-code>)*`, where current probe codes are chlorine codes (`Cl2mA`, `Cl5mA`, `Cl10mA`, `Cl20mA`, `Cl2m0c`, `Cl20m0c`), `pH`, and `CD`. Its leading count must equal the number of slash-separated probe codes.
- `.PT` is an optional probe-segment modifier, not a BOM component. It may only follow a valid probe segment.
- The optional porta-sondas segment is a two-letter technical suffix (`AF`, `AQ`, `BF`, `BQ`, `CF`, `CQ`, `DF`, or `FF`); it is itself a BOM component. Current grammar places it after a probe segment.
- `BDW` is an optional final BOM component. Circuit and water metadata are not encoded as independent BOM components.
- `_` separators delimit nonempty segments after normalization. No display text is part of the grammar.

The parser must return a structured malformed failure for bad prefix, missing model, a model outside the canonical set, invalid pump count/form, invalid probe count/form, invalid `.PT` placement, invalid segment order, or duplicate structural segment. A helper-shaped unknown nonempty pump code is syntactically valid and reaches the matrix as an unmapped component. A syntactically valid normalized MDC that has no row in `phc_integration.csv` is a PHC warning, not a parse failure.

## Planned File Structure

- `src/domain/bom-csv.js` — quote-aware CSV records and normalized header parsing shared by BOM runtime readers.
- `src/domain/bom-mdc.js` — strict MDC grammar parser and protected component-count representation; reuses `normalizeMdcReference`.
- `src/domain/bom-matrix.js` — dynamic material-matrix structure and quantity validation.
- `src/domain/bom-phc.js` — read-only normalized lookup adapter for the shipped PHC registry.
- `src/domain/bom.js` — contribution-first calculation, aggregation, issue collection, and complete/incomplete/blocked status.
- `src/domain/bom-history.js` — injected-storage browser-local export-event adapter.
- `src/domain/bom-export.js` — export-neutral Materials Total model and PDF/Excel eligibility assertions.
- `src/domain/bom-ui-state.js` — pure stale-result and export-confirmation state derived from a calculated BOM result.
- `src/bomPdf.js` — browser PDF adapter that renders only an already-calculated export model through `jspdf`.
- `src/MaterialsTool.jsx` — BOM runtime loading, calculation orchestration, views, export controls, stale state, and history display.
- `src/App.jsx:1-18, 480-540, 760-810, render return` — add workspace navigation and mount `MaterialsTool`; retain selector functions and markup.
- `src/styles.css` — scoped Materials workspace, status, tables, history, and print styles without changing selector layout rules.
- `public/materials/materials_matrix.csv` — initial client-editable matrix containing only confirmed component columns and blank material PHCs.
- `scripts/prepare-client-release.mjs:17-23` — include `public/materials` in the client package.
- `package.json` and `package-lock.json` — add only `jspdf` when the PDF task starts; no Excel package is selected.
- `src/domain/bom-*.test.js` and `test/bom-*.test.js` — Node built-in tests for each pure domain boundary and representative runtime fixture.
- `README.md` and `README_for_client.txt` — only in the final acceptance task, document the editable matrix location, BOM use, PDF behavior, and client Excel-schema gate.

## Task 1: Parse normalized MDC components for BOM

**Files:**
- Create: `src/domain/bom-mdc.js`
- Test: `src/domain/bom-mdc.test.js`
- Modify: none

**Interfaces:**
- Consumes: `normalizeMdcReference(value)` from `src/domain/mdc.js`.
- Produces: `parseBomMdc(rawMdc)`, returning either `{ ok: true, value: { normalizedMdc, components: Array<{ code: string, count: number }>, hasPtSuffix: boolean } }` or `{ ok: false, error: { kind: "malformed_mdc", segment: string, message: string } }`. `components` contains model, each nonzero pump type, each probe, the porta-sondas code, and `BDW`; it excludes `_`, `.PT`, and `ALWAYS`.

- [ ] **Step 1: Write the failing parser tests** in `src/domain/bom-mdc.test.js` using the current real examples:

  ```js
  assert.deepEqual(parseBomMdc("MDC_iS.CP10___D2BDP+1BDC_M3 Cl2mA/pH/CD.PT_CF_BDW"), {
    ok: true,
    value: {
      normalizedMdc: "MDC_iS.CP10_D2BDP+1BDC_M3Cl2mA/pH/CD.PT_CF_BDW",
      components: [
        { code: "CP10", count: 1 }, { code: "BDP", count: 2 },
        { code: "BDC", count: 1 }, { code: "Cl2mA", count: 1 },
        { code: "pH", count: 1 }, { code: "CD", count: 1 },
        { code: "CF", count: 1 }, { code: "BDW", count: 1 }
      ],
      hasPtSuffix: true
    }
  });
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_M2Cl2mA/pH.PT_BF_BDW").value.components, [
    { code: "CP10", count: 1 }, { code: "Cl2mA", count: 1 },
    { code: "pH", count: 1 }, { code: "BF", count: 1 }, { code: "BDW", count: 1 }
  ]);
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_D1BDP_M1Cl2mA_AF").value.components.slice(0, 2), [
    { code: "CP10", count: 1 }, { code: "BDP", count: 1 }
  ]);
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_D2BDP+1BDC_M1Cl2mA_AF").value.components.slice(0, 3), [
    { code: "CP10", count: 1 }, { code: "BDP", count: 2 }, { code: "BDC", count: 1 }
  ]);
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_D1BDC_M1Cl2mA_AF").value.components.slice(0, 2), [
    { code: "CP10", count: 1 }, { code: "BDC", count: 1 }
  ]);
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_D2BDC_M1Cl2mA_AF").value.components.slice(0, 2), [
    { code: "CP10", count: 1 }, { code: "BDC", count: 2 }
  ]);
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_D1BDX_M1Cl2mA_AF").value.components.slice(0, 2), [
    { code: "CP10", count: 1 }, { code: "BDX", count: 1 }
  ]);
  assert.equal(parseBomMdc("MDC_iS.CP99_M1Cl2mA_AF").error.kind, "malformed_mdc");
  assert.deepEqual(parseBomMdc("MDC_iS.CP10_M3Cl2mA/pH.PT.PT_CF").error, {
    kind: "malformed_mdc", segment: "M3Cl2mA/pH.PT.PT", message: "invalid probe segment"
  });
  ```

- [ ] **Step 2: Run RED** with `node --test src/domain/bom-mdc.test.js`; expect module-not-found or `parseBomMdc is not a function` because no BOM parser exists.
- [ ] **Step 3: Write the minimum parser** in `src/domain/bom-mdc.js`: reject non-string/empty input before normalization; normalize once; accept only the six canonical model codes; parse only the documented segment sequence; accept BDP-only, BDC-only, and mixed pump counts plus helper-shaped nonempty technical pump codes; preserve encounter order while aggregating repeated same-code occurrences; and return the first malformed structural segment in `error.segment`.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom-mdc.test.js`; expect all parser tests to pass.
- [ ] **Step 5: Run relevant regression** with `npm test && npm run build && git diff --check`; also run `node --test test/phc-identity.test.js` to prove historical whitespace/underscore normalization remains protected.
- [ ] **Step 6: Inspect scope** with `git diff -- src/domain/bom-mdc.js src/domain/bom-mdc.test.js` and `git status --short`; confirm no existing parser, selector, generated CSV, or PHC registry changes.
- [ ] **Step 7: Commit scoped files** with `git add src/domain/bom-mdc.js src/domain/bom-mdc.test.js && git commit -m "feat: parse MDC components for BOM"`.

## Task 2: Validate the runtime materials matrix

**Files:**
- Create: `src/domain/bom-csv.js`, `src/domain/bom-matrix.js`, `src/domain/bom-matrix.test.js`, `public/materials/materials_matrix.csv`
- Modify: none
- Test: `src/domain/bom-matrix.test.js`

**Interfaces:**
- Consumes: CSV text supplied by fetch or fixture; no React or selector data.
- Produces: `parseBomCsv(text) -> Array<Array<string>>` with RFC-4180-style doubled quote support, and `parseMaterialsMatrix(csvText) -> { ok: true, value: { rows: Array<{ rowId: string, materialPhc: string, description: string, quantities: Record<string, number> }>, componentCodes: Set<string> } } | { ok: false, errors: Array<{ kind: "invalid_matrix", row: number, column: string, message: string }> }`.

- [ ] **Step 1: Write RED tests** for quoted descriptions, mandatory `material_phc`, `description`, and `ALWAYS` headers, dynamically discovered component headers, blank/`0` quantities becoming `0`, decimal `0.5`/`0.4`, and invalid `"two"` returning an `invalid_matrix` error with source row/column. Include a fixture with two rows whose `material_phc` is blank and assert different `rowId` values such as `matrix-row-2` and `matrix-row-3`.
- [ ] **Step 2: Run RED** with `node --test src/domain/bom-matrix.test.js`; expect missing BOM CSV/matrix modules.
- [ ] **Step 3: Write the minimum readers and initial matrix.** Parse quoted CSV fields without a dependency; reject duplicate/blank headers, missing identity headers, missing `ALWAYS`, mismatched row widths, blank descriptions, and non-finite or negative quantities. Add only `ALWAYS`, `CP10`–`CP60`, `BDP`, `BDC`, `AF`, `BF`, `CF`, `FF`, and `BDW` columns. Populate the approved quantities exactly: models `4 × M5x16 screw`; BDP/BDC `2 × M5x16 screw`; AF/BF/CF/FF `2 × Astore d32 clamp` and `2 × M5x16 screw`; BDW one valve and one servo; and the ten specified ALWAYS materials. Leave every `material_phc` cell blank. Do not add AQ/BQ/CQ/DF or probe/sensor columns.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom-matrix.test.js`; expect the matrix parser and initial-data structural assertions to pass, including a test that missing `AQ` and `Cl2mA` columns remain absent.
- [ ] **Step 5: Run relevant regression** with `npm test && npm run build && git diff --check`; run `npm run generate:combinations` and verify 5,940 rows and no diff for `all_reply_combinations_filtered.csv`.
- [ ] **Step 6: Inspect scope** with `git diff --check`, `git diff -- public/materials/materials_matrix.csv`, and `git status --short`; confirm client-editable mapping data is isolated and no selector CSV changes.
- [ ] **Step 7: Commit scoped files** with `git add src/domain/bom-csv.js src/domain/bom-matrix.js src/domain/bom-matrix.test.js public/materials/materials_matrix.csv && git commit -m "feat: validate BOM materials matrix"`.

## Task 3: Calculate contributions and material totals

**Files:**
- Create: `src/domain/bom.js`, `src/domain/bom.test.js`
- Modify: none
- Test: `src/domain/bom.test.js`

**Interfaces:**
- Consumes: successful `parseBomMdc(...).value` and `parseMaterialsMatrix(...).value`.
- Produces: `calculateBomMaterials(parsedMdc, matrix) -> { contributions: Array<{ sourceComponent: string, sourceCount: number, materialPhc: string, matrixRowId: string, description: string, quantity: number }>, materialTotals: Array<{ materialIdentity: string, materialPhc: string, matrixRowId: string | null, description: string, quantity: number }>, unmappedComponents: Array<string>, missingMaterialPhcs: Array<{ matrixRowId: string, description: string }> }`. Material identity is `phc:<materialPhc>` for nonblank PHC and `row:<matrixRowId>` otherwise.

- [ ] **Step 1: Write RED tests** with a small parsed-MDC fixture containing `CP10 × 1`, `BDP × 2`, `AF × 1`, and `BDW × 1`. Assert `ALWAYS` appears once, `BDP` contribution doubles, provenance retains `sourceComponent`, a screw total aggregates contributions from CP10/BDP/AF, fractional ALWAYS totals preserve `0.5`, `0.4`, and `1.2`, and two blank-PHC matrix rows with identical descriptions do not merge. Assert `AQ` is listed in `unmappedComponents`, not given a synthetic zero.
- [ ] **Step 2: Run RED** with `node --test src/domain/bom.test.js`; expect missing `calculateBomMaterials`.
- [ ] **Step 3: Write the minimum engine.** Create contributions first for each nonzero parsed component and one `ALWAYS` pass; collect every absent matrix component column; aggregate only by the defined material identity; derive missing material PHCs from included contributions; preserve first-contribution ordering for deterministic display.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom.test.js`.
- [ ] **Step 5: Run relevant regression** with `npm test && npm run build && git diff --check`; re-run the parser and matrix tests explicitly if a failure makes the calculation boundary unclear.
- [ ] **Step 6: Inspect scope** with `git diff -- src/domain/bom.js src/domain/bom.test.js`; verify no quantity logic enters `src/App.jsx` or `scripts/generate-combinations.mjs`.
- [ ] **Step 7: Commit scoped files** with `git add src/domain/bom.js src/domain/bom.test.js && git commit -m "feat: calculate BOM material totals"`.

## Task 4: Resolve PHC and expose calculation status

**Files:**
- Create: `src/domain/bom-phc.js`, `src/domain/bom-status.js`, `src/domain/bom-status.test.js`
- Modify: `src/domain/bom.js`
- Test: `src/domain/bom-status.test.js`

**Interfaces:**
- Consumes: `parseBomCsv`, `parseBomMdc`, `parseMaterialsMatrix`, and `calculateBomMaterials`.
- Produces: `createPhcLookup(csvText) -> { find(normalizedMdc): string | null }` and `calculateBom({ rawMdc, matrixCsvText, phcCsvText }) -> { state: "blocked" | "complete" | "incomplete", input: { originalMdc: string, normalizedMdc: string | null }, phc: { reference: string | null, status: "found" | "not_found" }, parsedComponents: Array<{ code: string, count: number }>, contributions: Array<object>, materialTotals: Array<object>, issues: Array<{ severity: "warning" | "problem", kind: string, message: string }>, exportEligibility: { pdf: boolean, excel: boolean } }`.

- [ ] **Step 1: Write RED tests** that assert: a fully mapped MDC absent from a PHC fixture is `complete` with a `phc_not_found` warning and both export flags true; an `AQ` MDC is `incomplete` with `unmapped_component` and PDF true; an included blank material PHC is `incomplete` with `missing_material_phc`, PDF true, Excel false; malformed `MDC_iS.CP10_M2Cl2mA` is `blocked` with neither export flag; and invalid matrix quantity is `blocked`. Assert a mixed fixture reports both unmapped and missing-PHC problems rather than stopping at one.
- [ ] **Step 2: Run RED** with `node --test src/domain/bom-status.test.js`; expect missing status/PHC APIs.
- [ ] **Step 3: Write the minimum orchestration.** Build the PHC map from `referencia_phc` and `assembly_code`, normalize registry assembly codes through `normalizeMdcReference`, run parse/matrix validation before engine calculation, convert every detected condition to the stated issue shape, and set eligibility without a second quantity calculation.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom-status.test.js`.
- [ ] **Step 5: Run relevant regression** with `npm test && npm run build && git diff --check && node --test test/phc-identity.test.js`; do not change `phc_integration.csv` or `all_reply_combinations_filtered.csv`.
- [ ] **Step 6: Inspect scope** with `git diff -- src/domain/bom.js src/domain/bom-phc.js src/domain/bom-status.js src/domain/bom-status.test.js`; confirm PHC lookup is read-only and selector PHC candidates remain untouched.
- [ ] **Step 7: Commit scoped files** with `git add src/domain/bom.js src/domain/bom-phc.js src/domain/bom-status.js src/domain/bom-status.test.js && git commit -m "feat: report BOM status and PHC lookup"`.

## Task 5: Lock a representative runtime calculation contract

**Files:**
- Create: `test/bom-runtime-contract.test.js`, `test/fixtures/bom/materials_matrix.csv`, `test/fixtures/bom/phc_integration.csv`
- Modify: none
- Test: `test/bom-runtime-contract.test.js`

**Interfaces:**
- Consumes: `calculateBom({ rawMdc, matrixCsvText, phcCsvText })`.
- Produces: a stable end-to-end domain fixture contract for future UI and export work; it adds no runtime behavior.

- [ ] **Step 1: Write RED fixture assertions** against the real-form MDC `MDC_iS.CP10_D2BDP+1BDC_M3Cl2mA/pH/CD.PT_CF_BDW`: assert normalized identity, PHC lookup result from fixture, parsed counts, CP10/BDP/BDC/CF/BDW contributions, one ALWAYS contribution per matrix row, deterministic Materials Total rows, and blank `material_phc` values yielding Excel false but PDF true. Add one `AQ` reference that remains parse-valid and incomplete due solely to missing column.
- [ ] **Step 2: Run RED** with `node --test test/bom-runtime-contract.test.js`; expect fixture/module absence.
- [ ] **Step 3: Add minimal fixtures only.** Copy no production CSV wholesale; use concise matrix and PHC fixture data that describes the exact assertions and confirms calculation never reads selector prices or labels.
- [ ] **Step 4: Run GREEN** with `node --test test/bom-runtime-contract.test.js`.
- [ ] **Step 5: Run relevant regression** with `npm test && npm run build && git diff --check`; execute `shasum -a 256 all_reply_combinations_filtered.csv`, `npm run generate:combinations`, then assert 5,940 rows, SHA-256 `221aee09ae3f3faf64b57e7c0a9627f892c354dc3e761cdadfc94c87ee3e2a84`, and no generated-CSV diff.
- [ ] **Step 6: Inspect scope** with `git diff -- test/bom-runtime-contract.test.js test/fixtures/bom`; confirm production runtime CSVs and generated output are unchanged.
- [ ] **Step 7: Commit scoped files** with `git add test/bom-runtime-contract.test.js test/fixtures/bom/materials_matrix.csv test/fixtures/bom/phc_integration.csv && git commit -m "test: protect BOM runtime calculation contract"`.

## Task 6: Record local export history without calculation side effects

**Files:**
- Create: `src/domain/bom-history.js`, `src/domain/bom-history.test.js`
- Modify: none
- Test: `src/domain/bom-history.test.js`

**Interfaces:**
- Consumes: a Web Storage-compatible object exposing `getItem(key)` and `setItem(key, value)`, `normalizedMdc`, optional PHC reference, export format `"pdf" | "excel"`, and injected `now()`.
- Produces: `createBomHistoryStore({ storage, now, key = "rp12-materials-bom-history" })` with `eventsFor(normalizedMdc)`, `requiresConfirmation(normalizedMdc, format)`, and `recordSuccessfulExport({ normalizedMdc, phcReference, format })`. Events are `{ normalizedMdc, phcReference: string | null, format, exportedAt: string }`.

- [ ] **Step 1: Write RED tests** using in-memory storage and fixed time. Assert an initial `eventsFor` returns `[]` and performs no `setItem`; recording PDF then Excel gives two independent events; a second PDF makes only PDF require confirmation; a failed/cancelled export represented by not calling `recordSuccessfulExport` leaves storage unchanged; and a differently normalized MDC has no events.
- [ ] **Step 2: Run RED** with `node --test src/domain/bom-history.test.js`; expect missing history module.
- [ ] **Step 3: Write the minimum adapter.** Parse absent storage as an empty array, validate stored records before returning them, filter by exact normalized MDC, and append only a valid successful export event. Do not expose a calculation or preview write method.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom-history.test.js`.
- [ ] **Step 5: Run relevant regression** with `npm test && npm run build && git diff --check`.
- [ ] **Step 6: Inspect scope** with `git diff -- src/domain/bom-history.js src/domain/bom-history.test.js`; confirm no history is coupled to selector state, a backend, or any runtime CSV.
- [ ] **Step 7: Commit scoped files** with `git add src/domain/bom-history.js src/domain/bom-history.test.js && git commit -m "feat: record local BOM export history"`.

## Task 7: Create one export model and the PDF adapter

**Files:**
- Create: `src/domain/bom-export.js`, `src/domain/bom-export.test.js`, `src/bomPdf.js`, `src/bomPdf.test.js`
- Modify: `package.json`, `package-lock.json`
- Test: `src/domain/bom-export.test.js`, `src/bomPdf.test.js`

**Interfaces:**
- Consumes: a non-blocked result from `calculateBom` and `jspdf` as `jsPDF`.
- Produces: `createBomExportModel(result) -> { normalizedMdc, phcReference: string | null, state: "complete" | "incomplete", issues: Array<object>, rows: Array<{ materialPhc: string, description: string, quantity: number }> }`; `assertBomPdfEligible(result)`; `assertBomExcelEligible(result)`; and `saveBomPdf({ model, createPdf, filename }) -> Promise<void>`. `saveBomPdf` writes only `model.rows`, never contributions.

- [ ] **Step 1: Write RED tests** that pass already-calculated complete and incomplete results to `createBomExportModel`; assert exports contain totals but no `sourceComponent`, show normalized MDC/PHC/state/issues, allow PDF for incomplete, and reject blocked result. Test `assertBomExcelEligible` schema-neutrally: allow a complete result with PHCs on every included material; allow a result incomplete only because an unmapped technical component while every included material has a PHC; reject any included blank `materialPhc`; and reject a blocked result. Test `saveBomPdf` with a fake `createPdf` recording text/table/save calls; assert its filename is derived from normalized MDC and it receives the same totals rows. Test no history write here because history stays in the UI orchestration boundary.
- [ ] **Step 2: Run RED** with `node --test src/domain/bom-export.test.js src/bomPdf.test.js`; expect missing export modules.
- [ ] **Step 3: Add the justified PDF dependency and minimum adapters.** Run `npm install jspdf`; use it only in `src/bomPdf.js` to create a browser-downloadable consolidated BOM PDF. `src/domain/bom-export.js` remains dependency-free and performs no calculation. The adapter resolves only after `pdf.save(filename)` completes; callers may then record the export event. Do not select `xlsx`, `exceljs`, or another Excel package because the client has not supplied the PHC import schema.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom-export.test.js src/bomPdf.test.js` and `npm test`.
- [ ] **Step 5: Run relevant regression** with `npm run build && git diff --check`; confirm the dependency lockfile change is limited to `jspdf` and its transitive packages.
- [ ] **Step 6: Inspect scope** with `git diff -- package.json package-lock.json src/domain/bom-export.js src/bomPdf.js`; confirm no Excel serialization and no selector PDF modification.
- [ ] **Step 7: Commit scoped files** with `git add package.json package-lock.json src/domain/bom-export.js src/domain/bom-export.test.js src/bomPdf.js src/bomPdf.test.js && git commit -m "feat: export BOM totals as PDF"`.

## Task 8: Gate PHC Excel serialization on client schema

**Files:**
- Create: none until the client provides an approved schema artifact
- Modify: none until the client provides an approved schema artifact
- Test: none until the client provides an approved schema artifact

**Interfaces:**
- Consumes: `createBomExportModel(result)` and `assertBomExcelEligible(result)` from Task 7, plus the Task 9 `MaterialsTool` history orchestration (`requiresConfirmation`, `recordSuccessfulExport`, displayed history refresh, stale state). These contracts are complete and testable before this gate.
- Produces after the gate: a generically named schema-specific serializer and browser export adapter, tests whose exact file type, column names, column order, required values, and formatting rules match the client-supplied PHC schema, and the Task 9 Excel control wired to that adapter.

- [ ] **Step 1: Obtain and record the client’s PHC import contract** containing file type, exact header names, header order, required/optional columns, quantity representation, and formatting/import constraints. Reject verbal assumptions and do not write serializer code before this evidence exists.
- [ ] **Step 2: Write RED tests from the supplied contract** using `createBomExportModel(result)` as input. Assert every output header and its order, each row mapping, material-PHC requirement, quantity encoding, filename convention if specified, and rejection when `assertBomExcelEligible(result)` fails. Add Task 9 orchestration tests proving stale or blocked results cannot invoke the adapter, a previous normalized-MDC `"excel"` event requires confirmation immediately before export, cancelled/failed export creates no history, and a successful export appends `recordSuccessfulExport({ normalizedMdc, phcReference, format: "excel" })` then refreshes displayed Excel history.
- [ ] **Step 3: Run RED** using the exact Node test command for the new serializer test; expect a missing serializer export or an assertion mismatch against the absent implementation.
- [ ] **Step 4: Select an Excel dependency only if the approved file type cannot be produced with already-installed browser capabilities.** Record the dependency choice and its browser/static-package justification in the task’s implementation review; keep it isolated to the Excel adapter and do not alter calculation logic.
- [ ] **Step 5: Write the minimum generic serializer and browser adapter** that map only the Task 7 export model into the approved schema, reject ineligible results before creating a file, and resolve only after the browser export call succeeds. Name the adapter from the supplied format at implementation time rather than assuming XLSX.
- [ ] **Step 6: Wire the Task 9 Excel control** to check confirmation immediately before invoking the adapter, append its Excel history event only after adapter success, refresh history after success, and leave history untouched when confirmation is declined or the adapter rejects.
- [ ] **Step 7: Run GREEN and regression** with the exact serializer and orchestration tests, `npm test`, `npm run build`, and `git diff --check`; verify PDF behavior and the existing selector remain unchanged.
- [ ] **Step 8: Inspect and commit the approved scope** using only files required by the client schema and the Task 9 Excel wiring, with a message of the form `feat: export PHC-ready BOM file`; do not alter matrix mappings or BOM quantities in this task.

Tasks 1–7 and 9 can proceed without the Excel schema because Excel eligibility and the schema-neutral totals model already exist. Task 8 is the sole client-input execution gate and may execute after Task 9 when the client supplies the schema.

## Task 9: Present the separate Materials workspace and wire runtime data

**Files:**
- Create: `src/MaterialsTool.jsx`, `src/domain/bom-ui-state.js`, `src/domain/bom-ui-state.test.js`
- Modify: `src/App.jsx:1-18, 480-540, render return`, `src/styles.css`, `scripts/prepare-client-release.mjs:17-23`
- Test: `src/domain/bom-ui-state.test.js`

**Interfaces:**
- Consumes: `calculateBom`, `createBomHistoryStore`, `createBomExportModel`, `assertBomPdfEligible`, `assertBomExcelEligible`, and `saveBomPdf`; fetches `${import.meta.env.BASE_URL}materials/materials_matrix.csv` and `${import.meta.env.BASE_URL}phc_integration.csv` with `cache: "no-store"`.
- Produces: `createMaterialsViewState({ rawMdc, result, historyEvents })` from `src/domain/bom-ui-state.js`, returning `{ isStale: boolean, canExportPdf: boolean, canExportExcel: boolean, componentRows: Array<object>, totalRows: Array<object>, historyEvents: Array<object> }`; and `<MaterialsTool />`, which owns loading, view selection, history-store calls, and browser interactions. It accepts no selector question rows or pricing values.

- [ ] **Step 1: Write RED UI-contract tests** in `src/domain/bom-ui-state.test.js`. Assert input change after a result marks `isStale: true`; a blocked result yields no component or total rows; a successful calculation exposes supplied history events without writing them; Components view receives contributions; Materials Total receives only `materialTotals`; and PDF is exportable only when the result is non-stale and `exportEligibility.pdf` is true. Keep same-format confirmation in `MaterialsTool` by calling `requiresConfirmation(normalizedMdc, "pdf")` immediately before `saveBomPdf`.
- [ ] **Step 2: Run RED** with `node --test src/domain/bom-ui-state.test.js`; expect the module/export to be absent.
- [ ] **Step 3: Write the minimum UI and release wiring.** Add a clearly labelled selector/materials workspace control in `App.jsx`, retaining current selector as the default and leaving its computation functions untouched. Load both runtime CSVs in `MaterialsTool`; calculate with the domain pipeline; show normalized MDC, PHC or `PHC reference not found`, state, all warnings/problems, Components / Materials provenance, and Materials Total. Disable export for stale/blocked results; on a completed PDF save, append one history event; on cancel/failure, append none. Show prior local events and date/time after calculation. Show Excel eligibility and a non-exporting “client schema required” explanation while Task 8 remains gated. Add `{ source: "public/materials", target: "materials" }` to `directoriesToCopy` in the release script. Scope all CSS under Materials class names and add print styles for consolidated totals only.
- [ ] **Step 4: Run GREEN** with `node --test src/domain/bom-ui-state.test.js` and `npm test`.
- [ ] **Step 5: Run relevant regression** with `npm run build && npm run build:client && git diff --check`; run `node scripts/prepare-client-release.mjs` after the client build and verify `release/mdc_tool/materials/materials_matrix.csv` exists without changing the protected ZIP.
- [ ] **Step 6: Inspect scope and manually smoke-test** using `npm run dev`: selector remains default and functional; Materials shows stale state after changing input; malformed MDC blocks; a mapped input shows both views; PDF view excludes provenance rows; same-format confirmation occurs before a repeat export.
- [ ] **Step 7: Commit scoped files** with `git add src/MaterialsTool.jsx src/domain/bom-ui-state.js src/domain/bom-ui-state.test.js src/App.jsx src/styles.css scripts/prepare-client-release.mjs && git commit -m "feat: add Materials BOM workspace"`.

## Task 10: Perform acceptance and prepare the static client release

**Files:**
- Create: none
- Modify: `README.md`, `README_for_client.txt` only if the tested Materials workflow needs client instructions
- Test: none; execute existing and earlier test suites

**Interfaces:**
- Consumes: the complete Tasks 1–7 and 9 implementation; consumes Task 8 only when the client Excel schema has been supplied and its serializer committed.
- Produces: a pre-schema static-package verification checkpoint or, after Task 8, verified final client package instructions; no new domain interface.

- [ ] **Step 1: Write RED acceptance checks as a release checklist** in the existing README files only if no equivalent client-facing checklist exists. The checklist must require manual MDC calculation, malformed-input block, PHC-not-found warning, unmapped/incomplete PDF state, missing-material-PHC Excel block, local-history visibility, same-format confirmation, and selector smoke test.
- [ ] **Step 2: Run the pre-schema acceptance checkpoint** with `npm test`, `npm run build`, and `npm run build:client`; expect failure only if a required implemented behavior is absent, then stop to repair it in its owning task rather than adding workaround code here. This checkpoint verifies the implemented PDF workflow but does not declare the complete approved BOM feature released.
- [ ] **Step 3: Make minimum documentation/release changes.** Explain `public/materials/materials_matrix.csv` is client editable, identify its required identity/`ALWAYS` columns, state blank material PHCs make Excel unavailable while PDF remains available, and state the actual Excel file is unavailable until the client schema is approved. Do not describe unimplemented Excel output as delivered or authorize an interim release.
- [ ] **Step 4: Run final automated verification**:

  ```bash
  npm test
  npm run build
  git diff --check
  shasum -a 256 all_reply_combinations_filtered.csv
  npm run generate:combinations
  shasum -a 256 all_reply_combinations_filtered.csv
  git diff -- all_reply_combinations_filtered.csv
  npm run release:client
  ```

  Expect 5,940 generated combinations, both SHA-256 values exactly `221aee09ae3f3faf64b57e7c0a9627f892c354dc3e761cdadfc94c87ee3e2a84`, no generated-CSV diff, and the canonical `/mdc_tool/` client package containing `materials/materials_matrix.csv`. Do not change `release-version.json` unless separately authorized, and do not touch the protected ZIP.
- [ ] **Step 5: Run final manual static-package verification** from `release/mdc_tool` using a static server: verify Vite base paths, fonts, existing selector, Materials runtime CSV fetch, PDF generation, stale state, local history, and no selector-price effect. After Task 8 is complete, also verify the approved Excel export path. Before Task 8, treat this only as a pre-release checkpoint; final BOM release remains gated until the Excel contract is implemented, unless a later explicit user decision authorizes an interim PDF-only Materials/BOM release.
- [ ] **Step 6: Inspect scope** with `git diff --check`, `git diff -- README.md README_for_client.txt`, and `git status --short`; confirm no changes to questions, PHC registry, generated combinations, protected ZIP, release version, or changelog unless separately requested.
- [ ] **Step 7: Commit scoped release documentation** with `git add README.md README_for_client.txt` only when changed, then `git commit -m "docs: document Materials BOM workflow"`. If neither README needs a change, make no empty commit and report that Task 10 added no source changes.

## Plan Self-Review

### Spec coverage

| Approved design area | Planned task(s) |
| --- | --- |
| Separate static scope, architecture, and non-goals | Global Constraints; Tasks 1–10 |
| Single dynamic runtime matrix and confirmed initial mappings | Task 2 |
| Normalization, protected grammar, malformed distinction | Task 1 |
| Contribution-first calculations, ALWAYS, aggregation, blank-PHC identity | Task 3 |
| PHC lookup, statuses, warnings, export eligibility | Task 4 |
| Representative real-MDC data-independence fixture | Task 5 |
| Browser-local history and repeat-export rules | Task 6; Task 9 |
| Export-neutral totals model and PDF-only consolidated output | Task 7 |
| Client-dependent PHC Excel serializer | Task 8 |
| Separate UI, two views, stale-result behavior, runtime data loading | Task 9 |
| Tests, selector/generator protection, release package, client guidance | Every task; Task 10 |
| Open dependencies and no guessed material PHCs/mappings/schema | Global Constraints; Tasks 2, 7, 8, 9, 10 |

### Placeholder scan

The mandated placeholder scan returns no matches. The Excel client-schema gate names the evidence required before Task 8 code can begin; it does not defer any defined behavior without a contract.

### Interface consistency

- Task 1 defines `parseBomMdc`; Task 4 consumes it through `calculateBom`.
- Task 2 defines `parseBomCsv` and `parseMaterialsMatrix`; Task 4 consumes both through `calculateBom`.
- Task 3 defines `calculateBomMaterials`; Task 4 turns its output into the public calculation result.
- Task 4 defines `calculateBom`; Tasks 5, 7, and 9 consume its stated result fields.
- Task 6 defines history methods; Task 9 performs lookup after calculation and records only after PDF completion.
- Task 7 defines the export model and eligibility assertions; Task 8 and Task 9 use those exact names without recomputing materials.

### Task sizing and YAGNI

Each task has one independently reviewable boundary: parsing, matrix data, quantities, status/PHC, fixture protection, history, PDF, Excel schema gate, UI, and release acceptance. No backend, database, matrix editor, material pricing, BOM pre-generation, shared synchronization, prototype transplant, or speculative Excel library is planned.
