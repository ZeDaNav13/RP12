import { useMemo, useState } from "react";
import logo from "../logo-aquaservice_big.svg";

const questions = [
  {
    id: "is2_modelo",
    detailLabel: "IS₂",
    label: (
      <span className="is2Label">
        IS<sub>2</sub>
      </span>
    ),
    options: ["CP10", "CP20", "CP30", "CP40", "CP50", "CP60", "Nenhum"]
  },
  {
    id: "bomba_biocida_inorganico",
    detailLabel: "Biocida Inorgânico",
    label: "Biocida Inorgânico",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "bomba_biocida_organico",
    detailLabel: "Biocida Orgânico",
    label: "Biocida Orgânico",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "bomba_controlo_ph",
    detailLabel: "Controlo de pH",
    label: "Controlo de pH",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "bomba_inibidor",
    detailLabel: "Inibidor",
    label: "Inibidor",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "sonda_cloro",
    detailLabel: "Cloro",
    label: "Cloro",
    options: [
      "Cloro 0-2 mA Reiss CS4",
      "Cloro 0-5 mA Reiss CS4",
      "Cloro 0-10 mA Reiss CS4",
      "Cloro 0-5 mA Reiss AS3",
      "Cloro 0-20 mA Reiss AS3",
      "Cloro 0-5 Reiss AS2",
      "Cloro 0-20 Reiss AS2",
      "Cloro 0-2 Reiss CS4 m0c",
      "Cloro 0-5 Reiss CS4 m0c",
      "Cloro 0-10 Reiss CS4 m0c",
      "Cloro 0-5 Reiss AS3 m0c",
      "Cloro 0-20 Reiss AS3 m0c",
      "Cloro 0-5 Reiss AS2 m0c",
      "Cloro 0-20 Reiss AS2 m0c",
      "Cloro 0-2 Seko",
      "Cloro 0-10 Seko",
      "Sem sonda de cloro"
    ]
  },
  {
    id: "sonda_ph",
    detailLabel: "pH",
    label: "pH",
    options: ["pH m0c", "Sem sonda de pH"]
  },
  {
    id: "sonda_condutividade",
    detailLabel: "Condutividade",
    label: "Condutividade",
    options: ["Condutividade m0c", "Sem sonda de condutividade"]
  }
];

const prices = {
  "is2_modelo:CP10": 1301.91,
  "is2_modelo:CP20": 1396.26,
  "is2_modelo:CP30": 1526.21,
  "is2_modelo:CP40": 1593.57,
  "is2_modelo:CP50": 1704.23,
  "is2_modelo:CP60": 1931.79,
  "is2_modelo:Nenhum": 0,
  "bomba_biocida_inorganico:VMS0706": 450.7,
  "bomba_biocida_inorganico:VCL0706": 287.96,
  "bomba_biocida_inorganico:Sem Bombas": 0,
  "bomba_biocida_organico:VMS0706": 450.7,
  "bomba_biocida_organico:VCL0706": 287.96,
  "bomba_biocida_organico:Sem Bombas": 0,
  "bomba_controlo_ph:VMS0706": 450.7,
  "bomba_controlo_ph:VCL0706": 287.96,
  "bomba_controlo_ph:Sem Bombas": 0,
  "bomba_inibidor:VMS0706": 450.7,
  "bomba_inibidor:VCL0706": 287.96,
  "bomba_inibidor:Sem Bombas": 0,
  "sonda_cloro:Cloro 0-2 mA Reiss CS4": 1117.08,
  "sonda_cloro:Cloro 0-5 mA Reiss CS4": 1117.08,
  "sonda_cloro:Cloro 0-10 mA Reiss CS4": 1117.08,
  "sonda_cloro:Cloro 0-5 mA Reiss AS3": 2273.62,
  "sonda_cloro:Cloro 0-20 mA Reiss AS3": 2273.62,
  "sonda_cloro:Cloro 0-5 Reiss AS2": 2006.34,
  "sonda_cloro:Cloro 0-20 Reiss AS2": 2006.34,
  "sonda_cloro:Cloro 0-2 Reiss CS4 m0c": 1751.66,
  "sonda_cloro:Cloro 0-5 Reiss CS4 m0c": 1751.66,
  "sonda_cloro:Cloro 0-10 Reiss CS4 m0c": 1751.66,
  "sonda_cloro:Cloro 0-5 Reiss AS3 m0c": 2160.48,
  "sonda_cloro:Cloro 0-20 Reiss AS3 m0c": 2160.48,
  "sonda_cloro:Cloro 0-5 Reiss AS2 m0c": 1998.42,
  "sonda_cloro:Cloro 0-20 Reiss AS2 m0c": 1998.42,
  "sonda_cloro:Cloro 0-2 Seko": 800,
  "sonda_cloro:Cloro 0-10 Seko": 800,
  "sonda_cloro:Sem sonda de cloro": 0,
  "sonda_ph:pH m0c": 432,
  "sonda_ph:Sem sonda de pH": 0,
  "sonda_condutividade:Condutividade m0c": 436,
  "sonda_condutividade:Sem sonda de condutividade": 0
};
const assemblyCodes = {
  "bomba_biocida_inorganico:VMS0706": "BDP",
  "bomba_biocida_inorganico:VCL0706": "BDC",
  "bomba_biocida_inorganico:Sem Bombas": "-",
  "bomba_biocida_organico:VMS0706": "BDP",
  "bomba_biocida_organico:VCL0706": "BDC",
  "bomba_biocida_organico:Sem Bombas": "-",
  "bomba_controlo_ph:VMS0706": "BDP",
  "bomba_controlo_ph:VCL0706": "BDC",
  "bomba_controlo_ph:Sem Bombas": "-",
  "bomba_inibidor:VMS0706": "BDP",
  "bomba_inibidor:VCL0706": "BDC",
  "bomba_inibidor:Sem Bombas": "-",
  "sonda_cloro:Cloro 0-2 mA Reiss CS4": "Cl2mA",
  "sonda_cloro:Cloro 0-5 mA Reiss CS4": "Cl5mA",
  "sonda_cloro:Cloro 0-10 mA Reiss CS4": "Cl10mA",
  "sonda_cloro:Cloro 0-5 mA Reiss AS3": "Cl5mA",
  "sonda_cloro:Cloro 0-20 mA Reiss AS3": "Cl20mA",
  "sonda_cloro:Cloro 0-5 Reiss AS2": "Cl5mA",
  "sonda_cloro:Cloro 0-20 Reiss AS2": "Cl20mA",
  "sonda_cloro:Cloro 0-2 Reiss CS4 m0c": "Cl2m0c",
  "sonda_cloro:Cloro 0-5 Reiss CS4 m0c": "Cl5m0c",
  "sonda_cloro:Cloro 0-10 Reiss CS4 m0c": "Cl10m0c",
  "sonda_cloro:Cloro 0-5 Reiss AS3 m0c": "Cl5m0c",
  "sonda_cloro:Cloro 0-20 Reiss AS3 m0c": "Cl20m0c",
  "sonda_cloro:Cloro 0-5 Reiss AS2 m0c": "Cl5m0c",
  "sonda_cloro:Cloro 0-20 Reiss AS2 m0c": "Cl20m0c",
  "sonda_cloro:Cloro 0-2 Seko": "Cl2mA",
  "sonda_cloro:Cloro 0-10 Seko": "Cl10mA",
  "sonda_cloro:Sem sonda de cloro": "-",
  "sonda_ph:pH m0c": "pH",
  "sonda_ph:Sem sonda de pH": "-",
  "sonda_condutividade:Condutividade m0c": "CD",
  "sonda_condutividade:Sem sonda de condutividade": "-"
};
const portaSondasPrices = {
  AF: 311.88,
  AQ: 445.38,
  BF: 378.8,
  BQ: 726,
  CF: 343.16,
  CQ: 1006.62,
  DF: 228.46,
  FF: 101.26
};
const bdwPrice = 191.34;
const assemblyTags = {
  is2_modelo: "MDC_iS",
  bomba_biocida_inorganico: "BBI",
  bomba_biocida_organico: "BBO",
  bomba_controlo_ph: "BPH",
  bomba_inibidor: "BIN",
  sonda_cloro: "SCL",
  sonda_ph: "SPH",
  sonda_condutividade: "SCD"
};
const pumpQuestionIds = [
  "bomba_biocida_inorganico",
  "bomba_biocida_organico",
  "bomba_controlo_ph",
  "bomba_inibidor"
];
const probeQuestionIds = ["sonda_cloro", "sonda_ph", "sonda_condutividade"];
const circuitoOptions = [
  "Torres",
  "Água Quente Sanitária",
  "Água Consumo Humano",
  "Piscinas",
  "Outros"
];
const is2Descriptions = {
  CP10: "CP10- Sem bomba de recirculação e sem comunicação remota",
  CP20: "CP20- Com uma bomba de recirculação e sem comunicação remota",
  CP30: "CP30- Sem bomba de recirculação e com comunicação remota",
  CP40: "CP40- Com uma bomba de recirculação e com Comunicação Remota",
  CP50: "CP50- Com duas bombas de recirculação e sem comunicação remota",
  CP60: "CP60- Com duas bombas de recirculação e com comunicação remota"
};

function keyFor(questionId, option) {
  return `${questionId}:${option}`;
}

function getNoneOption(question) {
  return question.options.find((option) => /^(nenhum|sem)/i.test(option.trim())) ?? "";
}

function isNoneSelection(selection) {
  return /^(nenhum|sem)/i.test((selection ?? "").trim());
}

function defaultAssemblyCode(questionId, option) {
  if (questionId === "is2_modelo") {
    if ((option ?? "").trim().toLowerCase() === "nenhum") return "_";
    return option ?? "";
  }
  return assemblyCodes[keyFor(questionId, option)] ?? "";
}

function formatPumpCounts(pumpCodes) {
  const orderedCounts = [];
  pumpCodes.forEach((code) => {
    const existing = orderedCounts.find((item) => item.code === code);
    if (existing) {
      existing.count += 1;
    } else {
      orderedCounts.push({ code, count: 1 });
    }
  });
  const priority = { BDP: 0, BDC: 1 };
  orderedCounts.sort((a, b) => {
    const pa = priority[a.code] ?? 99;
    const pb = priority[b.code] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.code.localeCompare(b.code);
  });
  return orderedCounts.map((item) => `${item.count}${item.code}`).join("+");
}

function formatSondaSegment(probeCodes, cloroSelection) {
  const selectedCodes = probeCodes.filter((code) => code !== "-");
  const selectedCount = selectedCodes.length;
  if (selectedCount === 0) return "";
  const ptCloroOptions = new Set([
    "Cloro 0-2 Reiss CS4 m0c",
    "Cloro 0-5 Reiss CS4 m0c",
    "Cloro 0-10 Reiss CS4 m0c",
    "Cloro 0-5 Reiss AS3 m0c",
    "Cloro 0-20 Reiss AS3 m0c",
    "Cloro 0-5 Reiss AS2 m0c",
    "Cloro 0-20 Reiss AS2 m0c"
  ]);
  const hasPhOrCond = probeCodes[1] !== "-" || probeCodes[2] !== "-";
  const hasPtCloro = ptCloroOptions.has((cloroSelection ?? "").trim());
  const ptSuffix = hasPhOrCond || hasPtCloro ? ".PT" : "";
  return `M${selectedCount} ${selectedCodes.join("/")}${ptSuffix}`;
}

function resolvePortaSondasBaseLetter(probeCodes) {
  const [cloroCode, phCode, condCode] = probeCodes;
  const hasCloro = cloroCode !== "-";
  const hasPh = phCode !== "-";
  const hasCond = condCode !== "-";
  const selectedCount = [hasCloro, hasPh, hasCond].filter(Boolean).length;

  if (hasCloro) {
    if (selectedCount === 1) return "A";
    if (selectedCount === 2) return "B";
    if (selectedCount === 3) return "C";
  }

  if (hasPh && hasCond) return "D";
  if (hasPh || hasCond) return "F";
  return "";
}

function resolvePortaSondasCode(probeCodes, cloroSelection) {
  const baseLetter = resolvePortaSondasBaseLetter(probeCodes);
  if (!baseLetter) return "";

  const qPrefixCloroOptions = new Set([
    "Cloro 0-5 mA Reiss AS3",
    "Cloro 0-20 mA Reiss AS3",
    "Cloro 0-5 Reiss AS3 m0c",
    "Cloro 0-20 Reiss AS3 m0c"
  ]);
  const suffix = qPrefixCloroOptions.has((cloroSelection ?? "").trim()) ? "Q" : "F";
  return `${baseLetter}${suffix}`;
}

function needsBDW(circuito) {
  return (circuito ?? "").trim() === "Torres";
}

function money(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(value);
}

export default function App() {
  const [answers, setAnswers] = useState(() =>
    Object.fromEntries(questions.map((q) => [q.id, getNoneOption(q)]))
  );
  const [circuito, setCircuito] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const question1 = questions.slice(0, 1);
  const questions2to5 = questions.slice(1, 5);
  const questions6to8 = questions.slice(5, 8);

  const total = useMemo(() => {
    const baseTotal = questions.reduce((sum, q) => {
      const selected = answers[q.id];
      return sum + (prices[keyFor(q.id, selected)] ?? 0);
    }, 0);
    const probeCodes = probeQuestionIds.map((questionId) => {
      const option = answers[questionId] ?? "";
      return (defaultAssemblyCode(questionId, option) ?? "-").trim() || "-";
    });
    const portaSondasCode = resolvePortaSondasCode(probeCodes, answers.sonda_cloro);
    const bdwTotal = needsBDW(circuito) ? bdwPrice : 0;
    return baseTotal + (portaSondasPrices[portaSondasCode] ?? 0) + bdwTotal;
  }, [answers, circuito]);

  const detailedRows = useMemo(() => {
    const baseRows = questions.map((q) => {
      const selection = answers[q.id] ?? "";
      const code = defaultAssemblyCode(q.id, selection) || "-";
      const pvp = prices[keyFor(q.id, selection)] ?? 0;
      return {
        id: q.id,
        question: q.detailLabel ?? q.id,
        selection,
        code,
        pvp
      };
    });
    const probeCodes = probeQuestionIds.map((questionId) => {
      const option = answers[questionId] ?? "";
      return (defaultAssemblyCode(questionId, option) ?? "-").trim() || "-";
    });
    const portaSondasCode = resolvePortaSondasCode(probeCodes, answers.sonda_cloro);
    if (!portaSondasCode) return baseRows;

    const rows = [
      ...baseRows,
      {
        id: "porta-sondas",
        question: "Porta-Sondas",
        selection: "Automático",
        code: portaSondasCode,
        pvp: portaSondasPrices[portaSondasCode] ?? 0
      }
    ];
    if (needsBDW(circuito)) {
      rows.push({
        id: "bdw",
        question: "Circuito",
        selection: circuito,
        code: "BDW",
        pvp: bdwPrice
      });
    }
    return rows;
  }, [answers, circuito]);
  const detailedRowsWithValue = detailedRows.filter((row) => !isNoneSelection(row.selection));
  const printedAt = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date()),
    []
  );

  const assemblyLine = useMemo(() => {
    const modelOption = answers.is2_modelo ?? "";
    const modelCode = (defaultAssemblyCode("is2_modelo", modelOption) ?? "-").trim() || "-";

    const pumpCodes = pumpQuestionIds
      .map((questionId) => {
        const option = answers[questionId] ?? "";
        return (defaultAssemblyCode(questionId, option) ?? "-").trim() || "-";
      })
      .filter((code) => code !== "-");
    const dosingSegment = pumpCodes.length > 0 ? `D${formatPumpCounts(pumpCodes)}` : "_";

    const probeCodes = probeQuestionIds.map((questionId) => {
      const option = answers[questionId] ?? "";
      return (defaultAssemblyCode(questionId, option) ?? "-").trim() || "-";
    });
    const sondaSegment = formatSondaSegment(probeCodes, answers.sonda_cloro);
    const portaSondasCode = resolvePortaSondasCode(probeCodes, answers.sonda_cloro);
    const bdwSegment = needsBDW(circuito) ? "BDW" : "";

    return [
      `${assemblyTags.is2_modelo}.${modelCode}`,
      dosingSegment,
      sondaSegment,
      portaSondasCode,
      bdwSegment
    ]
      .filter(Boolean)
      .join("_");
  }, [answers, circuito]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMsg("Copiado");
      window.setTimeout(() => setCopyMsg(""), 1400);
    } catch {
      setCopyMsg("Falhou a cópia");
      window.setTimeout(() => setCopyMsg(""), 1800);
    }
  };

  const printBudget = () => {
    window.print();
  };

  return (
    <main className="page">
      <div className="screenOnly">
      <section className="card">
        <div className="headerRow">
          <div>
            <h1>Selecionador do modelo de MDC</h1>
          </div>
          <img className="headerLogo" src={logo} alt="Logo" />
        </div>
      </section>

      <div className="cardsRow">
        <section className="card questionCard">
          <h2>Modelo</h2>
          <div className="grid">
            {question1.map((q) => (
              <label key={q.id} className="wide">
                {q.label}
                <select
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value
                    }))
                  }
                >
                  {q.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {answers[q.id] && is2Descriptions[answers[q.id]] ? (
                  <p className="muted">{is2Descriptions[answers[q.id]]}</p>
                ) : null}
                <div className="wide circuitoField">
                  <span>Circuito</span>
                  <select value={circuito} onChange={(e) => setCircuito(e.target.value)}>
                    <option value="">Seleccionar</option>
                    {circuitoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="card questionCard">
          <h2>Bombas</h2>
          <div className="grid">
            {questions2to5.map((q) => (
              <label key={q.id} className="wide">
                {q.label}
                <select
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value
                    }))
                  }
                >
                  {q.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>

        <section className="card questionCard">
          <h2>Sondas</h2>
          <div className="grid">
            {questions6to8.map((q) => (
              <label key={q.id} className="wide">
                {q.label}
                <select
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value
                    }))
                  }
                >
                  {q.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <h2>Resumo</h2>
        <div className="summaryList">
          <div className="summaryRow">
            <span className="summaryLabel">Valor estimado</span>
            <div className="summaryValueWrap">
              <strong className="summaryValue">{money(total)}</strong>
              <button
                className="copyIconButton"
                onClick={() => copyToClipboard(money(total))}
                aria-label="Copiar valor estimado"
                title="Copiar"
              >
                ⧉
              </button>
            </div>
          </div>

          <div className="summaryRow">
            <span className="summaryLabel">Referência MDC</span>
            <div className="summaryValueWrap">
              <strong className="summaryValue">{assemblyLine}</strong>
              <button
                className="copyIconButton"
                onClick={() => copyToClipboard(assemblyLine)}
                aria-label="Copiar referência MDC"
                title="Copiar"
              >
                ⧉
              </button>
            </div>
          </div>
        </div>
        <div className="printActions">
          <button className="primary" onClick={printBudget}>
            Imprimir / Guardar PDF
          </button>
        </div>
        {copyMsg ? <p className="copyStatus muted">{copyMsg}</p> : null}
      </section>

      <section className="card">
        <h2>Detalhado</h2>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Selection</th>
                <th>Code</th>
              </tr>
            </thead>
            <tbody>
              {detailedRowsWithValue.length === 0 ? (
                <tr>
                  <td colSpan="3" className="muted">
                    Sem componentes selecionados.
                  </td>
                </tr>
              ) : (
                detailedRowsWithValue.map((row) => (
                  <tr key={row.id}>
                    <td>{row.question}</td>
                    <td>{row.selection}</td>
                    <td>{row.code}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="footer">
        © 2026{" "}
        <a href="https://paperpushers.biz" target="_blank" rel="noreferrer">
          PaperPushers
        </a>
      </footer>
      </div>

      <section className="printOnly printSheet">
        <header className="printHeader">
          <img className="printLogo" src={logo} alt="Logo" />
          <div>
            <h1>Orçamento</h1>
            <p>Data: {printedAt}</p>
            <p>Referência MDC: {assemblyLine}</p>
            <p>Valor estimado: {money(total)}</p>
          </div>
        </header>

        <section className="printDetails">
          <h2>Detalhado</h2>
          <table>
            <thead>
              <tr>
                <th>Question</th>
                <th>Selection</th>
                <th>Code</th>
              </tr>
            </thead>
            <tbody>
              {detailedRowsWithValue.map((row) => (
                <tr key={`print-${row.id}`}>
                  <td>{row.question}</td>
                  <td>{row.selection}</td>
                  <td>{row.code}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
