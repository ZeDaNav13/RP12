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
- `materials/materials_matrix.csv` = editable Materials BOM runtime data.
- `styleguide.json` = colors used by the tool.
- `phc_integration.csv` = fixed equipment MDC -> PHC lookup data; it is not a materials-import file.
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

6) Materials BOM
- Selector is the default workspace. Materials is separate and does not change selector prices or selections.
- Open Materials, enter an MDC reference, and click Calculate BOM.
- A malformed MDC blocks calculation and does not show material rows.
- If the equipment PHC is missing, the tool shows: PHC reference not found.
- Unmapped technical components produce an incomplete BOM with its issues shown.
- Components / Materials shows component-to-material provenance. Materials Total shows consolidated quantities.
- PDF contains Materials Total only, not provenance rows.
- Excel is a technical materials-list workbook, not a PHC import. It contains material PHC reference, description, and total quantity; relevant MDC, equipment-PHC, and incomplete-warning context may also be shown.
- The browser keeps local export history for each MDC. A repeated export in the same format asks for confirmation before exporting again.
- A blank material PHC marks the BOM incomplete and remains visible, but does not block PDF or Excel export.

Materials matrix rules:
- Edit only: mdc_tool/materials/materials_matrix.csv
- Do NOT rename the required leading headers: material_phc, description, ALWAYS
- Other headers are case-sensitive technical MDC component codes.

7) If something looks wrong
- Re-check that file names and headers were not changed.
- Re-upload the previous CSV backup if available.
