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
- Two rows are visible and joined.
- Row divider is visible and correct color.
- Value/codeline text is readable.
- Copy icons are visible, aligned, and clickable.

4) Detalhado table
- Header labels are `Item / Selecção / Código`.
- Header/body colors match design.
- Row divider lines are visible.
- Long values wrap and do not break layout.

5) Print / PDF preview
- Click `Imprimir / Guardar PDF`.
- Header blocks: company info (left), orçamento/modelo/logo (right).
- Below: modelo selecionado, data, codeline.
- Detalhado table appears.
- `Preço` appears at end.
- Font sizes are readable on A4.

6) Final smoke checks
- Change several combinations and confirm total + codeline update.
- Confirm copy buttons still copy expected values.
- Confirm no console errors.
