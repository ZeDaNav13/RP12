# RP12 Budget Tool

Static Vite + React configurator used to assemble RP12 budgets, generate the on-screen codeline, and expose the PHC reference sequence tied to the selected configuration.

## What lives here

- `src/` - app UI and configurator logic
- `public/questions/` - editable CSV data that drives the dropdowns
- `public/styleguide.json` - client-adjustable color tokens
- `release-version.json` - single source of truth for the shipped app version tag
- `scripts/generate-combinations.mjs` - rebuilds `all_reply_combinations_filtered.csv`
- `scripts/prepare-client-release.mjs` - assembles the upload-ready client package
- `release/mdc_tool/` - generated folder for server upload
- `mdc_tool_ready_to_upload.zip` - generated zip for client delivery

## Requirements

- Node.js 20 LTS recommended
- npm

## Local development

```bash
npm install
npm run dev
```

The default dev URL is the Vite local server.

## Main commands

```bash
npm run dev
npm run build
npm run build:client
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

1. Builds the app with base path `/mdc_tool/`
2. Rebuilds `release/mdc_tool/`
3. Copies the current client-facing docs and editable data files
4. Refreshes `mdc_tool_ready_to_upload.zip`
5. Creates the versioned client zip from `release-version.json` (example: `mdc_tool_ready_to_upload_v1.5.zip`)

## Session Close-Out

Use this procedure at the end of a work session you intend to ship:

1. Update `release-version.json`
2. Update `CHANGELOG.md`
3. Run `npm run release:client`
4. Commit and push the repo to GitHub
5. Send the versioned zip file created by the release command

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

The default workspace remains the **Selector**. The separate **Materials** workspace is for a manual MDC calculation and does not use selector pricing or change selector state.

- Enter an MDC reference and select **Calculate BOM**. A malformed MDC blocks calculation and produces no material rows.
- A missing equipment PHC is shown as `PHC reference not found`. Unmapped technical components produce an incomplete BOM with its existing issues displayed.
- **Components / Materials** shows contribution provenance; **Materials Total** shows consolidated totals. PDF exports the consolidated totals only. The planned Excel export will use the same Materials Total data.
- A missing material PHC marks the BOM incomplete and remains visible to the user, but does not block PDF export or the planned Excel export.
- Export history is local to the browser/workstation. It is visible after calculation; a repeat export in the same format for the same MDC requires confirmation.

`public/materials/materials_matrix.csv` is client-editable runtime data. Its leading identity columns must remain exactly `material_phc`, `description`, and `ALWAYS`; all other component columns are technical MDC codes and are case-sensitive.

The planned Materials Excel export will be a technical materials-list workbook, not a PHC import. It will contain material PHC reference, description, and total quantity; relevant MDC, equipment-PHC, and incomplete-warning context may appear alongside the table. `phc_integration.csv` remains the equipment MDC-to-PHC lookup file.

## Supporting docs

- `README_for_client.txt` - non-technical upload/update guide
- `DEPLOY.md` - deployment and packaging notes
- `CHANGELOG.md` - release history
- `public/questions/README.md` - CSV structure and rules
