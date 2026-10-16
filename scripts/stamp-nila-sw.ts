// Runs after `next build` (npm "postbuild"): copies the Nila service worker into out/ with the build id and the
// list of files to save at install, taken from the pages the build produced.
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NILA_BASE, NILA_FILES, nilaPages, staticFilesIn } from "./nila-precache";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "out");
const buildId = readFileSync(path.join(root, ".next", "BUILD_ID"), "utf8").trim();

const pages = nilaPages();
const statics = new Set<string>();
for (const page of pages) {
  const file = path.join(out, `${page}.html`);
  if (!existsSync(file)) throw new Error(`Nila page missing from the build: ${page}`);
  const html = readFileSync(file, "utf8");
  for (const f of staticFilesIn(html)) statics.add(f);
  // The shared design system the layout links from public/global (not part of _next/static).
  for (const m of html.matchAll(/href="(\/global\/[^"?#]+\.css)"/g)) statics.add(m[1]);
}
// The page data Next fetches for in-app navigation (the .txt files beside each page), so moving between
// tabs works offline, and the chunks that data names.
const data = readdirSync(path.join(out, NILA_BASE), { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".txt"))
  .map((f) => `${NILA_BASE}/${f.split(path.sep).join("/")}`);
for (const url of data) for (const f of staticFilesIn(readFileSync(path.join(out, url), "utf8"))) statics.add(f);
// Every stylesheet of the build (a few small files), so no screen is ever unstyled offline.
const chunks = path.join(out, "_next", "static", "chunks");
for (const f of readdirSync(chunks)) if (f.endsWith(".css")) statics.add(`/_next/static/chunks/${f}`);
const precache = [...pages, ...NILA_FILES, ...data, ...statics].sort();
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
console.log(`nila-sw.js: build ${buildId}, ${pages.length} pages, ${data.length} page data files, ${statics.size} static files`);
