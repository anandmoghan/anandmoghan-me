import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { PARENTING_ROUTE_TABS } from "../../common/apps/family/lib/tabs";
import { NILA_BASE, NILA_FILES, nilaPages, staticFilesIn } from "../../scripts/nila-precache";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("the precached pages are the entry route and every PARENTING_ROUTE_TABS tab", () => {
  const pages = nilaPages();
  assert.equal(pages[0], NILA_BASE);
  assert.deepEqual(pages.slice(1), PARENTING_ROUTE_TABS.map((tab) => `${NILA_BASE}/${tab}`));
});

test("every precached file exists in public/", () => {
  for (const file of NILA_FILES) assert.ok(existsSync(path.join(root, "public", file)), file);
});

test("the manifest is scoped to Nila and starts on a precached page", () => {
  const manifest = JSON.parse(read("public/apps/manifest-nila.json"));
  assert.equal(manifest.scope, NILA_BASE);
  assert.equal(manifest.display, "standalone");
  assert.ok(nilaPages().includes(manifest.start_url));
  for (const icon of manifest.icons) assert.ok(NILA_FILES.includes(icon.src), icon.src);
});

test("the service worker keeps its two stamp lines and its fallback is a precached page", () => {
  const sw = read("public/apps/nila-sw.js");
  assert.equal(sw.match(/\/\/ stamp:build$/gm)?.length, 1);
  assert.equal(sw.match(/\/\/ stamp:precache$/gm)?.length, 1);
  const fallback = /const FALLBACK = "([^"]+)"/.exec(sw)?.[1];
  assert.ok(fallback && nilaPages().includes(fallback));
});

test("staticFilesIn finds attribute URLs and the chunk paths in the page data", () => {
  const html = '<script src="/_next/static/chunks/a-1.js"></script><link href="/_next/static/css/b.css"/>' +
    'self.__next_f.push([1,"[\\"static/chunks/c-2.js\\"]"]) <script src="https://x.test/static/chunks/other.js">';
  assert.deepEqual(staticFilesIn(html).sort(), ["/_next/static/chunks/a-1.js", "/_next/static/chunks/c-2.js", "/_next/static/css/b.css"]);
});
