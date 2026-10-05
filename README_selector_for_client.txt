RP12 Selector — Client Technical Installation Guide — v1.7
==========================================================

Delivery model
--------------
This is a self-contained static web application. It has no backend, no database,
and no runtime Node/npm requirement on the client server.

Installation path
-----------------
Deploy the complete delivered `selector/` folder at:

  /selector/

The built application uses this base path. If a different server path is needed,
the application must be built again for that path; do not simply rename the
deployed folder.

Installation
------------
- Upload and extract `selector_ready_to_upload_v1.7.zip` (or the current generic
  delivery ZIP) on the server.
- Deploy the entire `selector/` folder and preserve its internal directory and
  file structure.
- Do not cherry-pick only `index.html` or `assets/`.
- Do not combine this application with `lista_materiais/` in one directory.

Updating an existing installation
---------------------------------
Replace the complete deployed `selector/` folder instead of merging old and new
hashed assets. Keep the previous deployed folder/package available for rollback
until v1.7 has been verified.

Post-deployment verification
----------------------------
- Open `https://YOUR-SERVER-ADDRESS/selector/`.
- Confirm the page title and header are `Selector MDC`.
- Confirm the Selector questions and runtime CSVs load.

Runtime client-editable data
----------------------------
- `selector/questions/*.csv` contains the editable Selector questions.
- `selector/styleguide.json` contains client-adjustable colour tokens.

Do not rename files, change CSV headers, or change the comma-separated UTF-8
format. This package does not include LDM materials data or the equipment PHC
registry.

Selector notes
--------------
- The price starts hidden in the Resumo section.
- Click the eye icon to show the price. After showing it, the same place gives a copy icon.
- If the price is hidden when printing, the PDF does not include the price.
- The PDF includes Modelo, date, codeline, PHC reference, and detailed selected items.
