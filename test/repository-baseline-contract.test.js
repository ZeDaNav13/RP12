import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const protectedArtifactPath = "release/mdc_tool_ready_to_upload_v1.6_protected.zip";
const protectedArtifactSha = "3eab2c0f767e92fdda1a9a67790a9ec758fa9c332d68e502e235462ed2a6c4c4";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writeFixtureFile(root, relativePath, contents) {
  const targetPath = path.join(root, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents);
}

test("repository baseline tracks source contracts without requiring generated releases", async () => {
  const [gitignore, packageJsonText, releaseTest, agents, ci, manifestText] = await Promise.all([
    readFile(path.join(repoRoot, ".gitignore"), "utf8"),
    readFile(path.join(repoRoot, "package.json"), "utf8"),
    readFile(path.join(repoRoot, "test/release-v1.7-handoff-contract.test.js"), "utf8"),
    readFile(path.join(repoRoot, "AGENTS.md"), "utf8"),
    readFile(path.join(repoRoot, ".github/workflows/ci.yml"), "utf8"),
    readFile(path.join(repoRoot, "release/protected-artifacts.json"), "utf8")
  ]);
  const packageJson = JSON.parse(packageJsonText);
  const manifest = JSON.parse(manifestText);

  for (const rule of [
    "/release/selector/",
    "/release/lista_materiais/",
    "/selector_ready_to_upload*.zip",
    "/lista_materiais_ready_to_upload*.zip"
  ]) {
    assert.match(gitignore, new RegExp(`^${escapeRegExp(rule)}$`, "m"));
  }

  assert.deepEqual(manifest, {
    artifacts: [
      {
        path: protectedArtifactPath,
        sha256: protectedArtifactSha,
        purpose: "Protected historical v1.6 client package"
      }
    ]
  });
  assert.match(releaseTest, /protected-artifacts\.json/);
  assert.doesNotMatch(
    releaseTest,
    /access\(path\.join\(repoRoot, "release\/mdc_tool_ready_to_upload_v1\.6_protected\.zip"\)\)/
  );
  assert.equal(packageJson.scripts["verify:protected-artifacts"], "node scripts/verify-protected-artifacts.mjs");

  assert.match(agents, /all_reply_combinations_filtered\.csv/);
  assert.match(agents, /phc_integration\.csv/);
  assert.match(agents, /do not develop directly in `?main`?/i);
  assert.match(agents, /verify:protected-artifacts/);
  assert.match(agents, /release regeneration.*explicit/i);

  for (const command of ["npm ci", "npm test", "npm run build:selector", "npm run build:ldm"]) {
    assert.match(ci, new RegExp(escapeRegExp(command)));
  }
  assert.doesNotMatch(ci, /release:prepare|release:client|protected.*zip.*copy/i);
});

test("protected-artifact verifier validates correct, missing, and mismatched fixture files", async (testContext) => {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "rp12-protected-artifact-"));
  testContext.after(() => rm(workspace, { recursive: true, force: true }));

  await cp(
    path.join(repoRoot, "scripts/verify-protected-artifacts.mjs"),
    path.join(workspace, "scripts/verify-protected-artifacts.mjs")
  );

  const fixturePath = "release/protected-fixture.zip";
  const fixtureBytes = "fixture bytes";
  await writeFixtureFile(
    workspace,
    "release/protected-artifacts.json",
    `${JSON.stringify({
      artifacts: [{ path: fixturePath, sha256: sha256(fixtureBytes), purpose: "fixture" }]
    })}\n`
  );
  await writeFixtureFile(workspace, fixturePath, fixtureBytes);

  const verifier = path.join(workspace, "scripts/verify-protected-artifacts.mjs");
  const success = await execFileAsync(process.execPath, [verifier], { cwd: workspace });
  assert.match(success.stdout, /Verified 1 protected artifact/);

  await rm(path.join(workspace, fixturePath));
  await assert.rejects(
    execFileAsync(process.execPath, [verifier], { cwd: workspace }),
    /Missing protected artifact: release\/protected-fixture\.zip/
  );

  await writeFixtureFile(workspace, fixturePath, "different bytes");
  await assert.rejects(
    execFileAsync(process.execPath, [verifier], { cwd: workspace }),
    /Checksum mismatch for release\/protected-fixture\.zip/
  );
});
