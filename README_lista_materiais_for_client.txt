RP12 LDM — Lista de Materiais - Quick Upload Guide
===================================================

1) Initial upload
- Upload and extract `lista_materiais_ready_to_upload.zip` on your server.
- Confirm it creates a folder named `lista_materiais`.
- Open in browser:
  https://YOUR-SERVER-ADDRESS/lista_materiais/

2) What is inside this package
- `index.html` + `assets/` = the LDM application.
- `materials/materials_matrix.csv` = editable LDM runtime materials data.
- `phc_integration.csv` = fixed equipment MDC-to-PHC lookup data; it is not a materials-import file.
- `styleguide.json` = client-adjustable color tokens.
- `fonts/` and favicon files = required visual assets.

This package is self-contained. It does not require the Selector package and does not
include Selector question CSVs.

3) How to update LDM runtime data
- Edit only `lista_materiais/materials/materials_matrix.csv` for materials data.
- Do not rename the required leading headers: `material_phc`, `description`, `ALWAYS`.
- Other headers are case-sensitive technical MDC component codes.
- Keep comma-separated CSV format and save files in UTF-8.
- Do not alter `phc_integration.csv` unless a controlled equipment PHC registry update is approved.

Optional style update:
- Replace `lista_materiais/styleguide.json` if you need to change colors.

4) LDM notes
- Enter an MDC reference and click Calculate BOM.
- A malformed MDC blocks calculation and produces no material rows.
- Unmapped technical components or missing material PHC references create visible incomplete warnings.
- PDF and Excel exports are based on the consolidated Materials Total calculation.
- Export history is local to the browser/workstation; a repeat export in the same format requires confirmation.
