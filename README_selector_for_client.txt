RP12 Selector - Quick Upload Guide
==================================

1) Initial upload
- Upload and extract `selector_ready_to_upload.zip` on your server.
- Confirm it creates a folder named `selector`.
- Open in browser:
  https://YOUR-SERVER-ADDRESS/selector/

2) What is inside this package
- `index.html` + `assets/` = the Selector application.
- `questions/` = editable CSV files for Selector dropdowns.
- `styleguide.json` = client-adjustable color tokens.
- `fonts/` and favicon files = required visual assets.

This package is self-contained. It does not require the LDM package and does not
include LDM materials data or the equipment PHC registry.

3) How to update Selector CSV data
- Go to `selector/questions/` on the server.
- Replace only the CSV files you need to update.
- Do not rename files, change headers, or change the comma-separated CSV format.
- Save CSV files in UTF-8.

Optional style update:
- Replace `selector/styleguide.json` if you need to change colors.

4) After uploading updated files
- Refresh the page in the browser.
- If changes do not appear, use a hard refresh (Ctrl+F5 or Cmd+Shift+R).

5) Selector notes
- The price starts hidden in the Resumo section.
- Click the eye icon to show the price. After showing it, the same place gives a copy icon.
- If the price is hidden when printing, the PDF does not include the price.
- The PDF includes Modelo, date, codeline, PHC reference, and detailed selected items.
