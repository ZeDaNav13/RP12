import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const ldmPhcRuntimeUrl = "/lista_materiais/phc_integration.csv";
const canonicalPhcCsvPath = path.resolve(repoRoot, "phc_integration.csv");
const apps = {
  selector: {
    root: "apps/selector",
    base: "/selector/",
    outDir: "dist/selector"
  },
  ldm: {
    root: "apps/lista_materiais",
    base: "/lista_materiais/",
    outDir: "dist/lista_materiais"
  }
};

function serveLdmPhcRegistry() {
  return {
    name: "serve-ldm-phc-registry",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = new URL(request.url ?? "/", "http://localhost");
        if (requestUrl.pathname !== ldmPhcRuntimeUrl) {
          next();
          return;
        }

        try {
          const csv = await readFile(canonicalPhcCsvPath);
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/csv; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(csv);
        } catch (error) {
          next(error);
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const app = apps[mode];
  if (!app) {
    throw new Error(`Unsupported RP12 app mode: ${mode}. Use selector or ldm.`);
  }

  const appRoot = path.resolve(repoRoot, app.root);

  return {
    plugins: [react(), ...(mode === "ldm" ? [serveLdmPhcRegistry()] : [])],
    root: appRoot,
    base: app.base,
    publicDir: path.resolve(repoRoot, "public"),
    server: {
      fs: {
        allow: [repoRoot]
      }
    },
    build: {
      outDir: path.resolve(repoRoot, app.outDir),
      emptyOutDir: true
    }
  };
});
