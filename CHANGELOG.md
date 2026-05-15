# Changelog

## 2026-05-15
- Added final export rule: every valid priced combination must include at least one sonda.
- Made `assembly_code` the unique key for PHC reference generation.
- Regenerated `all_reply_combinations_filtered.csv` with no repeated `assembly_code` rows.
- Updated PHC sequencing to increment only by unique assembly line code.

## 2026-05-09
- Updated model/circuit/probe restrictions, including `Circuito Aberto de Arrefecimento` with `Água Limpa`/`Água Suja`.
- Kept pH and conductivity probe options unrestricted by circuit.
- Added explanatory descriptions for circuit and pump selections.
- Added hidden-by-default price in Resumo; PDF omits price while hidden.
- Added PHC reference generation and display.
- Added `npm run generate:combinations` to rebuild `all_reply_combinations_filtered.csv`.
- Cleaned release assets and refreshed `mdc_tool_ready_to_upload.zip`.

## 2026-03-23
- Added `README_for_client.txt` with non-technical deployment and CSV update instructions.
- Built a deploy-ready package for subpath hosting at `/mdc_tool/`.
- Generated `mdc_tool_ready_to_upload.zip` containing the full `mdc_tool/` folder for server upload.
