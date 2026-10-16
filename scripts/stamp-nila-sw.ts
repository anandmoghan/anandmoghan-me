// Runs after `next build` (npm "postbuild"): copies the Nila service worker into out/ with the build id and the
// list of files to save at install, taken from the pages the build produced.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NILA_FILES, nilaPages, staticFilesIn } from "./nila-precache";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const buildId = readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();

const pages = nilaPages();
const statics = new Set<string>();
for (const page of pages) {
  const file = path.join(out, `${page}.html`);
  if (!existsSync(file)) throw new Error(`Nila page missing from the build: ${page}`);
  for (const f of staticFilesIn(readFileSync(file, "utf8"))) statics.add(f);
}
const precache = [...pages, ...NILA_FILES, ...statics].sort();
for (const url of precache) {
  if (!existsSync(path.join(out, url.includes(".") ? url : `${url}.html`))) throw new Error(`Not in out/: ${url}`);
}

let sw = readFileSync(path.join(root, "public", "apps", "nila-sw.js"), "utf8");
const stamp = (marker: string, line: string) => {
  const re = new RegExp(`^.*// stamp:${marker}$`, "m");
  if (!re.test(sw)) throw new Error(`nila-sw.js has no stamp:${marker} line`);
  sw = sw.replace(re, line);
};
stamp("build", `const BUILD = ${JSON.stringify(buildId)};`);
stamp("precache", `const PRECACHE = ${JSON.stringify(precache)};`);
writeFileSync(path.join(out, "apps", "nila-sw.js"), sw);
console.log(`nila-sw.js: build ${buildId}, ${pages.length} pages, ${statics.size} static files`);
