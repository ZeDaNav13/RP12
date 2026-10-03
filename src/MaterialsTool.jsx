import { useEffect, useMemo, useRef, useState } from "react";

import { calculateBom } from "./domain/bom.js";
import { exportBomExcel, materialsExcelFilename } from "./domain/bom-excel-workflow.js";
import { createBomHistoryStore } from "./domain/bom-history.js";
import { createMaterialsViewState } from "./domain/bom-ui-state.js";
import { formatMaterialIssue, formatMaterialState } from "./materials-ui-copy.js";

function formatExportedAt(value) {
  return new Date(value).toLocaleString("pt-PT");
}

export default function MaterialsTool() {
  const [rawMdc, setRawMdc] = useState("");
  const [runtimeData, setRuntimeData] = useState({ status: "loading", matrixCsvText: "", phcCsvText: "" });
  const [result, setResult] = useState(null);
  const [historyEvents, setHistoryEvents] = useState([]);
  const [exportMessage, setExportMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const inputRef = useRef(null);

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
  const excelHistoryEvents = viewState.historyEvents.filter((event) => event.format === "excel");

  function resetCalculatedView() {
    setResult(null);
    setHistoryEvents([]);
    setExportMessage("");
    setValidationMessage("");
  }

  function calculate() {
    if (runtimeData.status !== "ready") return;

    const nextResult = calculateBom({
      rawMdc,
      matrixCsvText: runtimeData.matrixCsvText,
      phcCsvText: runtimeData.phcCsvText
    });
    if (nextResult.state === "blocked") {
      resetCalculatedView();
      setValidationMessage(
        nextResult.issues.some((issue) => issue.kind === "phc_not_found")
          ? "Referência MDC não reconhecida: PHC do equipamento não encontrado."
          : "Não foi possível calcular os materiais para esta referência MDC."
      );
      return;
    }

    setResult(nextResult);
    setExportMessage("");
    setValidationMessage("");
    setHistoryEvents(historyStore.eventsFor(nextResult.input.normalizedMdc));
  }

  function editCalculatedReference() {
    resetCalculatedView();
    inputRef.current?.focus();
  }

  function clearCalculatedReference() {
    resetCalculatedView();
    setRawMdc("");
    inputRef.current?.focus();
  }

  function printMaterials() {
    if (!result || !viewState.canExportPdf) return;
    window.print();
  }

  async function exportExcel() {
    if (!result || !viewState.canExportExcel) return;

    const normalizedMdc = result.input.normalizedMdc;
    try {
      const outcome = await exportBomExcel({
        result,
        canExportExcel: viewState.canExportExcel,
        historyStore,
        confirm: () => window.confirm("Já foi exportado um ficheiro Excel para este MDC. Pretende exportá-lo novamente?"),
        filename: materialsExcelFilename(normalizedMdc)
      });
      if (!outcome.exported) return;

      setHistoryEvents(outcome.historyEvents);
      setExportMessage("Excel exportado.");
    } catch {
      setExportMessage("Não foi possível exportar o Excel.");
    }
  }

  const hasResult = result !== null;
  const hasUsableResult = result !== null && result.state !== "blocked";

  return (
    <>
      <section className="materialsTool screenOnly">
        <section className="card materialsCard">
          <h1>Modelo MdC</h1>
          <div className="materialsInputRow">
            <label className="materialsField">
              <span>Referência MDC</span>
              <input
                ref={inputRef}
                value={rawMdc}
                onChange={(event) => setRawMdc(event.target.value)}
                placeholder="colocar referência MDC aqui"
                readOnly={hasUsableResult}
              />
            </label>
            <button
              className="primary materialsCalculate"
              type="button"
              onClick={calculate}
              disabled={runtimeData.status !== "ready"}
            >
              Mostrar Materiais
            </button>
            {hasUsableResult ? (
              <>
                <button type="button" onClick={editCalculatedReference}>Editar</button>
                <button type="button" onClick={clearCalculatedReference}>Limpar</button>
              </>
            ) : null}
          </div>
          {runtimeData.status === "loading" ? <p className="materialsNotice">A carregar dados de materiais…</p> : null}
          {runtimeData.status === "error" ? <p className="materialsNotice">Não foi possível carregar os dados de materiais.</p> : null}
          {validationMessage ? <p className="materialsNotice">{validationMessage}</p> : null}
        </section>

        {hasResult ? (
          <>
            <section className="card materialsCard materialsProcessing">
              <h2>Processamento</h2>
              <div className="summaryList">
                <div className="summaryRow"><span className="summaryLabel">MDC normalizado</span><strong className="summaryValue">{result.input.normalizedMdc ?? "-"}</strong></div>
                <div className="summaryRow"><span className="summaryLabel">PHC do equipamento</span><strong className="summaryValue">{result.phc.reference ?? "Referência PHC não encontrada"}</strong></div>
                <div className="summaryRow"><span className="summaryLabel">Estado</span><strong className="summaryValue">{formatMaterialState(result.state)}</strong></div>
              </div>
              {result.issues.length > 0 ? (
                <details className="materialsIssueDetails">
                  <summary>Detalhes</summary>
                  <ul className="materialsIssues">
                    {result.issues.map((issue, index) => <li key={`${issue.kind}-${index}`}>{formatMaterialIssue(issue)}</li>)}
                  </ul>
                </details>
              ) : null}
            </section>

            <>
              <section className="card materialsCard materialsComponents">
                  <h2>Materiais por Componente</h2>
                  <div className="tableWrap">
                    <table>
                      <thead><tr><th>PHC</th><th>Componente</th><th>PHC do material</th><th>Descrição</th><th>Quantidade</th></tr></thead>
                      <tbody>
                        {viewState.componentRows.map((row, index) => (
                          <tr key={`${row.sourceComponent}-${row.matrixRowId}-${index}`}>
                            <td></td><td>{row.sourceComponent}</td><td>{row.materialPhc}</td><td>{row.description}</td><td>{row.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
              </section>

              <section className="card materialsCard materialsTotals">
                  <h2>Lista Completa</h2>
                  <div className="tableWrap">
                    <table>
                      <thead><tr><th>PHC do material</th><th>Descrição</th><th>Quantidade</th></tr></thead>
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

            <section className="materialsExportSection">
              <div className="materialsExportActions">
                <section className="card printActions">
                  <button className="primary" type="button" onClick={printMaterials} disabled={!viewState.canExportPdf}>
                    Imprimir / Guardar PDF
                  </button>
                </section>
                <section className="card printActions">
                  <button className="primary" type="button" onClick={exportExcel} disabled={!viewState.canExportExcel}>
                    Guardar Excel
                  </button>
                </section>
              </div>
              {exportMessage ? <p className="materialsNotice">{exportMessage}</p> : null}
            </section>

            <section className="card materialsCard materialsHistory">
                <h2>Actividade</h2>
                {excelHistoryEvents.length === 0 ? <p className="materialsNotice">Não existem exportações anteriores para este MDC.</p> : (
                  <ul>
                    {excelHistoryEvents.map((event, index) => (
                      <li key={`${event.format}-${event.exportedAt}-${index}`}>Formato: {event.format.toUpperCase()}{" — "}Exportado em: {formatExportedAt(event.exportedAt)}</li>
                    ))}
                  </ul>
                )}
            </section>
            </>
          </>
        ) : null}
      </section>

      {hasResult ? (
        <section className="materialsPrintOnly">
          <h1>Total de materiais</h1>
          <p><strong>MDC:</strong> {result.input.normalizedMdc}</p>
          <p><strong>PHC do equipamento:</strong> {result.phc.reference ?? "Referência PHC não encontrada"}</p>
          <table>
            <thead><tr><th>PHC do material</th><th>Descrição</th><th>Quantidade</th></tr></thead>
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
