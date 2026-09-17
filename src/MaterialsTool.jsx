import { useEffect, useMemo, useState } from "react";

import { calculateBom } from "./domain/bom.js";
import { createBomExportModel, assertBomPdfEligible } from "./domain/bom-export.js";
import { exportBomExcel, materialsExcelFilename } from "./domain/bom-excel-workflow.js";
import { createBomHistoryStore } from "./domain/bom-history.js";
import { createMaterialsViewState } from "./domain/bom-ui-state.js";
import { saveBomPdf } from "./bomPdf.js";

function formatExportedAt(value) {
  return new Date(value).toLocaleString("pt-PT");
}

export default function MaterialsTool() {
  const [rawMdc, setRawMdc] = useState("");
  const [runtimeData, setRuntimeData] = useState({ status: "loading", matrixCsvText: "", phcCsvText: "" });
  const [result, setResult] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [exportMessage, setExportMessage] = useState("");

  const historyStore = useMemo(
    () => createBomHistoryStore({
      storage: window.localStorage,
      now: () => new Date().toISOString()
    }),
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeData() {
      try {
        const [matrixResponse, phcResponse] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}materials/materials_matrix.csv`, { cache: "no-store" }),
          fetch(`${import.meta.env.BASE_URL}phc_integration.csv`, { cache: "no-store" })
        ]);
        if (!matrixResponse.ok || !phcResponse.ok) {
          throw new Error("Failed to load Materials runtime data");
        }

        const [matrixCsvText, phcCsvText] = await Promise.all([
          matrixResponse.text(),
          phcResponse.text()
        ]);
        if (!cancelled) {
          setRuntimeData({ status: "ready", matrixCsvText, phcCsvText });
        }
      } catch {
        if (!cancelled) {
          setRuntimeData({ status: "error", matrixCsvText: "", phcCsvText: "" });
        }
      }
    }

    loadRuntimeData();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewState = useMemo(
    () => createMaterialsViewState({ rawMdc, result, historyEvents }),
    [historyEvents, rawMdc, result]
  );

  function calculate() {
    if (runtimeData.status !== "ready") return;

    const nextResult = calculateBom({
      rawMdc,
      matrixCsvText: runtimeData.matrixCsvText,
      phcCsvText: runtimeData.phcCsvText
    });
    setResult(nextResult);
    setExportMessage("");
    setHistoryEvents(
      nextResult.state === "blocked"
        ? []
        : historyStore.eventsFor(nextResult.input.normalizedMdc)
    );
  }

  async function exportPdf() {
    if (!result || !viewState.canExportPdf) return;

    const normalizedMdc = result.input.normalizedMdc;
    if (historyStore.requiresConfirmation(normalizedMdc, "pdf")) {
      const confirmed = window.confirm("A PDF for this MDC was already exported. Export again?");
      if (!confirmed) return;
    }

    try {
      assertBomPdfEligible(result);
      const model = createBomExportModel(result);
      await saveBomPdf({
        model,
        filename: `${normalizedMdc}-materials-bom.pdf`
      });
      historyStore.recordSuccessfulExport({
        normalizedMdc,
        phcReference: model.phcReference,
        format: "pdf"
      });
      setHistoryEvents(historyStore.eventsFor(normalizedMdc));
      setExportMessage("PDF exported.");
    } catch {
      setExportMessage("PDF export failed.");
    }
  }

  async function exportExcel() {
    if (!result || !viewState.canExportExcel) return;

    const normalizedMdc = result.input.normalizedMdc;
    try {
      const outcome = await exportBomExcel({
        result,
        canExportExcel: viewState.canExportExcel,
        historyStore,
        confirm: () => window.confirm("An Excel file for this MDC was already exported. Export again?"),
        filename: materialsExcelFilename(normalizedMdc)
      });
      if (!outcome.exported) return;

      setHistoryEvents(outcome.historyEvents);
      setExportMessage("Excel exported.");
    } catch {
      setExportMessage("Excel export failed.");
    }
  }

  const hasResult = result !== null;
  const isBlocked = result?.state === "blocked";

  return (
    <>
      <section className="materialsTool screenOnly">
        <section className="card materialsCard">
          <h1>Materials BOM</h1>
          <label className="materialsField">
            <span>MDC reference</span>
            <input
              value={rawMdc}
              onChange={(event) => setRawMdc(event.target.value)}
              placeholder="MDC_iS.CP10_M1Cl2mA_AF"
            />
          </label>
          {runtimeData.status === "loading" ? <p className="materialsNotice">Loading Materials data…</p> : null}
          {runtimeData.status === "error" ? <p className="materialsNotice">Unable to load Materials runtime data.</p> : null}
          <button
            className="primary materialsCalculate"
            type="button"
            onClick={calculate}
            disabled={runtimeData.status !== "ready"}
          >
            Calculate BOM
          </button>
        </section>

        {hasResult ? (
          <>
            <section className="card materialsCard">
              <h2>Calculation result</h2>
              <dl className="materialsMetadata">
                <div><dt>Normalized MDC</dt><dd>{result.input.normalizedMdc ?? "-"}</dd></div>
                <div><dt>Equipment PHC</dt><dd>{result.phc.reference ?? "PHC reference not found"}</dd></div>
                <div><dt>State</dt><dd>{result.state}</dd></div>
              </dl>
              {viewState.isStale ? <p className="materialsNotice">This result is stale. Calculate again before exporting.</p> : null}
              {result.issues.length > 0 ? (
                <ul className="materialsIssues">
                  {result.issues.map((issue, index) => <li key={`${issue.kind}-${index}`}>{issue.message}</li>)}
                </ul>
              ) : null}
            </section>

            {!isBlocked ? (
              <>
                <section className="card materialsCard materialsComponents">
                  <h2>Components / Materials</h2>
                  <div className="tableWrap">
                    <table>
                      <thead><tr><th>Component</th><th>Material PHC</th><th>Description</th><th>Quantity</th></tr></thead>
                      <tbody>
                        {viewState.componentRows.map((row, index) => (
                          <tr key={`${row.sourceComponent}-${row.matrixRowId}-${index}`}>
                            <td>{row.sourceComponent}</td><td>{row.materialPhc || "-"}</td><td>{row.description}</td><td>{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="card materialsCard materialsTotals">
                  <h2>Materials Total</h2>
                  <div className="tableWrap">
                    <table>
                      <thead><tr><th>Material PHC</th><th>Description</th><th>Quantity</th></tr></thead>
                      <tbody>
                        {viewState.totalRows.map((row, index) => (
                          <tr key={`${row.materialIdentity}-${index}`}>
                            <td>{row.materialPhc || "-"}</td><td>{row.description}</td><td>{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}

            <section className="card materialsCard materialsExport">
              <h2>Export</h2>
              <button className="primary" type="button" onClick={exportPdf} disabled={!viewState.canExportPdf}>
                Export PDF
              </button>
              <button className="primary" type="button" onClick={exportExcel} disabled={!viewState.canExportExcel}>
                Export Excel
              </button>
              {exportMessage ? <p className="materialsNotice">{exportMessage}</p> : null}
            </section>

            {!isBlocked ? (
              <section className="card materialsCard materialsHistory">
                <h2>Local export history</h2>
                {viewState.historyEvents.length === 0 ? <p className="materialsNotice">No previous exports for this MDC.</p> : (
                  <ul>
                    {viewState.historyEvents.map((event, index) => (
                      <li key={`${event.format}-${event.exportedAt}-${index}`}>{event.format.toUpperCase()} — {formatExportedAt(event.exportedAt)}</li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </>
        ) : null}
      </section>

      {hasResult && !isBlocked ? (
        <section className="materialsPrintOnly">
          <h1>Materials Total</h1>
          <p><strong>MDC:</strong> {result.input.normalizedMdc}</p>
          <table>
            <thead><tr><th>Material PHC</th><th>Description</th><th>Quantity</th></tr></thead>
            <tbody>
              {viewState.totalRows.map((row, index) => (
                <tr key={`${row.materialIdentity}-${index}`}><td>{row.materialPhc || "-"}</td><td>{row.description}</td><td>{row.quantity}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </>
  );
}
