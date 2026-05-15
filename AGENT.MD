Small tool/app to generate budgets.

You are an external contractor.

Tiny app to be passed to the client's server at the end.

Need to make simple ways for the client to update information.

---

MANUAL PRE-RELEASE VISUAL CHECKLIST (2-3 MIN)

Run before each push/deploy:

1) Start app
- `npm run dev`
- Open app in Chrome.

2) Mobile check (`<900px`)
- Header title + logo stay on same row.
- Title can wrap to max 2 lines.
- No horizontal overflow (no sideways scroll).
- Cards stack cleanly with equal vertical spacing.

3) Resumo card
- Three rows are visible and joined: value, Referência MDC, Referência PHC.
- Row divider is visible and correct color.
- Value/codeline/PHC text is readable.
- Price starts hidden as `---`.
- Eye icon reveals price; after revealing, the price action becomes the copy icon.
- Copy icons are visible, aligned, and clickable.

4) Detalhado table
- Header labels are `Item / Selecção / Código`.
- Header/body colors match design.
- Row divider lines are visible.
- Long values wrap and do not break layout.

5) Print / PDF preview
- Click `Imprimir / Guardar PDF`.
- Header blocks: company info (left), orçamento/modelo/logo (right).
- Company info appears on separate lines:
  Watercare, Tratamento de Águas Lda / NIPC / Centro Empresarial / Estrada Nacional / postal line.
- Orçamento / Modelo MDC and logo are vertically centered as a group.
- Below: modelo selecionado, data, codeline, PHC reference.
- Detalhado table appears.
- `Preço` appears at end only when price was visible before print.
- Font sizes are readable on A4.

6) Final smoke checks
- Change several combinations and confirm total + codeline update.
- Confirm PHC reference updates with selection changes.
- Confirm no price/PHC is generated until at least one sonda is selected.
- Confirm copy buttons still copy expected values.
- Confirm no console errors.
