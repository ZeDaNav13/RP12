import { parseBomMdc } from "./bom-mdc.js";
import { parseMaterialsMatrix } from "./bom-matrix.js";
import { createPhcLookup } from "./bom-phc.js";
import { deriveBomStatus } from "./bom-status.js";

function materialIdentity(row) {
  return row.materialPhc ? `phc:${row.materialPhc}` : `row:${row.rowId}`;
}

function addContributions(contributions, matrixRows, sourceComponent, sourceCount) {
  for (const row of matrixRows) {
    const rowQuantity = row.quantities[sourceComponent];
    if (rowQuantity === null) continue;

    const quantity = rowQuantity * sourceCount;
    if (quantity > 0) {
      contributions.push({
        sourceComponent,
        sourceCount,
        materialPhc: row.materialPhc,
        matrixRowId: row.rowId,
        description: row.description,
        quantity
      });
    }
  }
}

export function calculateBomMaterials(parsedMdc, matrix) {
  const contributions = [];
  const unmappedComponents = [];

  for (const component of parsedMdc.components) {
    if (!matrix.componentCodes.has(component.code)) {
      unmappedComponents.push(component.code);
      continue;
    }

    if (matrix.rows.some((row) => row.quantities[component.code] === null)) {
      unmappedComponents.push(component.code);
    }

    addContributions(contributions, matrix.rows, component.code, component.count);
  }

  if (matrix.rows.some((row) => row.quantities.ALWAYS === null)) {
    unmappedComponents.push("ALWAYS");
  }

  addContributions(contributions, matrix.rows, "ALWAYS", 1);

  const materialTotalsByIdentity = new Map();
  const missingMaterialPhcs = [];
  const missingMatrixRows = new Set();

  for (const contribution of contributions) {
    const identity = materialIdentity({
      materialPhc: contribution.materialPhc,
      rowId: contribution.matrixRowId
    });
    const existingTotal = materialTotalsByIdentity.get(identity);

    if (existingTotal) {
      existingTotal.quantity += contribution.quantity;
    } else {
      materialTotalsByIdentity.set(identity, {
        materialIdentity: identity,
        materialPhc: contribution.materialPhc,
        matrixRowId: contribution.materialPhc ? null : contribution.matrixRowId,
        description: contribution.description,
        quantity: contribution.quantity
      });
    }

    if (!contribution.materialPhc && !missingMatrixRows.has(contribution.matrixRowId)) {
      missingMatrixRows.add(contribution.matrixRowId);
      missingMaterialPhcs.push({
        matrixRowId: contribution.matrixRowId,
        description: contribution.description
      });
    }
  }

  return {
    contributions,
    materialTotals: [...materialTotalsByIdentity.values()],
    unmappedComponents,
    missingMaterialPhcs
  };
}

function blockedBom(originalMdc, normalizedMdc, issues) {
  return {
    state: "blocked",
    input: {
      originalMdc,
      normalizedMdc
    },
    phc: {
      reference: null,
      status: "not_found"
    },
    parsedComponents: [],
    contributions: [],
    materialTotals: [],
    issues,
    exportEligibility: {
      pdf: false,
      excel: false
    }
  };
}

export function calculateBom({ rawMdc, matrixCsvText, phcCsvText }) {
  const parsedMdc = parseBomMdc(rawMdc);
  if (!parsedMdc.ok) {
    return blockedBom(rawMdc, null, [{
      severity: "problem",
      kind: "malformed_mdc",
      message: `${parsedMdc.error.segment}: ${parsedMdc.error.message}`
    }]);
  }

  const matrix = parseMaterialsMatrix(matrixCsvText);
  if (!matrix.ok) {
    return blockedBom(rawMdc, parsedMdc.value.normalizedMdc, matrix.errors.map((error) => ({
      severity: "problem",
      kind: "invalid_matrix",
      message: `row ${error.row}, ${error.column}: ${error.message}`
    })));
  }

  const phcReference = createPhcLookup(phcCsvText).find(parsedMdc.value.normalizedMdc);
  const materials = calculateBomMaterials(parsedMdc.value, matrix.value);
  const status = deriveBomStatus({
    phcReference,
    unmappedComponents: materials.unmappedComponents,
    missingMaterialPhcs: materials.missingMaterialPhcs
  });

  return {
    state: status.state,
    input: {
      originalMdc: rawMdc,
      normalizedMdc: parsedMdc.value.normalizedMdc
    },
    phc: {
      reference: phcReference,
      status: phcReference ? "found" : "not_found"
    },
    parsedComponents: parsedMdc.value.components,
    contributions: materials.contributions,
    materialTotals: materials.materialTotals,
    issues: status.issues,
    exportEligibility: status.exportEligibility
  };
}
