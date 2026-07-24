# Changelog

## 2026-07-24
- Hid per-line prices again from the detailed list and PDF output.
- Kept only the total price visible, still gated behind the existing view button.
- Updated the footer version text to `PaperPushers 2026 - v1.5`.

## 2026-07-22
- Restored the site accent color from blue back to gray.
- Updated the on-screen footer version text to `PaperPushers 2026 - v1.4`.

## 2026-07-16
- Updated the site accent/background color to `#3498DB` while keeping the main text color dark.
- Changed the detailed budget table to show mandatory add-ons as soon as an `IS2` model is selected.
- Added a per-line `Preço` column and a `Total` row to the detailed budget view and print layout.
- Added footer versioning text: `PaperPushers 2026 - v1.3`.

## 2026-07-03
- Updated `IS2` model prices for `CP10` through `CP60`.
- Added configurable mandatory budget add-ons via `public/questions/mandatory_addons.csv`.
- Included mandatory add-ons in on-screen totals, detailed budget output, and generated combination exports when an `IS2` model is selected.
- Refreshed `release/mdc_tool/`, `all_reply_combinations_filtered.csv`, and `mdc_tool_ready_to_upload.zip` for client testing and delivery.

## 2026-06-26
- Added a root `README.md` covering local development, release packaging, and editable client data.
- Added scripted client packaging with `npm run build:client`, `npm run release:prepare`, and `npm run release:client`.
- Added `scripts/prepare-client-release.mjs` to rebuild `release/mdc_tool/` and refresh `mdc_tool_ready_to_upload.zip`.
- Updated deployment and client handoff docs to match the generated package contents and current release flow.

## 2026-05-15
- Added final export rule: every valid priced combination must include at least one sonda.
- Made `assembly_code` the unique key for PHC reference generation.
- Regenerated `all_reply_combinations_filtered.csv` with no repeated `assembly_code` rows.
- Updated PHC sequencing to increment only by unique assembly line code.

## 2026-05-09
- Updated model/circuit/probe restrictions, including `Circuito Aberto de Arrefecimento` with `Água Limpa`/`Água Suja`.
- Kept pH and conductivity probe options unrestricted by circuit.
- Added explanatory descriptions for circuit and pump selections.
- Added hidden-by-default price in Resumo; PDF omits price while hidden.
- Added PHC reference generation and display.
- Added `npm run generate:combinations` to rebuild `all_reply_combinations_filtered.csv`.
- Cleaned release assets and refreshed `mdc_tool_ready_to_upload.zip`.

## 2026-03-23
- Added `README_for_client.txt` with non-technical deployment and CSV update instructions.
- Built a deploy-ready package for subpath hosting at `/mdc_tool/`.
- Generated `mdc_tool_ready_to_upload.zip` containing the full `mdc_tool/` folder for server upload.
