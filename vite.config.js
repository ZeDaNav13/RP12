import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
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

export default defineConfig(({ mode }) => {
  const app = apps[mode];
  if (!app) {
    throw new Error(`Unsupported RP12 app mode: ${mode}. Use selector or ldm.`);
  }

  const appRoot = path.resolve(repoRoot, app.root);

  return {
    plugins: [react()],
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
