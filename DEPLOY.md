# Deploy Handoff (Client Server)

This project is a Vite + React static app.
Production deployment is static-only: build locally/CI, then publish the `dist/` folder.

## 1) What to hand over

- Full repository source code (recommended), OR
- Just the built output (`dist/`) for one-off delivery.

Important runtime data is in:
- `public/questions/*.csv`

Client can update these CSV files and rebuild.

## 2) Prerequisites (client side)

- Node.js 20 LTS (or >=18.18)
- npm

## 3) Build commands

From project root:

```bash
npm install
```

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
2. Run build again
3. Replace deployed static files with new `dist/`

## 7) Quick validation checklist after deploy

- App loads without 404 errors in browser devtools.
- Dropdown options load from CSV.
- Total and codeline update when selections change.
- Print/PDF view still renders correctly.

## 8) Notes about current Vite config

`vite.config.js` currently defaults production base to `/RP12/` (GitHub Pages workflow).
Using `npm run build -- --base=...` overrides that base at build time, which is the recommended handoff approach.
