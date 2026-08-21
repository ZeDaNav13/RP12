# Deploy Handoff (Client Server)

This project is a Vite + React static app.
Production deployment is static-only: build locally/CI, then publish the `dist/` folder.

## 1) What to hand over

- Full repository source code (recommended), OR
- Just the built output (`dist/`) for one-off delivery.
- Standard client upload package: `mdc_tool_ready_to_upload.zip`
- Versioned client upload package: `mdc_tool_ready_to_upload_vX.Y.zip`

Important runtime data is in:
- `public/questions/*.csv`
- `public/styleguide.json`

Client can update these CSV files and rebuild.

## 2) Prerequisites (client side)

- Node.js 20 LTS (or >=18.18)
- npm

## 3) Build commands

From project root:

```bash
npm install
```

To regenerate the complete valid-combinations export:

```bash
npm run generate:combinations
```

This writes:
- `all_reply_combinations_filtered.csv`

The export includes the PHC reference sequence starting at `534.iS200000000001`.
Pump rows are grouped by counts (`BDP`/`BDC`/no pump), not by which bomba dropdown receives each pump.
Every exported row has at least one sonda selected, and `assembly_code` is unique.

To build the client-ready package for `/mdc_tool/`:

```bash
npm run release:client
```

This refreshes:
- `release/mdc_tool/`
- `mdc_tool_ready_to_upload.zip`
- `mdc_tool_ready_to_upload_vX.Y.zip` using `release-version.json`

### A) Deploy at domain root (recommended)
Example: `https://client-domain.com/`

```bash
npm run build -- --base=/
```

### B) Deploy under subpath
Example: `https://client-domain.com/mdc/`

```bash
npm run build -- --base=/mdc/
```

Output is generated in:
- `dist/`

## 4) Publish to web server

Upload all files from `dist/` to the target web root.

Examples:
- root deploy -> web root serves `dist/index.html`
- subpath deploy (`/mdc/`) -> web root contains `/mdc/index.html` and matching assets

## 5) Nginx example

See:
- `deploy/nginx-site.conf`

Adjust:
- `server_name`
- `root`
- optional subpath block if not using `/`

## 6) CSV maintenance process

To change options/prices/codes:
1. Edit files in `public/questions/`
2. Update `public/styleguide.json` too if colors changed
3. Run `npm run release:client`
4. Upload the refreshed `mdc_tool_ready_to_upload.zip` or replace deployed static files with the new `release/mdc_tool/`

## 6A) Session close-out procedure

When finishing a releasable work session:
1. Update `release-version.json`
2. Update `CHANGELOG.md`
3. Run `npm run release:client`
4. Commit and push to GitHub
5. Send the versioned zip generated from the current version

## 7) Quick validation checklist after deploy

- App loads without 404 errors in browser devtools.
- Dropdown options load from CSV.
- Total and codeline update when selections change.
- Price starts hidden as `---`; eye icon reveals it; copy icon copies it.
- PHC reference appears in Resumo below the codeline.
- Print/PDF view still renders correctly.
- If price is hidden before print, PDF omits price.

## 8) Notes about current Vite config

`vite.config.js` currently defaults production base to `/RP12/` (GitHub Pages workflow).
Using `npm run build -- --base=...` overrides that base at build time, and `npm run build:client` / `npm run release:client` already apply `/mdc_tool/` for the client package.
