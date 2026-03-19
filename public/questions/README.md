# Configuração por CSV

Cada pergunta do configurador lê um CSV desta pasta.

## Regras gerais

- Não alterar os nomes dos ficheiros.
- Manter sempre a primeira linha (cabeçalhos).
- Coluna `option`: texto mostrado no dropdown.
- Coluna `price`: valor numérico (ex.: `1301.91`).
- Coluna `code`: código técnico usado na referência.
- Coluna `description`: apenas usada no `is2_modelo.csv`.

## Ficheiros

- `is2_modelo.csv` -> `option,price,code,description`
- `bomba_biocida_inorganico.csv` -> `option,price,code`
- `bomba_biocida_organico.csv` -> `option,price,code`
- `bomba_controlo_ph.csv` -> `option,price,code`
- `bomba_inibidor.csv` -> `option,price,code`
- `sonda_cloro.csv` -> `option,price,code`
- `sonda_ph.csv` -> `option,price,code`
- `sonda_condutividade.csv` -> `option,price,code`
- `circuito.csv` -> `option,bdw_enabled` (`1` ativa BDW, `0` desativa)
- `porta_sondas.csv` -> `option,price,code`
- `bdw.csv` -> `option,price,code`

## Nota

Se um item representar "sem/nenhum", manter uma opção com esse texto (ex.: `Sem Bombas`, `Sem sonda de cloro`) e preço `0`.
