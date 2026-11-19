// Runs after `next build` (npm "postbuild", after externalize-inline-scripts): writes the service worker of
// every standalone app to out/apps/<id>-sw.js from the one template, common/apps/standalone/sw.js, stamped
// with the app, the build id and the files to save at install (scripts/app-precache.ts).
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");

async function main() {
  loadEnvConfig(root);
  const { serviceWorkerUrl, standaloneApps } = await import("../common/apps/standalone/apps");
  const { precacheList, stampWorker } = await import("./app-precache");
  const template = readFileSync(path.join(root, "common", "apps", "standalone", "sw.js"), "utf8");
  const buildId = readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();

  for (const app of standaloneApps) {
    const precache = precacheList(out, app, standaloneApps);
    const sw = stampWorker(template, {
      app: `const APP = ${JSON.stringify({ id: app.id, scope: app.scope })};`,
      build: `const BUILD = ${JSON.stringify(buildId)};`,
      precache: `const PRECACHE = ${JSON.stringify(precache)};`,
    });
    writeFileSync(path.join(out, serviceWorkerUrl(app)), sw);
    console.log(`${serviceWorkerUrl(app)}: ${precache.length} files`);
  }
}

main();
