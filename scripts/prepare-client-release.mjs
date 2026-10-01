import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const versionFile = path.join(rootDir, "release-version.json");

const apps = {
  selector: {
    distDirectory: "selector",
    releaseDirectory: "selector",
    clientReadme: "README_selector_for_client.txt",
    runtimeEntries: [
      { source: "public/fonts", target: "fonts", type: "directory" },
      { source: "public/styleguide.json", target: "styleguide.json", type: "file" },
      { source: "public/questions", target: "questions", type: "directory" }
    ]
  },
  ldm: {
    distDirectory: "lista_materiais",
    releaseDirectory: "lista_materiais",
    clientReadme: "README_lista_materiais_for_client.txt",
    runtimeEntries: [
      { source: "public/fonts", target: "fonts", type: "directory" },
      { source: "public/styleguide.json", target: "styleguide.json", type: "file" },
      {
        source: "public/materials/materials_matrix.csv",
        target: "materials/materials_matrix.csv",
        type: "file"
      },
      { source: "phc_integration.csv", target: "phc_integration.csv", type: "file" }
    ]
  }
};

const compiledEntries = [
  { source: "index.html", target: "index.html", type: "file" },
  { source: "assets", target: "assets", type: "directory" },
  { source: "favicon.png", target: "favicon.png", type: "file" },
  { source: "favicon-32x32.png", target: "favicon-32x32.png", type: "file" },
  { source: "apple-touch-icon.png", target: "apple-touch-icon.png", type: "file" }
];

function parseArguments(argumentsList) {
  const options = { appName: null, createZip: false, releaseRoot: path.join(rootDir, "release") };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === "--zip") {
      options.createZip = true;
      continue;
    }

    if (argument === "--app" || argument === "--release-root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${argument}.`);
      }

      if (argument === "--app") {
        options.appName = value;
      } else {
        options.releaseRoot = path.resolve(value);
      }
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (options.appName && !apps[options.appName]) {
    throw new Error("Invalid --app value. Expected selector or ldm.");
  }

  return options;
}

async function assertPathExists(targetPath, message) {
  try {
    await fs.access(targetPath);
  } catch {
    throw new Error(message);
  }
}

async function copyEntry(sourceRoot, destinationRoot, entry) {
  const sourcePath = path.join(sourceRoot, entry.source);
  const targetPath = path.join(destinationRoot, entry.target);

  await assertPathExists(sourcePath, `Missing required release file: ${sourcePath}`);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  if (entry.type === "directory") {
    await fs.cp(sourcePath, targetPath, { recursive: true });
  } else {
    await fs.copyFile(sourcePath, targetPath);
  }
}

async function preparePackage(appName, releaseRoot) {
  const app = apps[appName];
  const distRoot = path.join(rootDir, "dist", app.distDirectory);
  const packageRoot = path.join(releaseRoot, app.releaseDirectory);

  await assertPathExists(
    distRoot,
    `Missing dist/${app.distDirectory}/. Run npm run build:${appName} or npm run build first.`
  );

  await fs.rm(packageRoot, { recursive: true, force: true });
  await fs.mkdir(packageRoot, { recursive: true });

  for (const entry of compiledEntries) {
    await copyEntry(distRoot, packageRoot, entry);
  }

  for (const entry of app.runtimeEntries) {
    await copyEntry(rootDir, packageRoot, entry);
  }

  await copyEntry(rootDir, packageRoot, {
    source: app.clientReadme,
    target: app.clientReadme,
    type: "file"
  });
}

async function getVersion() {
  const contents = await fs.readFile(versionFile, "utf8");
  const config = JSON.parse(contents);
  const version = String(config.version ?? "").trim();

  if (!/^v\d+(?:\.\d+)*$/.test(version)) {
    throw new Error("Invalid version in release-version.json. Expected format like v1.5.");
  }

  return version;
}

async function createZip(appName, releaseRoot, version) {
  const app = apps[appName];
  const genericZip = path.join(rootDir, `${app.releaseDirectory}_ready_to_upload.zip`);
  const versionedZip = path.join(rootDir, `${app.releaseDirectory}_ready_to_upload_${version}.zip`);

  try {
    await execFileAsync(
      "zip",
      ["-r", "-q", "-FS", genericZip, app.releaseDirectory],
      { cwd: releaseRoot }
    );
    await fs.copyFile(genericZip, versionedZip);
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error("The zip command is not available on this machine.");
    }
    throw error;
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const appNames = options.appName ? [options.appName] : Object.keys(apps);

  for (const appName of appNames) {
    await preparePackage(appName, options.releaseRoot);
  }

  if (options.createZip) {
    const version = await getVersion();
    for (const appName of appNames) {
      await createZip(appName, options.releaseRoot, version);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
