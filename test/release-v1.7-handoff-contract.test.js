import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function writeFixtureFile(root, relativePath, contents) {
  const targetPath = path.join(root, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents);
}

async function copyHandoffWorkspace() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "rp12-v17-handoff-"));

  await cp(path.join(repoRoot, "scripts/prepare-client-input.mjs"), path.join(workspace, "scripts/prepare-client-input.mjs"));
  await cp(path.join(repoRoot, "src/domain/bom-csv.js"), path.join(workspace, "src/domain/bom-csv.js"));
  await writeFixtureFile(workspace, "release-version.json", '{"version":"v1.7"}\n');
  await writeFixtureFile(workspace, "public/components/components.csv", "component_code,component_phc\nCP10,\nAF,COMP-AF\n");
  await writeFixtureFile(
    workspace,
    "public/materials/materials_matrix.csv",
    "material_phc,description,ALWAYS,CP10,AF\n,Unreferenced material,0,2,\nMAT-KNOWN,Known material,0,0,0\n"
  );

  return workspace;
}

test("v1.7 is the active release version and its delivery scripts retain separate folder and ZIP ownership", async () => {
  const version = JSON.parse(await readFile(path.join(repoRoot, "release-version.json"), "utf8"));
  const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));

  assert.equal(version.version, "v1.7");
  assert.doesNotMatch(packageJson.scripts["release:prepare"], /--zip/);
  assert.match(packageJson.scripts["release:client"], /--zip/);
});

test("the protected historical v1.6 ZIP has an immutable tracked manifest", async () => {
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "release/protected-artifacts.json"), "utf8")
  );

  assert.deepEqual(manifest, {
    artifacts: [
      {
        path: "release/mdc_tool_ready_to_upload_v1.6_protected.zip",
        sha256: "3eab2c0f767e92fdda1a9a67790a9ec758fa9c332d68e502e235462ed2a6c4c4",
        purpose: "Protected historical v1.6 client package"
      }
    ]
  });
});

test("v1.7 client READMEs document static deployment paths and data ownership", async () => {
  const selectorReadme = await readFile(path.join(repoRoot, "README_selector_for_client.txt"), "utf8");
  const ldmReadme = await readFile(path.join(repoRoot, "README_lista_materiais_for_client.txt"), "utf8");

  assert.match(selectorReadme, /v1\.7/);
  assert.match(selectorReadme, /\/selector\//);
  assert.match(selectorReadme, /static web application/i);
  assert.match(selectorReadme, /no backend/i);
  assert.match(selectorReadme, /Node\/npm/i);
  assert.match(selectorReadme, /selector_phc_registry\.csv/);
  assert.match(selectorReadme, /canonical identity/i);
  assert.match(selectorReadme, /not.*casual/i);
  assert.match(selectorReadme, /physical PHC[\s\S]*regenerated/i);
  assert.match(ldmReadme, /v1\.7/);
  assert.match(ldmReadme, /\/lista_materiais\//);
  assert.match(ldmReadme, /materials\/materials_matrix\.csv/);
  assert.match(ldmReadme, /components\/components\.csv/);
  assert.match(ldmReadme, /phc_integration\.csv/);
  assert.match(ldmReadme, /not.*client-fill|not.*casually/i);
  assert.match(ldmReadme, /not yet wired/i);
});

test("packager reserves v1.7 filenames for the later ZIP delivery command", async (testContext) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "rp12-v17-packager-"));
  testContext.after(() => rm(workspace, { recursive: true, force: true }));

  await cp(path.join(repoRoot, "scripts/prepare-client-release.mjs"), path.join(workspace, "scripts/prepare-client-release.mjs"));
  await writeFixtureFile(workspace, "release-version.json", '{"version":"v1.7"}\n');
  await writeFixtureFile(workspace, "README_selector_for_client.txt", "selector\n");
  await writeFixtureFile(workspace, "README_lista_materiais_for_client.txt", "ldm\n");
  await writeFixtureFile(workspace, "phc_integration.csv", "reference\n");
  await writeFixtureFile(workspace, "public/styleguide.json", "{}\n");
  await writeFixtureFile(workspace, "public/fonts/font.woff2", "font");
  await writeFixtureFile(workspace, "public/questions/model.csv", "option\nCP10\n");
  await writeFixtureFile(
    workspace,
    "public/selector_phc_registry.csv",
    "referencia_phc,composition_key\n534.iS200000000001,key\n"
  );
  await writeFixtureFile(workspace, "public/materials/materials_matrix.csv", "material_phc,description,ALWAYS\n");
  await writeFixtureFile(workspace, "public/components/components.csv", "component_code,component_phc\n");

  for (const app of ["selector", "lista_materiais"]) {
    await writeFixtureFile(workspace, `dist/${app}/index.html`, `<title>${app}</title>`);
    await writeFixtureFile(workspace, `dist/${app}/assets/app.js`, "asset");
    await writeFixtureFile(workspace, `dist/${app}/favicon.png`, "favicon");
    await writeFixtureFile(workspace, `dist/${app}/favicon-32x32.png`, "favicon");
    await writeFixtureFile(workspace, `dist/${app}/apple-touch-icon.png`, "apple");
  }

  const releaseRoot = path.join(workspace, "release");
  await execFileAsync(process.execPath, ["scripts/prepare-client-release.mjs", "--release-root", releaseRoot], { cwd: workspace });
  assert.deepEqual((await readdir(workspace)).filter((name) => name.endsWith(".zip")), []);
  assert.equal(
    await readFile(path.join(releaseRoot, "selector", "selector_phc_registry.csv"), "utf8"),
    "referencia_phc,composition_key\n534.iS200000000001,key\n"
  );
  await assert.rejects(
    readFile(path.join(releaseRoot, "lista_materiais", "selector_phc_registry.csv"), "utf8"),
    { code: "ENOENT" }
  );

  await execFileAsync(process.execPath, ["scripts/prepare-client-release.mjs", "--release-root", releaseRoot, "--zip"], { cwd: workspace });
  assert.deepEqual((await readdir(workspace)).filter((name) => name.endsWith(".zip")).sort(), [
    "lista_materiais_ready_to_upload.zip",
    "lista_materiais_ready_to_upload_v1.7.zip",
    "selector_ready_to_upload.zip",
    "selector_ready_to_upload_v1.7.zip"
  ]);
});

test("generated client-input handoff snapshots canonical CSVs and reports actionable gaps", async (testContext) => {
  const workspace = await copyHandoffWorkspace();
  testContext.after(() => rm(workspace, { recursive: true, force: true }));

  await execFileAsync(process.execPath, ["scripts/prepare-client-input.mjs"], { cwd: workspace });

  const handoffRoot = path.join(workspace, "client-input", "v1.7");
  assert.deepEqual(await readdir(handoffRoot), [
    "README_CLIENT_INPUT.txt",
    "client_data_gaps.csv",
    "components_to_complete.csv",
    "materials_matrix_to_complete.csv"
  ]);
  assert.equal(
    await readFile(path.join(handoffRoot, "components_to_complete.csv"), "utf8"),
    await readFile(path.join(workspace, "public/components/components.csv"), "utf8")
  );
  assert.equal(
    await readFile(path.join(handoffRoot, "materials_matrix_to_complete.csv"), "utf8"),
    await readFile(path.join(workspace, "public/materials/materials_matrix.csv"), "utf8")
  );
  assert.equal(
    await readFile(path.join(handoffRoot, "client_data_gaps.csv"), "utf8"),
    [
      "data_type,status,component_code,material_identifier,description,detail",
      "component,missing_component_phc,CP10,,,component_phc is blank",
      "material,missing_material_phc,,matrix-row-2,Unreferenced material,material_phc is blank",
      "mapping,no_positive_material_mapping,AF,,,Review/confirm: no positive material quantity is currently mapped; confirm whether this is intentional or provide the missing material mapping/quantity.",
      ""
    ].join("\n")
  );

  const readme = await readFile(path.join(handoffRoot, "README_CLIENT_INPUT.txt"), "utf8");
  assert.match(readme, /CLIENT DATA COMPLETION/);
  assert.match(readme, /public\//);
  assert.match(readme, /return the completed\s+CSVs to us/i);
  assert.match(readme, /diagnostic guide only/i);
  assert.match(readme, /phc_integration\.csv.*not part of this handoff/is);
  assert.match(readme, /no_positive_material_mapping[\s\S]*REVIEW \/ CONFIRM ONLY/i);
  assert.match(readme, /may be intentional/i);
});

test("generated client-input handoffs are ignored rather than a second source of truth", async () => {
  const gitignore = await readFile(path.join(repoRoot, ".gitignore"), "utf8");

  assert.match(gitignore, /^\/client-input\/$/m);
});
