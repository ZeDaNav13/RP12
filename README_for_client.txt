RP12 — Two Independent Client Packages
=======================================

Each delivery contains two independent ZIPs. Upload either package on its own;
neither package requires the other one to be present.

- `selector_ready_to_upload.zip` extracts to `selector/` and is opened at:
  https://YOUR-SERVER-ADDRESS/selector/
- `lista_materiais_ready_to_upload.zip` extracts to `lista_materiais/` and is opened at:
  https://YOUR-SERVER-ADDRESS/lista_materiais/

Use the matching versioned ZIP when a release version is required. The version suffix
comes from `release-version.json`.

For package-specific upload steps and editable runtime data, use the README included
inside that package:

- `README_selector_for_client.txt` for Selector
- `README_lista_materiais_for_client.txt` for LDM — Lista de Materiais

After uploading updated files, refresh the page. If changes do not appear, use a hard
refresh (Ctrl+F5 or Cmd+Shift+R).
