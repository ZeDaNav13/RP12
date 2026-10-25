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

async function writeFixtureFile(root, relativePath, contents = relativePath) {
  const targetPath = path.join(root, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents);
}

async function listFiles(root, relativePath = "") {
  const directoryPath = path.join(root, relativePath);
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const paths = [];

  for (const entry of entries) {
    const childPath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) {
      paths.push(...(await listFiles(root, childPath)));
    } else {
      paths.push(childPath);
    }
  }

  return paths.sort();
}

async function createPackagerWorkspace() {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "rp12-two-app-release-"));
  const sourcePackager = path.join(repoRoot, "scripts/prepare-client-release.mjs");

  await cp(sourcePackager, path.join(workspace, "scripts/prepare-client-release.mjs"));
  await writeFixtureFile(workspace, "release-version.json", '{"version":"v9.9"}\n');
  await writeFixtureFile(workspace, "README_for_client.txt", "legacy client instructions\n");
  await writeFixtureFile(workspace, "README_selector_for_client.txt", "selector instructions\n");
  await writeFixtureFile(workspace, "README_lista_materiais_for_client.txt", "ldm instructions\n");
  await writeFixtureFile(workspace, "phc_integration.csv", "reference\n");
  await writeFixtureFile(workspace, "all_reply_combinations_filtered.csv", "combination\n");
  await writeFixtureFile(workspace, "public/styleguide.json", "{}\n");
  await writeFixtureFile(workspace, "public/questions/model.csv", "option\nCP10\n");
  await writeFixtureFile(
    workspace,
    "public/selector_phc_registry.csv",
    "referencia_phc,composition_key\n534.iS200000000001,key\n"
  );
  await writeFixtureFile(workspace, "public/fonts/font.woff2", "font");
  await writeFixtureFile(workspace, "public/materials/materials_matrix.csv", "material_phc\n");
  await writeFixtureFile(workspace, "public/components/components.csv", "component_code,component_phc\n");

  for (const app of ["selector", "lista_materiais"]) {
    await writeFixtureFile(workspace, `dist/${app}/index.html`, `<title>${app}</title>`);
    await writeFixtureFile(workspace, `dist/${app}/assets/app.js`, "asset");
    await writeFixtureFile(workspace, `dist/${app}/favicon.png`, "favicon");
    await writeFixtureFile(workspace, `dist/${app}/favicon-32x32.png`, "favicon");
    await writeFixtureFile(workspace, `dist/${app}/apple-touch-icon.png`, "apple");
    await writeFixtureFile(workspace, `dist/${app}/questions/unwanted.csv`, "question");
    await writeFixtureFile(workspace, `dist/${app}/materials/unwanted.csv`, "material");
    await writeFixtureFile(workspace, `dist/${app}/phc_integration.csv`, "phc");
    await writeFixtureFile(workspace, `dist/${app}/all_reply_combinations_filtered.csv`, "combination");
  }

  return workspace;
}

test("release scripts build both apps without the removed build:client command", async () => {
  const packageJson = JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));

  for (const scriptName of ["release:prepare", "release:client"]) {
    const script = packageJson.scripts[scriptName];
    assert.match(script, /npm run build/);
    assert.doesNotMatch(script, /build:client/);
  }
});

test("packager creates isolated package manifests and delivery ZIPs", async (testContext) => {
  const workspace = await createPackagerWorkspace();
  const releaseRoot = path.join(workspace, "disposable-release");
  const selectorOnlyReleaseRoot = path.join(workspace, "selector-only-release");
  testContext.after(() => rm(workspace, { recursive: true, force: true }));

  await execFileAsync(
    process.execPath,
    ["scripts/prepare-client-release.mjs", "--app", "selector", "--release-root", selectorOnlyReleaseRoot],
    { cwd: workspace }
  );
  assert.deepEqual(await readdir(selectorOnlyReleaseRoot), ["selector"]);

  await execFileAsync(
    process.execPath,
    ["scripts/prepare-client-release.mjs", "--release-root", releaseRoot, "--zip"],
    { cwd: workspace }
  );

  const selectorFiles = await listFiles(releaseRoot, "selector");
  const ldmFiles = await listFiles(releaseRoot, "lista_materiais");

  assert.deepEqual(selectorFiles, [
    "selector/README_selector_for_client.txt",
    "selector/apple-touch-icon.png",
    "selector/assets/app.js",
    "selector/favicon-32x32.png",
    "selector/favicon.png",
    "selector/fonts/font.woff2",
    "selector/index.html",
    "selector/questions/model.csv",
    "selector/selector_phc_registry.csv",
    "selector/styleguide.json"
  ]);
  assert.deepEqual(ldmFiles, [
    "lista_materiais/README_lista_materiais_for_client.txt",
    "lista_materiais/apple-touch-icon.png",
    "lista_materiais/assets/app.js",
    "lista_materiais/components/components.csv",
    "lista_materiais/favicon-32x32.png",
    "lista_materiais/favicon.png",
    "lista_materiais/fonts/font.woff2",
    "lista_materiais/index.html",
    "lista_materiais/materials/materials_matrix.csv",
    "lista_materiais/phc_integration.csv",
    "lista_materiais/styleguide.json"
  ]);

  for (const zipName of [
    "selector_ready_to_upload.zip",
    "selector_ready_to_upload_v9.9.zip",
    "lista_materiais_ready_to_upload.zip",
    "lista_materiais_ready_to_upload_v9.9.zip"
  ]) {
    const { stdout } = await execFileAsync("unzip", ["-Z1", path.join(workspace, zipName)]);
    const zipEntries = stdout.trim().split("\n").filter(Boolean);
    assert.ok(zipEntries.some((entry) => entry.endsWith("index.html")), zipName);
    assert.ok(!zipEntries.some((entry) => entry.includes("all_reply_combinations_filtered.csv")), zipName);

    if (zipName.startsWith("selector_")) {
      assert.ok(zipEntries.includes("selector/selector_phc_registry.csv"), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("components/")), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("materials/")), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("phc_integration.csv")), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("README_lista_materiais")), zipName);
    } else {
      assert.ok(zipEntries.includes("lista_materiais/components/components.csv"), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("selector_phc_registry.csv")), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("questions/")), zipName);
      assert.ok(!zipEntries.some((entry) => entry.includes("README_selector")), zipName);
    }
  }
});
