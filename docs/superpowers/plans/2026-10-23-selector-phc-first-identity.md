# Selector PHC-first Identity Implementation Plan

> Execution follows the RP12 workflow: TDD, verification evidence, external review, and separate commit-only authorization. Each task stops before committing.

**Goal:** Determine complete-equipment PHC identity from canonical physical PHC-and-quantity composition while preserving existing MDC generation and every historical equipment PHC.

**Architecture:** Selector option rows resolve to physical component PHCs. A shared pure domain module aggregates and sorts them into a canonical composition key. A later append-only registry resolves complete-equipment PHCs from that key; MDC is independent and can be duplicated across equipment PHCs.

**Spec:** `docs/superpowers/specs/2026-10-23-selector-phc-first-identity-design.md`

## Global Constraints

- Same PHCs with the same quantities imply the same complete-equipment PHC.
- Selector question position is never physical identity.
- Any PHC or quantity difference implies a different complete-equipment PHC.
- Existing 5,940 PHCs are permanent; later references append only.
- Existing MDC syntax, compatibility, pricing, and generation rules remain protected.
- BDW expands to `2097.SR2221U × 1` and `2097.SC2A2A9 × 1`.
- Cabo M12 contributes `ELET.EVC532 × 1`; Material diverso remains priced but has no physical PHC identity.
- LDM, release packages, ZIP creation, and `phc_integration.csv` are out of scope.

## Task 1 — Authoritative Component PHCs and Canonical Composition

**Files:**

- Create `src/domain/equipmentComposition.js`.
- Create `test/selector-phc-composition.test.js`.
- Modify the relevant Selector `public/questions/*.csv` files to add a first-column `phc` field.
- Persist this plan and the approved design specification.

**Interfaces:**

```text
canonicalizeComposition(items)
compositionKey(items)
physicalComponentsForConfiguration(configuration)
```

The pure composition layer accepts selected model, pumps, probes, derived porta-sondas, conditional BDW physical rows, and mandatory add-on rows. It ignores blank PHCs, aggregates repeated PHCs, sums quantities, sorts lexicographically, and returns no Selector question-position data.

- [ ] RED: add focused coverage for duplicate VMS quantities, input-order independence, pump-position independence, same-MDC/different-chlorine-PHC identity, BDW expansion, Cabo M12 inclusion, Material diverso exclusion, no-selection exclusion, and exact PHC-first CSV data.
- [ ] Run the focused test and capture the expected missing-module/data-contract RED result.
- [ ] GREEN: add the smallest pure module and PHC-first authoritative CSV rows without modifying Selector runtime, generator, pricing, compatibility, LDM, or release code.
- [ ] Verify focused tests, `npm test`, `npm run build:selector`, `npm run build:ldm`, and `git diff --check`.
- [ ] Supply the complete reviewable diff and wait for external review. Do not stage or commit.

## Task 2 — Append-only Equipment-PHC Registry and Generator Migration

**Files:**

- Modify `scripts/generate-combinations.mjs`.
- Create a tracked `public/selector_phc_registry.csv`.
- Create `test/selector-phc-registry-contract.test.js`.
- Regenerate `all_reply_combinations_filtered.csv` only after the Task 2 contract is approved.

**Registry:**

```text
referencia_phc,composition_key
```

The initial migration resolves historical configurations to compositions, requires 5,940 unique historical composition keys, and binds each to its existing PHC. Subsequent generation enumerates valid configurations without MDC-based identity deduplication, reuses a matching registry PHC, and appends only new physical compositions.

**Required Task 2 invariants:**

```text
11,700 raw valid configurations
 5,940 unique MDC codelines
 7,020 unique physical compositions
 5,940 historical PHCs preserved
 1,080 appended PHCs
534.iS200000007020 highest PHC
```

Task 2 must prove duplicate MDCs can have distinct composition keys and PHCs, while different Selector paths with the same physical composition share one PHC. It stops for review before any commit.

## Task 3 — Selector Runtime Composition Lookup

Modify `src/SelectorApp.jsx` only after the registry is approved. Retain the selected physical option rows, derive porta-sondas and BDW as today, create the shared composition key, look it up in the registry, and display the resolved complete-equipment PHC. Preserve MDC construction, price behavior, and all existing Selector contracts.

Package the registry and PHC-enriched question CSVs only as necessary for the Selector runtime. Do not change LDM packaging or behavior. Stop for review before commit.

## Task 4 — PHC-first Acceptance

Verify the approved 11,700/5,940/7,020 migration values, preserved historical PHCs, append-only allocation, deterministic second generation, duplicate-MDC/different-PHC behavior, same-composition/same-PHC behavior, BDW and Cabo M12 inclusion, Material diverso exclusion, both app builds, unchanged `phc_integration.csv`, and untouched protected ZIP. This is verification-only unless a reviewed defect is found.
