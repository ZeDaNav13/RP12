function materialIdentity(row) {
  return row.materialPhc ? `phc:${row.materialPhc}` : `row:${row.rowId}`;
}

function addContributions(contributions, matrixRows, sourceComponent, sourceCount) {
  for (const row of matrixRows) {
    const quantity = row.quantities[sourceComponent] * sourceCount;
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

    addContributions(contributions, matrix.rows, component.code, component.count);
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
