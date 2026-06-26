import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const releaseRootDir = path.join(rootDir, "release");
const releaseDir = path.join(releaseRootDir, "mdc_tool");
const zipFile = path.join(rootDir, "mdc_tool_ready_to_upload.zip");

const filesToCopy = [
  "README_for_client.txt",
  "phc_integration.csv",
  "all_reply_combinations_filtered.csv"
];

const directoriesToCopy = [
  { source: "public/questions", target: "questions" },
  { source: "public/fonts", target: "fonts" }
];

const standaloneFilesToCopy = [
  { source: "public/styleguide.json", target: "styleguide.json" }
];

async function assertPathExists(targetPath, message) {
  try {
    await fs.access(targetPath);
  } catch {
    throw new Error(message);
  }
}

async function main() {
  await assertPathExists(
    distDir,
    "Missing dist/. Run `npm run build:client` or `npm run release:prepare` after a successful build."
  );

  await fs.rm(releaseDir, { recursive: true, force: true });
  await fs.mkdir(releaseRootDir, { recursive: true });
  await fs.cp(distDir, releaseDir, { recursive: true });

  for (const file of filesToCopy) {
    await fs.copyFile(path.join(rootDir, file), path.join(releaseDir, path.basename(file)));
  }

  for (const entry of standaloneFilesToCopy) {
    await fs.copyFile(path.join(rootDir, entry.source), path.join(releaseDir, entry.target));
  }

  for (const entry of directoriesToCopy) {
    await fs.cp(path.join(rootDir, entry.source), path.join(releaseDir, entry.target), {
      recursive: true
    });
  }

  if (process.argv.includes("--zip")) {
    await createZip();
  }
}

async function createZip() {
  try {
    await execFileAsync(
      "zip",
      ["-r", "-q", "-FS", zipFile, "mdc_tool"],
      { cwd: releaseRootDir }
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("The `zip` command is not available on this machine.");
    }
    throw error;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
