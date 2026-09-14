# RP12 Materials / BOM Design

## Purpose and scope

The existing RP12 selector remains a sales and budgeting workflow. Materials / BOM is a second, separate area of the same React/Vite application. A user manually enters an MDC reference; the tool normalizes and validates it, parses protected technical components and quantities, resolves a PHC reference where available, applies a client-editable materials matrix, calculates and aggregates material contributions, shows the result, exports production BOM files, and records export history locally on that workstation.

Deployment remains React 18, Vite 5, and a static intranet package. There is no backend, database, API service, runtime Node requirement, or new infrastructure. Runtime CSV data remains editable by the client.

Materials / BOM must not change selector pricing, couple material quantities to selector pricing, or pre-generate BOMs for the 5,940 known MDC references.

## Approved architecture

The canonical pipeline is:

```text
MDC input
→ normalize + strict parse
→ PHC lookup
→ runtime materials matrix reader
→ contribution calculation
→ aggregated materials
→ validation / completeness / export eligibility
→ on-screen views
→ PDF / Excel export adapters
→ local export history
```

The implementation uses a small, isolated domain pipeline. BOM business logic does not live in a React component. React orchestrates and presents results; it does not independently recalculate or reinterpret BOM rules.

Responsibilities are separated as follows:

1. **MDC parser** understands protected MDC grammar and returns technical components with occurrence counts. It does not know material mappings.
2. **PHC lookup** resolves normalized MDC against the existing PHC identity registry. A missing PHC is a warning, not an error.
3. **Materials matrix reader** reads one runtime client-editable matrix, discovers component columns dynamically, and validates structure and quantities.
4. **BOM engine** combines parsed components with the matrix, creates contribution-level results first, and aggregates totals from those contributions.
5. **Validation/status** owns Complete, Incomplete, and Blocked semantics, warnings/problems, and export eligibility.
6. **Materials UI** is orchestration and presentation only.
7. **Export adapters** consume the exact calculated result shown on screen and do not calculate quantities themselves.
8. **Local history adapter** is browser/workstation-local and writes only after a successful export.

## Single materials matrix

Version 1 uses one client-editable, Excel-friendly matrix exported as CSV at runtime. It does not split materials into a catalogue plus mapping file.

Conceptual columns are:

```text
material_phc | description | ALWAYS | CP10 | ... | BDP | BDC | AF | AQ | ... | BDW
```

Rules:

- One row represents one material.
- `material_phc` and `description` are the material identity columns. `material_phc` is the material aggregation identity when nonblank; `description` is display data and is never technical identity.
- When `material_phc` is blank, the source matrix-row identity is the temporary internal aggregation identity. Contributions from that same blank-PHC row aggregate together, while distinct blank-PHC rows remain distinct and must never merge merely because their PHC values are blank.
- Every subsequent column represents a technical MDC component and is dynamically discovered.
- Adding a column for a technical component already understood by the MDC parser is data-only; genuinely new MDC grammar requires protected code changes.
- Each cell is the quantity required for one occurrence of that component. Repeated MDC components multiply that value.
- Fractional quantities are valid, including `0.5` and `0.4`.
- `ALWAYS` applies exactly once per complete MDC assembly.
- A blank or `0` means no contribution only when that component column explicitly exists.
- A missing component column is unmapped and makes the BOM incomplete; the calculator must never synthesize a missing zero column.
- Invalid or non-numeric quantities are invalid matrix data and must never silently become zero.
- Mappings use technical codes recoverable from MDC, never editable display labels.

## Initial client material relationships

The initial matrix must be able to represent these supplied relationships. Material PHC references are currently unavailable and must not be invented.

- CP10 through CP60: `4 × M5x16 screw` per model component.
- AF, BF, CF, and FF: `2 × Astore d32 clamp` and `2 × M5x16 screw` per component.
- `VMS0706 → BDP` and `VCL0706 → BDC`; each currently maps to `2 × M5x16 screw` per occurrence.
- BDW: `1 × CORPO VALVOLA SINTESI 2 VIE MF IN` and `1 × SERVOCOMANDO SINTESI 2 PUNTI ON-OFF 8 NR`.
- ALWAYS / Sempre:
  - `2 × Parafuso Autoroscante 4,5x20 Philips INOX 304`
  - `1 × Platine de montagem painel 900mmx750mm`
  - `1 × Suporte INOX 304 Filtro NW 25, 32 FP3`
  - `1 × Filtro HYDRA HOT 1'' - com elemento RLH 90mic. Suporte Inox304 AQ`
  - `2 × Porca de Redução PVC 1´´x1-4´´`
  - `0.5 × Mt Tubo 6x8mm Rolo`
  - `0.4 × MT Calha electrica para Q.Electrico 40(L)x40(A)`
  - `1.2 × MT Manga Termoretratil 4.8-2.4mm`
  - `1 × MT Cabo LIYY 3x0.25`
  - `2 × Transição 1-4''M - 8mm ER JG Preto Plastico`

## Calculation and result contract

Calculation is deterministic and side-effect-free:

```text
raw MDC
→ normalize
→ strict parse
→ technical components + counts
→ PHC lookup
→ current materials matrix
→ contributions
→ aggregated totals
→ issues/status/export eligibility
```

For example, `CP10 × 1`, `BDP × 2`, `AF × 1`, and `BDW × 1` produce matrix contributions with `ALWAYS` applied once. `BDP × 2` doubles BDP matrix quantities.

A BOM result logically contains:

- input: original MDC and normalized MDC;
- PHC: resolved reference when available and found/not-found status;
- parsed components: technical code and occurrence count;
- contributions: source component, material PHC where available, description, and contributed quantity;
- material totals: material PHC where available, description, final aggregated quantity, and the internal matrix-row identity when material PHC is blank;
- issues: warnings, unmapped components, missing material PHCs, and other validated problems;
- BOM status: Complete or Incomplete;
- export eligibility: whether PDF and Excel are allowed.

Warnings and completeness are separate concepts.

## Parsing, PHC, and status semantics

### PHC lookup

A syntactically valid MDC absent from the current 5,940-row PHC registry may still generate a BOM. Display `PHC reference not found` as a warning. It does not block material calculation, completeness by itself, local history, or export.

### Malformed MDC

If grammar or structure cannot be parsed reliably, BOM generation is Blocked. Identify the failing segment/part, do not perform best-effort partial parsing, and do not export. Unknown but syntactically valid technical components are not malformed; they can produce an incomplete BOM.

### Unmapped component

For every syntactically valid component with no matrix column, continue calculation, report the component explicitly (for example, `AQ — no material mapping defined`), and mark the BOM Incomplete. PDF remains allowed. Excel remains allowed only when every resulting material row has a material PHC. Missing mappings are never treated as zero, and all detectable unmapped components are collected.

### Missing material PHC

When a calculated material has a description and quantity but no `material_phc`, mark the BOM Incomplete and identify every affected material. PDF remains allowed and visibly states incompleteness. Excel is blocked because it must be PHC-import-ready and must not masquerade as such with blank material references.

### Blocked, incomplete, and warning outcomes

- **Blocked:** malformed MDC, unreadable/structurally invalid matrix, or invalid matrix quantity. No valid export result exists.
- **Incomplete:** unmapped technical components or material rows missing material PHC. Display the BOM and all issues; export eligibility depends on issue type.
- **Complete with warning:** for example, PHC not found while material mapping is complete.

Never silently repair invalid client data or coerce malformed quantities to zero. Collect all detectable issues in one calculation. If a new calculation blocks, the UI must not leave a previous successful BOM appearing to belong to the new MDC.

## On-screen views and UI flow

The Materials area is separate from the sales selector. Its flow is:

```text
MDC reference input
→ Calculate
→ result header
→ warnings/problems
→ Components / Materials and Materials Total views
→ PDF / Excel controls
→ local export history
```

The result header shows normalized MDC, resolved PHC or `PHC reference not found`, and Complete/Incomplete state.

Both views consume one calculated result:

1. **Components / Materials** is a provenance view: component → material PHC → description → contributed quantity.
2. **Materials Total** is the consolidated production view: material PHC → description → final total quantity.

Calculation uses the current runtime matrix and does not create history. After a successful calculation, the UI looks up and surfaces existing local export history for that normalized MDC, including available format(s) and date/time(s); this visibility is not an export action and creates no history. Changing input after a successful calculation visibly marks the displayed result stale and requires recalculation before export. Version 1 has no matrix editor UI; the client edits the runtime matrix separately.

## Export contract

The existing selector/budget PDF remains a separate sales-facing artifact. BOM PDF and Excel export only the consolidated Materials Total view, never the Components / Materials provenance view.

PDF includes normalized MDC, resolved PHC or `PHC reference not found`, Complete/Incomplete state where relevant, warnings/problems, and consolidated material PHC/description/quantity rows.

Excel is intended for PHC import. The exact file type, columns, and order remain an explicit client dependency. Export boundaries must accept that schema later without changing calculation logic. No schema is guessed in version 1.

## Local export history

History is browser/workstation-local only. It is created only after successful PDF or Excel export; calculation/preview creates no entry. There is no shared backend, material-file fingerprinting, automatic BOM version comparison, or workstation synchronization.

Each history entry contains normalized MDC, PHC when available, date/time, and export format. PDF and Excel are separate events. After a successful calculation, existing events for the normalized MDC are visible in the UI without writing history. At export time, history is checked independently by normalized MDC plus format. If a PDF export has a previous PDF event, or an Excel export has a previous Excel event, show when it occurred and require explicit confirmation for that same-format re-export only. Confirmed re-export appends another event. Failed or cancelled exports create none.

## Testing strategy

Implementation follows strict TDD: RED, observed expected failure, minimum GREEN, full verification, review, Notion, then commit. Primary tests belong in the domain layer.

Tests protect at least:

- MDC normalization, every supported segment type, repeated counts such as `2BDP`, malformed grammar, and valid MDC absent from the PHC registry.
- Matrix dynamic component columns, explicit blank/zero semantics, missing-column unmapped behavior, fractional quantities, and invalid quantities blocking calculation.
- BOM ALWAYS once, repeated-component multiplication, contribution provenance, aggregation from multiple components, and fractional totals.
- Status/export rules: PHC-not-found warning-only; unmapped component incomplete but exportable; missing material PHC incomplete with PDF allowed and Excel blocked; malformed MDC blocked with no BOM.
- History: preview creates nothing; successful PDF/Excel exports create separate records; failed/cancelled export creates none; same-format re-export requires confirmation.
- Data independence: editable labels do not drive technical BOM behavior, and selector pricing changes do not alter BOM quantities.

At least one representative real MDC plus runtime matrix domain fixture is required. Exporter tests validate structured data passed to adapters, not pixel-perfect documents. PHC Excel schema tests wait for the real client schema.

## Open client dependencies

The following are intentionally unresolved and require client input:

1. Exact PHC Excel import file type, columns, and order.
2. Actual material PHC references.
3. Material mappings for AQ, BQ, CQ, and DF.
4. Whether probe/sensor technical components intentionally require no additional BOM materials, or their mappings if they do.

## Non-goals and guardrails

Version 1 does not add a backend, database, API, shared cross-workstation history, matrix editor UI, selector pricing changes, material pricing/costing, pre-generated BOMs for 5,940 identities, guessed PHC import schema, guessed material PHCs, guessed zero mappings, or wholesale prototype code.

Existing selector behavior remains unchanged.
