// Writes the web app manifest of every standalone app (common/apps/standalone/apps.ts) to
// public/apps/<id>.webmanifest (gitignored), before `next dev` and `next build` (npm predev and prebuild).
// Manifests from an earlier run are deleted first, so a removed app ships none.
import { readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { manifestUrl, standaloneApps } from "../common/apps/standalone/apps";
import { webManifest } from "../common/apps/standalone/manifest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appsDir = path.join(root, "public", "apps");

for (const f of readdirSync(appsDir)) if (f.endsWith(".webmanifest")) rmSync(path.join(appsDir, f));
for (const app of standaloneApps) {
  writeFileSync(path.join(root, "public", manifestUrl(app)), `${JSON.stringify(webManifest(app), null, 2)}\n`);
}
console.log(`build-app-manifests: ${standaloneApps.length} manifests`);
