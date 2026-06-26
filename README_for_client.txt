MDC Tool - Quick Upload Guide
=============================

1) Initial upload
- Upload and extract `mdc_tool_ready_to_upload.zip` on your server.
- Confirm it creates a folder named `mdc_tool`.
- Open in browser:
  https://YOUR-SERVER-ADDRESS/mdc_tool/

2) What is inside the package
- `index.html` + `assets/` = the app itself.
- `questions/` = editable CSV files for the dropdowns.
- `styleguide.json` = colors used by the tool.
- `phc_integration.csv` = PHC import/support export.
- `all_reply_combinations_filtered.csv` = generated combinations export.

3) How to update the CSV data
- Go to this folder on the server:
  mdc_tool/questions/
- Replace only the CSV files you need to update.

Optional style update:
- Replace `mdc_tool/styleguide.json` if you need to change colors.

Important rules:
- Do NOT rename files.
- Keep the first row (headers) exactly as it is.
- Keep comma-separated format (CSV).
- Save files in UTF-8.

4) After uploading updated files
- Refresh the page in the browser.
- If changes do not appear, do a hard refresh (Ctrl+F5 or Cmd+Shift+R).

5) Notes about the tool
- The price starts hidden in the Resumo section.
- Click the eye icon to show the price. After showing it, the same place gives a copy icon.
- If the price is hidden when printing, the PDF does not include the price.
- The PDF includes Modelo, date, codeline, PHC reference, and detailed selected items.
- Circuito controls which chlorine probes are available:
  - Circuito Aberto de Arrefecimento / Água Limpa -> CS4 chlorine probes.
  - Circuito Aberto de Arrefecimento / Água Suja -> AS2 chlorine probes.
  - Água Quente Sanitária -> AS3 chlorine probes.
  - Other circuitos -> CS4 chlorine probes.
- pH and conductivity probes always show all their options.

6) If something looks wrong
- Re-check that file names and headers were not changed.
- Re-upload the previous CSV backup if available.
