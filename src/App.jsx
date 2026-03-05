import { useMemo, useState } from "react";
import logo from "../logo-aquaservice_big.svg";

const questions = [
  {
    id: "is2_modelo",
    label: "Selecione o Modelo do iS2",
    options: ["CP10", "CP20", "CP30", "CP40", "CP50", "CP60", "Nenhum"]
  },
  {
    id: "bomba_biocida_inorganico",
    label: "Selecione a Bomba de Biocida Inorgânico",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "bomba_biocida_organico",
    label: "Selecione a Bomba de Biocida Orgânico",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "bomba_controlo_ph",
    label: "Selecione a Bomba de Controlo de pH",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "bomba_inibidor",
    label: "Selecione a Bomba de Inibidor",
    options: ["VMS0706", "VCL0706", "Sem Bombas"]
  },
  {
    id: "sonda_cloro",
    label: "Selecione a Sonda de Cloro",
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
    label: "Selecione a Sonda de pH",
    options: ["pH m0c", "Sem sonda de pH"]
  },
  {
    id: "sonda_condutividade",
    label: "Selecione a Sonda de Condutividade",
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

function keyFor(questionId, option) {
  return `${questionId}:${option}`;
}

function defaultAssemblyCode(questionId, option) {
  if (questionId === "is2_modelo") return option ?? "";
  return assemblyCodes[keyFor(questionId, option)] ?? "";
}

function money(value) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(value);
}

export default function App() {
  const [answers, setAnswers] = useState({});
  const [customCodes, setCustomCodes] = useState({});
  const question1 = questions.slice(0, 1);
  const questions2to5 = questions.slice(1, 5);
  const questions6to8 = questions.slice(5, 8);

  const selectedItems = useMemo(() => {
    return questions
      .map((q) => {
        const selected = answers[q.id];
        if (!selected) return null;
        const key = keyFor(q.id, selected);
        const price = prices[key] ?? 0;
        const code = customCodes[key] ?? defaultAssemblyCode(q.id, selected);
        return {
          questionId: q.id,
          questionLabel: q.label,
          option: selected,
          code,
          price
        };
      })
      .filter(Boolean);
  }, [answers, customCodes]);

  const total = useMemo(() => {
    return questions.reduce((sum, q) => {
      const selected = answers[q.id];
      return sum + (prices[keyFor(q.id, selected)] ?? 0);
    }, 0);
  }, [answers]);

  const assemblyLine = useMemo(() => {
    return selectedItems
      .map((item) => item.code.trim())
      .filter((code) => code.length > 0)
      .join(" + ");
  }, [selectedItems]);

  return (
    <main className="page">
      <section className="card">
        <div className="headerRow">
          <div>
            <h1>Selecionador do modelo de MDC</h1>
            <p className="muted">Fluxo guiado de perguntas para montar o orçamento.</p>
          </div>
          <img className="headerLogo" src={logo} alt="Logo" />
        </div>
      </section>

      <div className="cardsRow">
        <section className="card questionCard">
          <h2>Pergunta 1</h2>
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
                  <option value="">Selecionar...</option>
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
          <h2>Perguntas 2-5</h2>
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
                  <option value="">Selecionar...</option>
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
          <h2>Perguntas 6-8</h2>
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
                  <option value="">Selecionar...</option>
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
        <div className="summary">
          <span>Total estimado</span>
          <strong>{money(total)}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Linha de Montagem</h2>
        <p className="muted">
          Preencha os códigos internos por opção selecionada. Este bloco gera a linha para a
          equipa de montagem.
        </p>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Pergunta</th>
                <th>Resposta</th>
                <th>Código da peça</th>
                <th>Preço</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="muted">
                    Sem respostas selecionadas.
                  </td>
                </tr>
              ) : (
                selectedItems.map((item) => {
                  const key = keyFor(item.questionId, item.option);
                  return (
                    <tr key={key}>
                      <td>{item.questionLabel}</td>
                      <td>{item.option}</td>
                      <td>
                        <input
                          placeholder="Ex: BOMBA-VMS0706"
                          value={customCodes[key] ?? defaultAssemblyCode(item.questionId, item.option)}
                          onChange={(e) =>
                            setCustomCodes((prev) => ({
                              ...prev,
                              [key]: e.target.value
                            }))
                          }
                        />
                      </td>
                      <td>{money(item.price)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <label className="stack">
          Linha final para montagem
          <textarea readOnly value={assemblyLine || "Sem códigos preenchidos ainda."} />
        </label>
      </section>
    </main>
  );
}
