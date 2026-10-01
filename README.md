# RP12 Budget Tool

Static Vite + React configurator used to assemble RP12 budgets, generate the on-screen codeline, and expose the PHC reference sequence tied to the selected configuration.

## What lives here

- `src/` - app UI and configurator logic
- `public/questions/` - editable CSV data that drives the dropdowns
- `public/styleguide.json` - client-adjustable color tokens
- `release-version.json` - single source of truth for the shipped app version tag
- `scripts/generate-combinations.mjs` - rebuilds `all_reply_combinations_filtered.csv`
- `scripts/prepare-client-release.mjs` - assembles the independent upload-ready client packages
- `release/selector/` - generated Selector folder for server upload
- `release/lista_materiais/` - generated LDM folder for server upload
- `selector_ready_to_upload.zip` and `lista_materiais_ready_to_upload.zip` - generated delivery ZIPs

## Requirements

- Node.js 20 LTS recommended
- npm

## Local development

```bash
npm install
npm run dev:selector
npm run dev:ldm
```

The default dev URL is the Vite local server.

## Main commands

```bash
npm run dev:selector
npm run dev:ldm
npm run build
npm run build:selector
npm run build:ldm
npm run generate:combinations
npm run release:prepare
npm run release:client
```

## Release flow

Use this when the client-approved changes need a fresh delivery package:

```bash
npm run release:client
```

That command:

1. Builds independent Selector and LDM applications with base paths `/selector/` and `/lista_materiais/`
2. Rebuilds `release/selector/` and `release/lista_materiais/`
3. Copies only each application's runtime files and its own client instructions
4. Refreshes `selector_ready_to_upload.zip` and `lista_materiais_ready_to_upload.zip`
5. Creates versioned ZIPs from `release-version.json` (for example, `selector_ready_to_upload_v1.6.zip` and `lista_materiais_ready_to_upload_v1.6.zip`)

## Session Close-Out

Use this procedure at the end of a work session you intend to ship:

1. Update `release-version.json`
2. Update `CHANGELOG.md`
3. Run `npm run release:client`
4. Commit and push the repo to GitHub
5. Send the two versioned ZIPs created by the release command

## Editable client data

The client can safely update:

- `public/questions/*.csv`
- `public/styleguide.json`
- `public/materials/materials_matrix.csv`

After CSV changes, regenerate the combinations export if needed:

```bash
npm run generate:combinations
```

Then rebuild the release package.

## Materials BOM

The **Selector** and **LDM — Lista de Materiais** are independently deployed applications. The LDM tool is for a manual MDC calculation and does not use Selector pricing or change Selector state.

- Enter an MDC reference and select **Calculate BOM**. A malformed MDC blocks calculation and produces no material rows.
- A missing equipment PHC is shown as `PHC reference not found`. Unmapped technical components produce an incomplete BOM with its existing issues displayed.
- **Components / Materials** shows contribution provenance; **Materials Total** shows consolidated totals. PDF and Excel export the consolidated totals only.
- A missing material PHC marks the BOM incomplete and remains visible to the user, but does not block PDF or Excel export.
- Export history is local to the browser/workstation. It is visible after calculation; a repeat export in the same format for the same MDC requires confirmation.

`public/materials/materials_matrix.csv` is client-editable runtime data. Its leading identity columns must remain exactly `material_phc`, `description`, and `ALWAYS`; all other component columns are technical MDC codes and are case-sensitive.

The Materials Excel export is a technical materials-list workbook, not a PHC import. It contains material PHC reference, description, and total quantity; relevant MDC, equipment-PHC, and incomplete-warning context may appear alongside the table. `phc_integration.csv` remains the equipment MDC-to-PHC lookup file.

## Supporting docs

- `README_selector_for_client.txt` - Selector upload/update guide
- `README_lista_materiais_for_client.txt` - LDM upload/update guide
- `README_for_client.txt` - overview of the two independent packages
- `DEPLOY.md` - deployment and packaging notes
- `CHANGELOG.md` - release history
- `public/questions/README.md` - CSV structure and rules
