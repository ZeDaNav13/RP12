import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const canonicalPhcCsvPath = path.join(repoRoot, "phc_integration.csv");

test("LDM dev server serves the canonical PHC registry at its runtime URL", async (context) => {
  const server = await createServer({
    configFile: path.join(repoRoot, "vite.config.js"),
    mode: "ldm",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: true
    }
  });
  await server.listen();
  context.after(() => server.close());

  const address = server.httpServer.address();
  assert.ok(address && typeof address !== "string");

  const response = await fetch(`http://127.0.0.1:${address.port}/lista_materiais/phc_integration.csv`);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /^referencia_phc,assembly_code,total_price\r?$/m);
  assert.equal(body, await readFile(canonicalPhcCsvPath, "utf8"));
});
