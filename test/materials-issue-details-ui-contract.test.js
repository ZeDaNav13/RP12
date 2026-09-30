import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const materialsToolPath = path.resolve(testDir, "..", "src", "MaterialsTool.jsx");

test("MaterialsTool keeps calculation issues collapsed in expandable details", async () => {
  const source = await fs.readFile(materialsToolPath, "utf8");

  assert.match(
    source,
    /<details className="materialsIssueDetails">[\s\S]*?<summary>Detalhes<\/summary>[\s\S]*?result\.issues\.map/
  );
});
