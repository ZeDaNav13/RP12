# RP12 Repository Contract

## Source of Truth

- Accepted code lives on GitHub `main`; synchronize local `main` with `origin/main` and keep it clean.
- Do not develop directly in `main`. Use an isolated task branch/worktree for implementation.
- Inspect actual repository paths before assuming a location or workflow.

## Canonical Data

- `all_reply_combinations_filtered.csv` and `phc_integration.csv` are root-level canonical files.
- Selector data is under `public/questions/*.csv`.
- LDM data is under `public/materials/materials_matrix.csv` and `public/components/components.csv`.
- There are no canonical `public/all_reply_combinations_filtered.csv` or `public/phc_integration.csv` files.

## Generated Outputs

- `dist/`, `release/selector/`, `release/lista_materiais/`, `client-input/`, `selector_ready_to_upload*.zip`, and `lista_materiais_ready_to_upload*.zip` are generated outputs.
- Release regeneration requires explicit accepted release work; do not regenerate release outputs during normal implementation tasks.
- Keep generated artifacts separate from source commits.

## Delivery

- GitHub Pages is not an active RP12 delivery target.
- Normal accepted delivery is through the Selector/LDM client release packages.
- Do not add or enable a deployment workflow or deployment surface unless explicitly approved as project scope.

## Protected Historical Artifact

- `release/mdc_tool_ready_to_upload_v1.6_protected.zip` is a local protected historical artifact with SHA-256 `3eab2c0f767e92fdda1a9a67790a9ec758fa9c332d68e502e235462ed2a6c4c4`.
- It is not required for `npm test`; when locally available, verify it with `npm run verify:protected-artifacts`.
- Never modify or regenerate it.

## Commands

- Normal verification: `npm test`, `npm run build:selector`, `npm run build:ldm`, and `npm run build`.
- Release-only commands: `npm run release:prepare` and `npm run release:client`.

## Workflow

- Use TDD: RED, intended failure, minimum GREEN.
- Run focused tests, the full suite, builds, and `git diff --check`.
- Provide the complete current diff for external review before staging or committing.
- Stage and commit only after explicit authorization.
- Preserve Selector/LDM scope boundaries and do not silently broaden a task.
