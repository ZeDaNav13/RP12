# RP12 Budget Tool

Static Vite + React configurator used to assemble RP12 budgets, generate the on-screen codeline, and expose the PHC reference sequence tied to the selected configuration.

## What lives here

- `src/` - app UI and configurator logic
- `public/questions/` - editable CSV data that drives the dropdowns
- `public/styleguide.json` - client-adjustable color tokens
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

## Editable client data

The client can safely update:

- `public/questions/*.csv`
- `public/styleguide.json`

After CSV changes, regenerate the combinations export if needed:

```bash
npm run generate:combinations
```

Then rebuild the release package.

## Supporting docs

- `README_for_client.txt` - non-technical upload/update guide
- `DEPLOY.md` - deployment and packaging notes
- `CHANGELOG.md` - release history
- `public/questions/README.md` - CSV structure and rules
