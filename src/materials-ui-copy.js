const stateLabels = {
  complete: "completo",
  incomplete: "incompleto",
  blocked: "bloqueado"
};

function formatInvalidMatrixMessage(message) {
  return message
    .replace(/^row (\d+), /, "linha $1, ")
    .replace("mismatched row width", "número de colunas incompatível")
    .replace("blank description", "descrição em falta")
    .replace("duplicate material PHC", "PHC do material duplicado")
    .replace("invalid quantity", "quantidade inválida");
}

export function formatMaterialState(state) {
  return stateLabels[state] ?? state;
}

export function formatMaterialIssue(issue) {
  switch (issue.kind) {
    case "phc_not_found":
      return "Referência PHC não encontrada";
    case "unmapped_component":
      return issue.message.replace("no material mapping defined", "sem mapeamento de materiais definido");
    case "missing_material_phc":
      return issue.message.replace("material PHC not found", "referência PHC do material não encontrada");
    case "malformed_mdc":
      return issue.message.replace("invalid MDC structure", "estrutura MDC inválida");
    case "invalid_matrix":
      return formatInvalidMatrixMessage(issue.message);
    default:
      return issue.message;
  }
}
