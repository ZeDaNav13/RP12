import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseBomCsv } from "../src/domain/bom-csv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function csvValue(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function reportRow(values) {
  return values.map(csvValue).join(",");
}

async function getVersion() {
  const config = JSON.parse(await fs.readFile(path.join(rootDir, "release-version.json"), "utf8"));
  const version = String(config.version ?? "").trim();

  if (!/^v\d+(?:\.\d+)*$/.test(version)) {
    throw new Error("Invalid version in release-version.json. Expected format like v1.7.");
  }

  return version;
}

function parseComponentRows(text) {
  const [headers, ...rows] = parseBomCsv(text);

  if (headers?.join(",") !== "component_code,component_phc") {
    throw new Error("Invalid components.csv schema. Expected component_code,component_phc.");
  }

  return rows.map(([componentCode, componentPhc]) => ({
    componentCode: componentCode?.trim(),
    componentPhc: componentPhc?.trim() ?? ""
  }));
}

function parseMatrixRows(text) {
  const [headers, ...rows] = parseBomCsv(text);
  const materialPhcIndex = headers?.indexOf("material_phc");
  const descriptionIndex = headers?.indexOf("description");

  if (materialPhcIndex !== 0 || descriptionIndex !== 1 || headers?.[2] !== "ALWAYS") {
    throw new Error("Invalid materials_matrix.csv schema. Expected material_phc,description,ALWAYS.");
  }

  return { headers, rows };
}

function buildGapReport(componentRows, matrix) {
  const report = [["data_type", "status", "component_code", "material_identifier", "description", "detail"]];

  for (const { componentCode, componentPhc } of componentRows) {
    if (!componentPhc) {
      report.push(["component", "missing_component_phc", componentCode, "", "", "component_phc is blank"]);
    }
  }

  matrix.rows.forEach((row, index) => {
    if (!(row[0] ?? "").trim()) {
      report.push([
        "material",
        "missing_material_phc",
        "",
        `matrix-row-${index + 2}`,
        row[1] ?? "",
        "material_phc is blank"
      ]);
    }
  });

  for (const { componentCode } of componentRows) {
    const componentIndex = matrix.headers.indexOf(componentCode);

    if (componentIndex === -1) {
      report.push(["mapping", "missing_component_mapping", componentCode, "", "", "component column is absent from materials_matrix.csv"]);
      continue;
    }

    const hasPositiveMapping = matrix.rows.some((row) => Number(row[componentIndex]) > 0);
    if (!hasPositiveMapping) {
      report.push([
        "mapping",
        "no_positive_material_mapping",
        componentCode,
        "",
        "",
        "Review/confirm: no positive material quantity is currently mapped; confirm whether this is intentional or provide the missing material mapping/quantity."
      ]);
    }
  }

  return `${report.map(reportRow).join("\n")}\n`;
}

function handoffReadme(version) {
  return `RP12 CLIENT DATA COMPLETION — ${version}\n=================================\n\nThese files are for CLIENT DATA COMPLETION. They are not deployed applications.\nThe authoritative repository sources remain under public/; return the completed\nCSVs to us so we can validate and merge them before final ${version} delivery ZIP\ngeneration.\n\ncomponents_to_complete.csv\n--------------------------\nFill component_phc only. Keep component_code unchanged.\n\nmaterials_matrix_to_complete.csv\n--------------------------------\nVerify or fill material PHCs, material/component relationships, and the required\nquantities. Preserve the existing matrix headers and CSV structure.\n\nclient_data_gaps.csv\n--------------------\nThis is a diagnostic guide only. Do not return it as an authoritative data file.\n\nStatus meanings\n---------------\nmissing_component_phc\n  Must provide the component PHC.\n\nmissing_material_phc\n  Must provide the material PHC.\n\nmissing_component_mapping\n  The component column/mapping is missing and must be reviewed and provided.\n\nno_positive_material_mapping\n  REVIEW / CONFIRM ONLY. There is currently no positive material quantity mapped\n  for this component. This may be intentional. Only add or change materials or\n  quantities if the client confirms something is missing.\n\nEquipment PHCs\n--------------\nEquipment PHCs are already maintained separately in phc_integration.csv and are\nnot part of this handoff.\n`;
}

async function main() {
  const version = await getVersion();
  const handoffRoot = path.join(rootDir, "client-input", version);
  const componentsPath = path.join(rootDir, "public/components/components.csv");
  const matrixPath = path.join(rootDir, "public/materials/materials_matrix.csv");
  const [componentsText, matrixText] = await Promise.all([
    fs.readFile(componentsPath, "utf8"),
    fs.readFile(matrixPath, "utf8")
  ]);
  const componentRows = parseComponentRows(componentsText);
  const matrix = parseMatrixRows(matrixText);

  await fs.rm(handoffRoot, { recursive: true, force: true });
  await fs.mkdir(handoffRoot, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(handoffRoot, "components_to_complete.csv"), componentsText),
    fs.writeFile(path.join(handoffRoot, "materials_matrix_to_complete.csv"), matrixText),
    fs.writeFile(path.join(handoffRoot, "client_data_gaps.csv"), buildGapReport(componentRows, matrix)),
    fs.writeFile(path.join(handoffRoot, "README_CLIENT_INPUT.txt"), handoffReadme(version))
  ]);

  console.log(`Prepared client-input/${version}/ for ${componentRows.length} component codes.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
