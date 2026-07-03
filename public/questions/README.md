# Configuração por CSV

Cada pergunta do configurador lê um CSV desta pasta.

## Regras gerais

- Não alterar os nomes dos ficheiros.
- Manter sempre a primeira linha (cabeçalhos).
- Coluna `option`: texto mostrado no dropdown.
- Coluna `price`: valor numérico (ex.: `1301.91`).
- Coluna `code`: código técnico usado na referência.
- Coluna `description`: texto explicativo opcional usado em `is2_modelo.csv`, `circuito.csv` e ficheiros de bombas.

## Regras de visibilidade

- Se `circuito` = `Circuito Aberto de Arrefecimento`, aparece uma seleção obrigatória entre `Água Limpa` e `Água Suja`.
  - no dropdown `sonda_cloro`, `Água Limpa` mostra apenas opções cujo texto contenha `CS4`, mantendo também a opção `Sem...`.
  - no dropdown `sonda_cloro`, `Água Suja` mostra apenas opções cujo texto contenha `AS2`, mantendo também a opção `Sem...`.
- Se `circuito` = `Água Quente Sanitária`, o dropdown `sonda_cloro` mostra apenas opções cujo texto contenha `AS3`, mantendo também a opção `Sem...`.
- Em todos os restantes circuitos sem regra específica, o dropdown `sonda_cloro` mostra apenas opções cujo texto contenha `CS4`, mantendo também a opção `Sem...`.
- `sonda_ph` e `sonda_condutividade` mostram sempre todas as opções, independentemente do circuito.

## Export de combinações

- O ficheiro `all_reply_combinations_filtered.csv` é gerado a partir destes CSVs.
- Regenerar com `npm run generate:combinations` na raiz do projeto.
- O export exclui combinações sem modelo IS2 e sem circuito.
- O export exclui qualquer combinação sem sonda selecionada, com ou sem bombas.
- As bombas são agrupadas por contagem de `BDP`, `BDC` e `Sem Bombas`; a ordem/pergunta onde a bomba foi escolhida não cria novas combinações.
- Cada linha tem `referencia_phc`, começando em `534.iS200000000001` e aumentando de 1 em 1 por `assembly_code` único.
- O export não pode conter `assembly_code` repetido; se várias escolhas gerarem o mesmo código, só a primeira é mantida.
- O export respeita as mesmas restrições de circuito/sonda de cloro usadas no ecrã.

## Ficheiros

- `is2_modelo.csv` -> `option,price,code,description`
- `bomba_biocida_inorganico.csv` -> `option,price,code,description`
- `bomba_biocida_organico.csv` -> `option,price,code,description`
- `bomba_controlo_ph.csv` -> `option,price,code,description`
- `bomba_inibidor.csv` -> `option,price,code,description`
- `sonda_cloro.csv` -> `option,price,code`
- `sonda_ph.csv` -> `option,price,code`
- `sonda_condutividade.csv` -> `option,price,code`
- `circuito.csv` -> `option,bdw_enabled,description` (`1` ativa BDW, `0` desativa)
- `porta_sondas.csv` -> `option,price,code`
- `bdw.csv` -> `option,price,code`
- `mandatory_addons.csv` -> `option,price,code,description`

## Nota

Se um item representar "sem/nenhum", manter uma opção com esse texto (ex.: `Sem Bombas`, `Sem sonda de cloro`) e preço `0`.

## Add-ons obrigatórios

- Todas as linhas de `mandatory_addons.csv` são adicionadas automaticamente quando existe um modelo IS2 selecionado.
- Serve para custos fixos obrigatórios como cabos, consumíveis ou material diverso.
- Para atualizar preços ou adicionar novos itens obrigatórios, editar apenas este ficheiro.
