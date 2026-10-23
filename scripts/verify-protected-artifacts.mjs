import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, "..");
const manifestPath = path.join(rootDirectory, "release/protected-artifacts.json");

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

async function verifyArtifact(artifact) {
  const artifactPath = String(artifact.path ?? "");
  const expectedSha = String(artifact.sha256 ?? "");

  if (!artifactPath || !expectedSha) {
    throw new Error("Invalid protected artifact manifest entry.");
  }

  let contents;
  try {
    contents = await fs.readFile(path.join(rootDirectory, artifactPath));
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(`Missing protected artifact: ${artifactPath}`);
    }
    throw error;
  }

  const actualSha = sha256(contents);
  if (actualSha !== expectedSha) {
    throw new Error(
      `Checksum mismatch for ${artifactPath}: expected ${expectedSha}, received ${actualSha}.`
    );
  }
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (!Array.isArray(manifest.artifacts)) {
    throw new Error("Invalid protected artifact manifest: artifacts must be an array.");
  }

  await Promise.all(manifest.artifacts.map(verifyArtifact));
  const noun = manifest.artifacts.length === 1 ? "artifact" : "artifacts";
  console.log(`Verified ${manifest.artifacts.length} protected ${noun}.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
