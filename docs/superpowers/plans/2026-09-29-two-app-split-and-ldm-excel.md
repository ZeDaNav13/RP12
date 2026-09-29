# RP12 Two-App Split and LDM Excel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two independently deployable static RP12 tools: the existing MDC Selector at `/selector/` and the LDM — Lista de Materiais at `/lista_materiais/`. Keep their shared technical domain rules in the same source repository, preserve existing selector and LDM contracts, and make the LDM Excel export a clean Materials Total workbook.

**Architecture:** Replace the combined workspace switch with two React app roots and two Vite entry roots. Each root mounts only its own workspace and receives a dedicated base path, build output, client package, ZIP, and runtime-data allowlist. Shared calculations remain source modules; compiled bundle duplication is acceptable. The Excel workflow keeps its existing eligibility, confirmation, and local-history orchestration, but its serializer writes only the LDM Materials Total table.

**Tech Stack:** React 18, Vite 5, JavaScript, Node test runner, static client packages, runtime CSV data.

**Spec:** `docs/superpowers/specs/2026-09-29-two-app-split-and-ldm-excel-design.md`

## Global Constraints

- Work from the canonical repository only. `.prototype-reference/` is read-only evidence, never an implementation source.
- Complete the two reviewed dirty baselines before beginning the app split. Do not mix their source files with generated `release/mdc_tool/` output.
- Keep LDM as the user-facing term. Existing internal `bom-*` module names are retained; this is not a rename campaign.
- Do not introduce a backend, authentication, database, API, monorepo, shared landing page, workspace navigation, selector-pricing change, or unrelated UX work.
- Preserve the technical generator invariant before and after every task that can affect selector data or shared technical rules:

  ```bash
  shasum -a 256 all_reply_combinations_filtered.csv
  npm run generate:combinations
  shasum -a 256 all_reply_combinations_filtered.csv
  git diff -- all_reply_combinations_filtered.csv
  ```

  The generator must report `5940` combinations, the SHA-256 must remain `221aee09ae3f3faf64b57e7c0a9627f892c354dc3e761cdadfc94c87ee3e2a84`, and the final CSV diff must be empty.
- Every task follows this non-negotiable sequence: Codex packet → local verification evidence → external review → any requested correction packet → explicit commit-only authorization → commit evidence → Notion update → next task. Never implement and commit under the same authorization.
- Every task must finish with a scoped `git diff --check`, `git status --short`, a complete reviewable diff, and an external-review handoff. Commit only after a separate explicit authorization, staging only that task's reviewed files.
- Do not run `release:client`, regenerate a ZIP, clean `release/`, or stage generated release output except in the dedicated packaging/acceptance tasks and only after preserving the user-approved source baselines.
- If any implementation test, build, package check, browser smoke, or other behavior fails unexpectedly, stop and use the `systematic-debugging` workflow before proposing or applying a fix. A correction still follows test-driven development: reproduce/RED → minimum correction → GREEN → regressions → diff review. Do not improvise fixes while executing a verification or acceptance task.

## Review Focus

1. Selector and LDM must be independently runnable and deployable, with no workspace switch, cross-app navigation, or runtime data leakage.
2. The selector's 5,940 canonical references and fixed SHA must remain byte-for-byte unchanged.
3. LDM must retain matrix `null` versus explicit `0` semantics, incomplete status, Materials Total aggregation, print/PDF behavior, Excel eligibility, and local history rules.
4. Client packages must include only their documented runtime assets and never rely on sibling folders.
5. The Excel workbook must contain exactly one Materials Total sheet/table with no MDC, equipment-PHC, status, issue, provenance, or history rows.

---

## Phase 0 — Close the Reviewed Baselines

### Task 1: Commit the reviewed LDM master-matrix semantics baseline

**Files:**
- Modify: `public/materials/materials_matrix.csv`, `src/domain/bom-matrix.js`, `src/domain/bom-matrix.test.js`, `src/domain/bom.js`, `src/domain/bom.test.js`, `src/domain/bom-status.test.js`
- Test: existing tests in the same domain modules

**Interfaces:**
- Consumes: canonical `all_reply_combinations_filtered.csv` component identities and the editable materials matrix.
- Produces: complete current-component coverage; blank matrix quantities as unknown (`null`); explicit `0` as a confirmed zero contribution; incomplete rather than blocked status for selected unknown contributions; known positive contributions retained alongside unknown mappings; missing/blank material PHC as incomplete but Excel-eligible; unmapped-component-only incompleteness as Excel-eligible; and unchanged blocked/stale behavior.

- [ ] Capture `git status --short`, `git diff --stat`, and a named list of the Task 1 baseline paths. Confirm that all `release/mdc_tool/` changes are generated output and are excluded from this baseline.
- [ ] Focused baseline verification: run `node --test src/domain/bom-matrix.test.js src/domain/bom.test.js src/domain/bom-status.test.js` against the reviewed baseline contract. If any test fails, stop and report; do not implement a fix inside this closure task. A separate correction packet and review are required.
- [ ] Broader regression verification: run `npm test`, `npm run build`, and `git diff --check`; record the passing counts and build result. If any check fails, stop for a separate correction packet.
- [ ] Run the exact generator invariant commands in **Global Constraints**; record the row count, both hashes, and empty generated-CSV diff.
- [ ] Perform a fresh LDM smoke without rewriting or staging `release/`: build/serve a disposable copy of the current output, calculate a selected mapping with an unknown (`null`) quantity and verify incomplete status, then calculate a known positive contribution and verify it remains included. Record the current URL, inputs, observed state, and result rows; do not rely on prior smoke evidence.
- [ ] Inspect `git diff --` for exactly the six listed source/data files; verify no React, selector, export, package, release, or generated-output file joined the task.
- [ ] Request external review with the complete task diff, focused/full test evidence, build evidence, generator evidence, and `git status --short`.
- [ ] **Commit only after external approval:** stage only the six listed files, re-run `git diff --cached --check`, show `git diff --cached --name-only`, commit with the separately approved message, then record commit evidence and update Notion before Task 2.

### Task 2: Commit the reviewed Task 10 LDM UI and localization baseline

**Files:**
- Modify: `src/App.jsx`, `src/MaterialsTool.jsx`, `src/styles.css`, `test/materials-excel-ui-contract.test.js`
- Create: `src/materials-ui-copy.js`, `src/materials-ui-copy.test.js`, `test/final-ui-refinement-contract.test.js`, `test/materials-issue-details-ui-contract.test.js`, `test/materials-localization-ui-contract.test.js`, `test/materials-print-history-ui-contract.test.js`

**Interfaces:**
- Consumes: existing LDM result, issue, history, print, and Excel workflow models.
- Produces: reviewed PT-PT visible LDM copy, issue-detail rendering, narrow-screen rules, print-only equipment-PHC context, and existing browser-print / Excel-only activity behavior.

- [ ] Capture the status/diff for only the listed Task 10 paths and explicitly exclude `release/mdc_tool/` generated files from staging and review scope.
- [ ] Focused baseline verification: run `node --test test/final-ui-refinement-contract.test.js test/materials-issue-details-ui-contract.test.js test/materials-localization-ui-contract.test.js test/materials-print-history-ui-contract.test.js test/materials-excel-ui-contract.test.js src/materials-ui-copy.test.js`. If any reviewed assertion fails, stop; corrections require a separate packet and review.
- [ ] Broader regression verification: run `npm test`, `npm run build`, and `git diff --check`. If any check fails, stop for a separate correction packet.
- [ ] Run the generator invariant commands exactly as specified in **Global Constraints**, even though the task is UI-only, to preserve the canonical release evidence.
- [ ] Perform fresh relevant UI smoke evidence without regenerating or staging release output: verify PT-PT visible LDM copy, calculation/result flow, browser `window.print()` / PDF presentation, Excel-only Activity, and the tested narrow viewport behavior including horizontal materials-table scrolling and full-width action layout. Record PASS/FAIL and the viewport used.
- [ ] Inspect the complete diff and confirm PDF remains `window.print()`, PDF history/confirmation remain absent, Activity remains Excel-only, Excel behavior is unchanged, and no domain/runtime/package change joined the UI baseline.
- [ ] Request external review with the complete diff and all verification evidence.
- [ ] **Commit only after external approval:** stage exactly the listed Task 10 files, verify cached names/check, commit under separately authorized wording, record the commit, update Notion, and only then begin Phase 1.

## Phase 1 — Independent React App Roots

### Task 3: Extract selector and LDM roots and remove workspace navigation

**Files:**
- Create: `src/SelectorApp.jsx`, `src/MaterialsApp.jsx`, `src/shared/ToolHeader.jsx`, `test/app-entry-isolation-contract.test.js`
- Modify: `src/MaterialsTool.jsx`, `src/styles.css`, selector/LDM source-contract tests that currently read `src/App.jsx`
- Delete: `src/App.jsx` after all selector source-contract tests target `src/SelectorApp.jsx`

**Interfaces:**
- Consumes: current selector state/technical helper imports and the current `MaterialsTool` public component.
- Produces: `SelectorApp`, `MaterialsApp`, and `ToolHeader({ title })`; neither app exposes a workspace switch, a link to the other app, nor cross-workspace state.

- [ ] RED: create `test/app-entry-isolation-contract.test.js` before extraction. It must assert: `SelectorApp` does not import/render `MaterialsTool`, does not declare `workspace`/`setWorkspace`, and does not fetch LDM data; `MaterialsApp` does not import selector question definitions/helpers or fetch `questions/`; `ToolHeader` renders a title/logo only and no navigation control. The current combined `App.jsx` must fail this contract.
- [ ] Run `node --test test/app-entry-isolation-contract.test.js` and record the intended RED: the current combined component contains workspace state/switching and both data paths.
- [ ] GREEN: move the existing selector implementation, including its current technical-helper and price behavior, into `SelectorApp`; create `MaterialsApp` as the LDM-only shell around `MaterialsTool`; introduce the shared presentational header with no app-selection control; remove the workspace switch and its dead responsive styles; update source-contract test file paths deliberately rather than weakening their assertions.
- [ ] Keep document titles as app-root concerns: Selector must set `Ferramenta MDC - Selector`; LDM must set `Ferramenta MDC - Materiais`. Do not introduce routing, URL changes, location/history manipulation, or a title subsystem.
- [ ] GREEN verification: run `node --test test/app-entry-isolation-contract.test.js test/app-phc-candidate-contract.test.js test/final-ui-refinement-contract.test.js test/materials-localization-ui-contract.test.js`, then `npm test`, `npm run build`, and `git diff --check`.
- [ ] Run the generator invariant commands and verify the diff contains no CSV, generator, PHC registry, pricing, or export workflow change.
- [ ] Request external review of the full source/test diff, with special attention to deletion of `src/App.jsx`, retained selector behavior, and absence of cross-app imports.
- [ ] **Commit only after external approval:** stage only Task 3's reviewed root, style, and contract files; verify cached scope/check; commit on the separate authorization; record evidence and update Notion.

### Task 4: Add independent Vite entry points, development commands, and build outputs

**Files:**
- Create: `apps/selector/index.html`, `apps/selector/main.jsx`, `apps/lista_materiais/index.html`, `apps/lista_materiais/main.jsx`, `test/two-app-build-contract.test.js`
- Modify: `vite.config.js`, `package.json`, applicable existing entry/source-contract tests
- Delete: legacy root `index.html` and `src/main.jsx` only after both dedicated entries build and their direct imports are proven

**Interfaces:**
- Consumes: `SelectorApp`, `MaterialsApp`, the repository `public/` source assets, and Vite mode configuration.
- Produces: `npm run dev:selector`, `npm run dev:ldm`, `npm run build:selector`, `npm run build:ldm`, and aggregate `npm run build`; production bases `/selector/` and `/lista_materiais/`; outputs `dist/selector/` and `dist/lista_materiais/`.

- [ ] RED: add `test/two-app-build-contract.test.js` that requires explicit per-app package scripts, app-root HTML documents with their matching initial titles, `SelectorApp` only in the selector entry, `MaterialsApp` only in the LDM entry, and production bases/output directories exactly matching the two deployment roots. It must also reject `/mdc_tool/` as either app's production base.
- [ ] Run `node --test test/two-app-build-contract.test.js` and record the intended RED: no independent entry scripts/roots or matching Vite modes exist.
- [ ] GREEN: configure Vite by explicit `selector` and `ldm` modes. Each mode uses its own app-root directory, repository `public/` directory for development/runtime source access, repository-root filesystem allowlist, matching base path, and isolated output directory. Add the four per-app scripts plus aggregate `build` and retain no ambiguous legacy `dev`/`build:client` entry point.
- [ ] In each app `main.jsx`, mount only its app root and import shared styles. Keep static source data canonical under `public/`; the release assembler, not a second source-data copy, will enforce package boundaries in Task 5.
- [ ] GREEN verification: run `node --test test/two-app-build-contract.test.js`, `npm run build:selector`, `npm run build:ldm`, `npm test`, `npm run build`, and `git diff --check`. Inspect both output HTML files to verify `/selector/` and `/lista_materiais/` asset bases.
- [ ] Run the generator invariant commands. Confirm no public question CSV, materials matrix, PHC registry, selector logic, or generator logic changed.
- [ ] Request external review with complete Vite/package/entry diff and build-output evidence. Review must explicitly approve the base-path and output-dir contract before packaging changes.
- [ ] **Commit only after external approval:** stage only Task 4 entry/config/test files, show cached scope/check, commit under separate authorization, record evidence, and update Notion.

## Phase 2 — Release Packaging Split

### Task 5: Build two isolated client packages and versioned delivery ZIPs

**Files:**
- Create: `README_selector_for_client.txt`, `README_lista_materiais_for_client.txt`, `test/two-app-release-contract.test.js`
- Modify: `scripts/prepare-client-release.mjs`, `package.json`, `README.md`, `README_for_client.txt`
- Delete: obsolete single-package release instructions only after the two client instructions replace their purpose

**Interfaces:**
- Consumes: `dist/selector/`, `dist/lista_materiais/`, `release-version.json`, canonical `public/` source assets, and the current ZIP utility.
- Produces: `release/selector/`, `release/lista_materiais/`, `selector_ready_to_upload.zip`, `selector_ready_to_upload_v<version>.zip`, `lista_materiais_ready_to_upload.zip`, and `lista_materiais_ready_to_upload_v<version>.zip`.

- [ ] RED: add `test/two-app-release-contract.test.js` first. Against the current one-package script, require a testable packager interface `node scripts/prepare-client-release.mjs [--app selector|ldm] [--zip] [--release-root <temporary-directory>]`, two release roots, and exact runtime manifests.
- [ ] The selector manifest test must require only built `index.html`/`assets`, favicon/apple assets, fonts, `styleguide.json`, `questions/`, and the selector client README. It must reject `materials/`, `phc_integration.csv`, `all_reply_combinations_filtered.csv`, and the LDM README.
- [ ] The LDM manifest test must require only built `index.html`/`assets`, favicon/apple assets, fonts, `styleguide.json`, `materials/materials_matrix.csv`, `phc_integration.csv`, and the LDM client README. It must reject `questions/`, `all_reply_combinations_filtered.csv`, and the selector README.
- [ ] Run `node --test test/two-app-release-contract.test.js` and record the intended RED: the current script creates only `release/mdc_tool` and single `mdc_tool_ready_to_upload` ZIPs.
- [ ] GREEN: refactor the packager to copy only each app's compiled `index.html` and `assets` from its `dist` directory, then add only the matching manifest data. Do not copy the entire Vite output because Vite's public copy can include the other app's source data. Make `--release-root` support a disposable test location; use `--app` for one-app preparation and `--zip` for ZIP creation. Read the existing version solely from `release-version.json`; do not create a version system.
- [ ] Update `release:prepare` and `release:client` to generate combinations, build both apps, and invoke the aggregate two-app packager. Add optional per-app package scripts only if they call the same packager and retain the same manifest contract.
- [ ] Update README and both client instructions with the two deployment URLs, package contents, independent delivery names, and runtime editable CSV locations. Do not claim a shared landing page or package-wide data access.
- [ ] GREEN verification: run the release-contract test against a temporary release root, `npm test`, `npm run build`, and `git diff --check`. Then run the generator invariant commands before and after the aggregate release preparation; inspect `git diff -- all_reply_combinations_filtered.csv` and never stage generated `release/` output or ZIPs.
- [ ] Request external review of the complete packaging/docs/test diff, the temporary package trees, ZIP-name evidence, and generated-output exclusions.
- [ ] **Commit only after external approval:** stage only Task 5 script/package/docs/test files. Do not stage `dist/`, `release/`, or ZIP artifacts. Verify cached scope/check, commit after separate authorization, record evidence, and update Notion.

## Phase 3 — Clean LDM Excel Serializer

### Task 6: Serialize Materials Total as a table-only workbook

**Files:**
- Modify: `src/bomExcel.js`, `src/bomExcel.test.js`
- Test: `src/domain/bom-status.test.js`, `src/domain/bom-ui-state.test.js`, `src/domain/bom-export.test.js`, `src/domain/bom-excel-workflow.test.js`, `test/materials-excel-ui-contract.test.js`, existing print/PDF contracts

**Interfaces:**
- Consumes: the existing `createBomExportModel()` materials-total rows and existing `exportBomExcel()` orchestration.
- Produces: one Excel worksheet containing row 1 exactly `Material PHC | Description | Quantity` and one row per consolidated Materials Total entry, in existing deterministic order.

- [ ] RED: update `src/bomExcel.test.js` first using an already Excel-eligible export model. Require exactly one sheet; row 1 exactly `Material PHC | Description | Quantity`; numeric quantity cells; and consolidated material rows beginning at row 2. Add negative assertions that the worksheet has no normalized MDC, equipment PHC, status, issue/warning, provenance/component, local-history, date, or export-control rows.
- [ ] Run `node --test src/bomExcel.test.js` and record the intended RED: the current workbook includes contextual MDC, equipment-PHC, state, and issue rows before the table, and uses `Total Qty` instead of `Quantity`.
- [ ] GREEN: make the serializer write one sheet whose first row is exactly `['Material PHC', 'Description', 'Quantity']`, followed directly by `model.rows` data. Keep workbook generation and download behavior intact. Do not change `createBomExportModel`, `exportBomExcel`, eligibility, stale-result handling, confirmation, history recording, PDF/print output, or UI copy.
- [ ] Verify the existing owners of eligibility/orchestration rather than moving rules into `bomExcel.js`: `src/domain/bom-status.test.js`, `src/domain/bom-ui-state.test.js`, `src/domain/bom-export.test.js`, and `src/domain/bom-excel-workflow.test.js` must prove that an included blank/missing material PHC is incomplete but Excel-eligible; its otherwise fresh export succeeds; the exported row retains an empty `Material PHC` cell; successful save writes Excel history; and repeat-export confirmation is unchanged. They must separately retain unmapped-component-only Excel eligibility and blocked/stale Excel ineligibility. Do not change any eligibility, history, or confirmation rule in the serializer task.
- [ ] GREEN verification: run `node --test src/bomExcel.test.js src/domain/bom-status.test.js src/domain/bom-ui-state.test.js src/domain/bom-export.test.js src/domain/bom-excel-workflow.test.js test/materials-excel-ui-contract.test.js test/materials-print-history-ui-contract.test.js`, then `npm test`, `npm run build`, and `git diff --check`.
- [ ] Run the generator invariant commands. Confirm the diff is limited to Excel serializer/tests and that selector, matrix, status, history, PDF/print, and package code did not change.
- [ ] Request external review with the complete serializer/test diff, generated workbook row evidence, and explicit confirmation that the browser-print PDF remains contextual while Excel is table-only.
- [ ] **Commit only after external approval:** stage only Task 6 files, verify cached scope/check, commit on separate authorization, record evidence, and update Notion.

## Phase 4 — Static-Package Final Acceptance

### Task 7: Verify each delivered static package in isolation

**Files:**
- Create: `test/two-app-static-package-contract.test.js` only if the Task 5 manifest test cannot cover the following static-file assertions without browser interaction.
- Modify: no production source unless a failing acceptance test identifies a scoped implementation defect and receives a separate correction authorization.

**Interfaces:**
- Consumes: the two release roots prepared by Task 5 and independently hosted static files.
- Produces: reproducible package-file evidence plus manual acceptance evidence that each tool works without the other package being present.

- [ ] RED: add the smallest static-package contract only if needed. It must fail when a package lacks its own `index.html`, assets, runtime CSVs, or includes the sibling application's runtime CSVs. It must check package trees, not source paths.
- [ ] Run `node --test test/two-app-static-package-contract.test.js` and capture the intended failure if the package test is newly needed; otherwise document that Task 5's release-contract test already covers this exact contract and do not duplicate it.
- [ ] GREEN only if RED exposed a package-boundary implementation defect; apply the smallest Task 5-script correction after a dedicated review authorization. Do not make cosmetic or unrelated UI changes during acceptance.
- [ ] Build and prepare both packages with the approved scripts. Before and after generation, run the exact generator invariant commands; the count must be `5940`, SHA must be `221aee09ae3f3faf64b57e7c0a9627f892c354dc3e761cdadfc94c87ee3e2a84`, and the generated CSV diff must be empty.
- [ ] Serve a temporary parent directory containing only `selector/` at `http://localhost:<port>/selector/`. Use canonical row 1 of `all_reply_combinations_filtered.csv` as the stable selector fixture: select `CP10`; select `Sem Bombas` in all four pump fields; select `Cloro 0-2 mA Reiss CS4`, `pH m0c`, and `Condutividade m0c`; select `Circuito Aberto de Arrefecimento` and `Água Limpa`. After the existing View action, expect MDC `MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW`, PHC `534.iS200000000001`, and the exact current `money()` display `4665,46 €` (U+00A0 before `€`). This fixture is stable because the canonical row contains those selections, PHC, and `total_price` `4665.46`; the generator SHA invariant protects it. Verify the title is `Ferramenta MDC - Selector` and no Materials navigation/data is exposed.
- [ ] Run `node --test test/phc-identity.test.js test/generator-technical-identity.test.js` alongside the generator SHA invariant as the named selector regression for that fixture. Do not substitute `phc_integration.csv`'s historical price for the Selector's displayed price.
- [ ] Serve a separate temporary parent directory containing only `lista_materiais/` at `http://localhost:<port>/lista_materiais/`. Use `test/bom-runtime-contract.test.js` with `test/fixtures/bom/materials_matrix.csv` and `test/fixtures/bom/phc_integration.csv` as the fixed LDM calculation fixture: `MDC_iS.CP10_D2BDP+1BDC_M3Cl2mA/pH/CD.PT_CF_BDW` normalizes unchanged, is `incomplete`, resolves `PHC-REP-001`, and has Materials Total assertions `MAT-M5 = 10`, blank-PHC `CF clamp = 2`, `MAT-BDW = 1`, and `MAT-ALWAYS = 1`. In the static package, enter the same MDC and verify the copied runtime matrix/PHC data load, the normalized MDC and actual incomplete result are shown, and the total rows remain visible; do not substitute the fixture totals for a different copied runtime matrix.
- [ ] Use `MDC_iS.CP10_M2Cl2mA` from `src/domain/bom-status.test.js` as the blocked fixture: it has `normalizedMdc: null`, one `malformed_mdc` issue naming `M2Cl2mA`, no material rows, and both exports unavailable. Use the existing stale-state transition from `src/domain/bom-ui-state.test.js`: after a calculation for `MDC_iS.CP10_M1Xx_AF`, change only the input to `MDC_iS.CP20_M1Xx_AF` without recalculating; expect a visible stale result and both exports unavailable.
- [ ] Verify LDM print/PDF context remains correct and Excel downloads only the Materials Total table for an Excel-eligible result. For the existing incomplete fixture with missing material PHCs, verify incomplete state, visible missing references, Excel availability, an exported row with an empty `Material PHC` cell, a normal Excel history event after successful save, and confirmation before a repeat Excel export. Separately retain an unmapped-component-only incomplete fixture with valid material PHCs as Excel-eligible, while blocked and stale results remain Excel-unavailable. Verify same-format Excel re-export confirmation and local-history recording remain export-time behavior.
- [ ] Record actual browser/manual results as PASS/FAIL; never claim browser verification that did not occur. Stop the temporary server and remove only its temporary directory, never `git clean` the repository or generated releases.
- [ ] Run `npm test`, `npm run build`, `git diff --check`, `git status --short`, and the package/static contract. Confirm no generated release output is staged.
- [ ] Request external final acceptance review with package trees, automated results, manual PASS/FAIL checklist, generator evidence, and full source diff.
- [ ] **Commit only after external approval:** if Task 7 added a test-only file, stage only that reviewed file. If acceptance found no source changes, make no commit. In either case, record final evidence and update Notion with the release/acceptance decision.

## Plan Self-Review Against the Design Spec

- **Design §§1–3, 6–8:** Tasks 3 and 4 replace the combined workspace with independent roots, entry points, bases, titles, and output directories while preserving shared source-only technical logic.
- **Design §§4–5, 9–10:** Task 5 defines exact runtime-data allowlists, package folders, versioned ZIP names, and app-specific client instructions; Task 7 verifies each package with its sibling absent.
- **Design §11:** Task 6 keeps the existing Excel eligibility/history workflow and changes only the serializer to the exact three-column Materials Total table. Task 7 confirms the workbook and contextual print/PDF boundary.
- **Design §§12–14:** Tasks 1–2 close the protected LDM/UI baselines first; every later task reruns the 5,940/SHA generator invariant where relevant and excludes generated release output from commits.
- **Design §15:** The phase sequence is baseline closure → roots → Vite builds → packages → Excel → static acceptance. No unsupported backend, auth, database, API, monorepo, or user-experience scope is introduced.
- **Eligibility and execution corrections:** Tasks 1, 6, and 7 preserve the current missing/blank-material-PHC baseline: incomplete but Excel-eligible, with blank `Material PHC` cells allowed in the clean workbook and successful Excel exports continuing to record history and require repeat-export confirmation. Serializer work changes presentation only; eligibility, history, and confirmation remain unchanged. Tasks 1–2 describe reviewed baseline verification accurately, require fresh smoke evidence, and the Global Constraints require systematic debugging before any unplanned fix.

## Execution Handoff

Begin with Task 1 only after its reviewed baseline file list is confirmed unchanged. At each review gate, provide the complete scoped diff and verification evidence, wait for explicit external approval, and require a separate commit-only instruction before staging or committing.
