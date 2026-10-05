RP12 LDM — Lista de Materiais — Client Technical Installation Guide — v1.7
==========================================================================

Delivery model
--------------
This is a self-contained static web application. It has no backend, no database,
and no runtime Node/npm requirement on the client server.

Installation path
-----------------
Deploy the complete delivered `lista_materiais/` folder at:

  /lista_materiais/

The built application uses this base path. If a different server path is needed,
the application must be built again for that path; do not simply rename the
deployed folder.

Installation
------------
- Upload and extract `lista_materiais_ready_to_upload_v1.7.zip` (or the current
  generic delivery ZIP) on the server.
- Deploy the entire `lista_materiais/` folder and preserve its internal directory
  and file structure.
- Do not cherry-pick only `index.html` or `assets/`.
- Do not combine this application with `selector/` in one directory.

Updating an existing installation
---------------------------------
Replace the complete deployed `lista_materiais/` folder instead of merging old
and new hashed assets. Keep the previous deployed folder/package available for
rollback until v1.7 has been verified.

Post-deployment verification
----------------------------
- Open `https://YOUR-SERVER-ADDRESS/lista_materiais/`.
- Confirm the page title and header are `Lista de Materiais MDC`.
- Calculate `MDC_iS.CP10_M3Cl2mA/pH/CD.PT_CF_BDW`.
- Confirm equipment PHC `534.iS200000000001` and that the materials calculation loads.

Runtime client-editable data
----------------------------
- `lista_materiais/materials/materials_matrix.csv` is the client-maintained
  material identity, material PHC, component-to-material relationship, and
  quantity matrix.
- `lista_materiais/components/components.csv` is the client-supplied
  `component_code` to `component_phc` master-data file.
- `lista_materiais/styleguide.json` contains client-adjustable colour tokens.
- `lista_materiais/phc_integration.csv` is the complete-equipment MDC-to-PHC
  registry. It is not part of the current client-fill request and must not be
  casually edited.

Do not rename files, change CSV headers, or change the comma-separated UTF-8
format. The component-PHC master data is being collected as authoritative client
data, but its runtime display is not yet wired into the current accepted LDM
implementation; editing deployed `components.csv` does not yet populate the
on-screen component-PHC column.

LDM notes
---------
- Enter an MDC reference and click Mostrar Materiais.
- A malformed MDC blocks calculation and produces no material rows.
- Unmapped technical components or missing material PHC references create visible incomplete warnings.
- PDF and Excel exports are based on the consolidated Materials Total calculation.
- Export history is local to the browser/workstation; a repeat export in the same format requires confirmation.
