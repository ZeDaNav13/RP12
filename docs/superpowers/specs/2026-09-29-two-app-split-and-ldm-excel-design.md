# RP12 Two-App Split and LDM Excel Design

**Status:** Approved design only. This document does not authorize implementation.

## Goal

RP12 remains one source repository, while the client receives two completely independent static applications:

1. **Selector**
2. **LDM — Lista de Materiais**

The client manages access for the two user groups in its existing system. RP12 does not add authentication, authorization, roles, users, login logic, a backend, APIs, or a database.

The design also simplifies the LDM Excel workbook to a single materials table. The normalized MDC remains in the filename; contextual information remains in the LDM PDF/print output.

## Current Architecture and Constraints

The repository currently has one React 18 + Vite 5 application:

- `src/main.jsx` mounts `src/App.jsx` from one Vite entry point.
- `src/App.jsx` owns both the Selector and an in-app `workspace` switch that renders `MaterialsTool`.
- Selector runtime data is fetched from `${import.meta.env.BASE_URL}questions/...` and the shared style guide from `${import.meta.env.BASE_URL}styleguide.json`.
- LDM runtime data is fetched from `${import.meta.env.BASE_URL}materials/materials_matrix.csv` and `${import.meta.env.BASE_URL}phc_integration.csv`.
- The current client build uses `/mdc_tool/`; `scripts/prepare-client-release.mjs` copies one built application into `release/mdc_tool/`, plus both the question data and LDM matrix.
- The current Excel serializer writes contextual rows before the consolidated materials table. The LDM calculation, eligibility, export history, and repeat-confirmation flow are separate from that serializer.

Existing `bom-*` module names are internal implementation names. User-facing terminology in this design is **LDM — Lista de Materiais**.

## Source Architecture

One repository and one shared source-level business-rule layer remain the target.

The implementation should split application ownership into independent roots, using the smallest structure that fits the existing code. A conceptual shape is:

```text
src/
  SelectorApp.jsx
  MaterialsApp.jsx
  domain/
    ...shared protected rules...
  shared/
    ...only genuinely shared presentation/helpers...
```

The exact filenames may differ if the existing code supports a cleaner minimal extraction. The important boundary is ownership:

- Selector UI state, question loading, pricing, codeline construction, PHC selection, and Selector print output belong to the Selector app root.
- LDM manual MDC input, LDM runtime-data loading, calculation presentation, local activity/history, LDM print output, and Excel action belong to the LDM app root.
- Protected MDC normalization/parsing, PHC lookup, compatibility, technical-code semantics, pump aggregation, probe behavior, LDM matrix parsing, LDM calculation, and export-domain modules remain shared source modules. They must not be duplicated to support the split.

The current workspace switch must be removed. There must be no shared landing page, runtime navigation, or link between Selector and LDM.

## Runtime Independence

Selector and LDM are separate deployed static packages, not two routes of one delivered application.

Each package must:

- load and operate when the other package is physically absent;
- have no runtime import, fetch, navigation, link, or asset dependency on the other package;
- use only files included inside its own deployment root;
- have no in-app role logic or access-control implementation.

Shared source modules may be bundled into each build. A shared deployed runtime directory or service is not permitted.

The approved conceptual deployment roots are:

```text
/selector/
/lista_materiais/
```

The build design must make base paths explicit and independent. It must also allow a client to mount either static package elsewhere later without adding a backend.

## Runtime Data Boundaries

Release packages contain only runtime data actually required by their own app.

### Selector package

Selector includes:

- its configuration/question CSVs;
- Selector application assets;
- required fonts and style guide assets;
- any other file demonstrated by implementation to be a Selector runtime dependency.

Selector does not include `materials/materials_matrix.csv` merely because the previous combined package did.

### LDM package

LDM includes:

- `materials/materials_matrix.csv`;
- `phc_integration.csv` required for LDM PHC lookup;
- LDM application assets;
- required fonts and style guide assets;
- any other file demonstrated by implementation to be an LDM runtime dependency.

LDM does not include Selector question CSVs unless implementation proves a real LDM runtime dependency. If one is discovered, it must be documented and reviewed rather than silently copied.

Existing base-aware fetches using `import.meta.env.BASE_URL` are the intended pattern. All runtime paths must remain app-relative/base-aware after the split; no `/mdc_tool/`-specific fetch path may remain.

## Build and Release Model

Keep the existing simple React 18 + Vite 5 repository. Do not introduce a monorepo, workspaces, a second repository, or a separate deployment service.

The implementation will add two Vite entry points/builds with development and production commands conceptually equivalent to:

```text
npm run dev:selector
npm run dev:ldm
npm run build:selector
npm run build:ldm
```

The canonical release workflow will eventually assemble independent folders:

```text
release/
  selector/
    index.html
    assets/
    ...
  lista_materiais/
    index.html
    assets/
    ...
```

Delivery artifacts should be two independent ZIPs, for example `selector_ready_to_upload.zip` and `lista_materiais_ready_to_upload.zip`. Their version suffixes and release naming must extend the repository's existing `release-version.json` convention rather than introduce a second version system.

The protected historical release ZIP remains untouched. Generated release-folder dirtiness is not source work and must not be confused with reviewed source changes.

## LDM Excel Workbook Contract

The LDM Excel workbook is a normal technical materials-list workbook, not a PHC import file.

Its one worksheet contains exactly:

```text
Row 1: Material PHC | Description | Quantity
Row 2+: one row per consolidated LDM material, in existing material-total order
```

The workbook contains no content before, after, or alongside that table:

- no title;
- no MDC or normalized MDC;
- no equipment PHC;
- no LDM state;
- no issues or warnings;
- no timestamps or export metadata;
- no blank separator rows;
- no contextual blocks.

The normalized MDC remains in the generated Excel filename. LDM PDF/print output retains its contextual information.

This serializer-only change must not change LDM calculation, consolidated material totals, Excel eligibility, local export history, or repeat-export confirmation unless later evidence demonstrates a separately reviewed incompatibility.

## Protected Behavior

### Selector

The split must not change Selector business behavior, including:

- pricing;
- MDC generation;
- PHC lookup;
- technical-code semantics;
- compatibility;
- `.PT` behavior;
- porta-sondas behavior;
- pump aggregation;
- Selector PDF/print behavior unless an app-isolation change is explicitly required.

The canonical identity invariant remains:

```text
5,940 combinations
SHA-256: 221aee09ae3f3faf64b57e7c0a9627f892c354dc3e761cdadfc94c87ee3e2a84
```

No pricing-policy change is authorized.

### LDM

The split and Excel serializer change must preserve:

- manual MDC input;
- normalization and strict parsing;
- PHC lookup;
- client-editable runtime `materials_matrix.csv`;
- partial calculation;
- complete, incomplete, and blocked states;
- blank matrix cell meaning unknown;
- explicit zero meaning confirmed zero;
- contextual LDM PDF/print output;
- local activity/history;
- repeat-export confirmation.

## Implementation Sequence

### Phase 0 — Baseline Closure

Close and commit the already-reviewed Task 10 and LDM master-matrix work before any app-split implementation begins. Do not mix generated release output with that source closure.

### Phase 1 — App Entry-Point Split

Create independent Selector and LDM application roots and remove the workspace switch. Keep shared protected domain modules shared at source level.

### Phase 2 — Build and Release Split

Add independent development/build paths, independent base paths, and self-contained release folders/ZIPs. Add automated package-boundary checks.

### Phase 3 — Excel Simplification

Change only the LDM Excel serializer and its contract tests to the approved three-column sheet. Keep PDF/print contextual output unchanged.

### Phase 4 — Final Acceptance

Serve both generated packages independently and verify:

- Selector works with LDM absent;
- LDM works with Selector absent;
- no cross-navigation exists;
- each app loads only its own runtime data;
- Selector MDC, PHC, pricing, and PDF/print behavior remain correct;
- LDM calculation, state handling, PDF/print, and history remain correct;
- Excel contains exactly its header plus material rows;
- independent deployment paths work.

## Testing Strategy

Each implementation slice uses strict RED → GREEN → regression TDD. Tests must cover:

- independent app entry points;
- removal of workspace switch and all cross-navigation;
- separate development and production builds;
- independent base paths;
- package contents and package-boundary exclusions;
- Selector package exclusion of LDM-only runtime data;
- LDM package exclusion of Selector-only runtime data;
- static-package operation when the other package is absent;
- exact Excel row-one/header and row-two-plus materials-only contract;
- unchanged LDM PDF/print contextual output;
- unchanged LDM state/history/export-confirmation behavior;
- unchanged `5,940` MDC/PHC identity invariant and CSV checksum.

Prefer structural and package-contract tests where browser integration would be disproportionate. Final acceptance additionally requires real browser smoke tests against independently served static packages.

## Risks and Migration Controls

- `App.jsx` currently combines workspace selection with Selector ownership. Extraction must preserve Selector state and behavior while deleting only cross-app UI/navigation.
- The current release process assumes one `/mdc_tool/` build and copies both runtime-data families. It must be replaced by explicit app-specific packaging, not broad copying.
- Runtime fetch URLs must stay base-aware. Any hard-coded `/mdc_tool/` path would break independent deployment.
- Over-copying runtime files defeats package isolation; under-copying causes runtime fetch failures. Package-boundary tests and static smoke tests address both risks.
- Duplicating protected domain logic creates drift. Shared source modules are the control.
- Generated release dirtiness must remain separate from source review.
- Existing uncommitted Task 10/LDM work must be closed before this architecture begins.

## Non-Goals

This work does not:

- create two repositories;
- create authentication, authorization, roles, users, or login logic;
- add a backend, database, APIs, or a shared deployed runtime service;
- rewrite protected domain rules;
- redesign Selector UX;
- redesign LDM UX beyond removing cross-app navigation;
- change pricing policy;
- alter the LDM matrix contract;
- alter PHC identity.

## Success Criteria

The design succeeds when the client can receive two uploadable folders or ZIPs, install and authorize them independently, and RP12 retains one repository with one shared protected business-rule layer.

Excel succeeds when opening the generated workbook shows `Material PHC`, `Description`, and `Quantity` on row 1, materials on row 2 onward, and no other workbook content before or around the table.
