import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { iconBase, inScope, standaloneAppFor, standaloneApps, type StandaloneApp } from "../../common/apps/standalone/apps";
import { webManifest } from "../../common/apps/standalone/manifest";
import { appFiles, scopeFiles, staticFilesIn, stampWorker } from "../../scripts/app-precache";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("every app under /apps is standalone, each with its own scope", () => {
  assert.deepEqual(
    standaloneApps.map((app) => app.id).sort(),
    ["admin", "expense", "family", "ladder", "materials", "nila", "planner", "share", "time", "wealth"],
  );
  assert.equal(new Set(standaloneApps.map((app) => app.scope)).size, standaloneApps.length);
  for (const app of standaloneApps) assert.match(app.scope, /^\/apps\/[a-z/]+[a-z]$/);
});

test("the narrowest scope wins", () => {
  assert.equal(standaloneAppFor("/apps/family/nila/today")?.id, "nila");
  assert.equal(standaloneAppFor("/apps/family/nila")?.id, "nila");
  assert.equal(standaloneAppFor("/apps/family/health")?.id, "family");
  assert.equal(standaloneAppFor("/apps/timeline"), undefined);
  assert.equal(standaloneAppFor("/apps"), undefined);
});

test("each layout links its app's metadata and viewport", () => {
  for (const app of standaloneApps) {
    const layout = read(`app${app.scope}/layout.tsx`);
    assert.match(layout, new RegExp(`standaloneMetadata\\(["']${app.id}["']\\)`), app.id);
    assert.match(layout, new RegExp(`standaloneViewport\\(["']${app.id}["']\\)`), app.id);
  }
});

test("each manifest is installable: standalone, start_url in scope, 192 and 512 icons plus a maskable one", () => {
  for (const app of standaloneApps) {
    const m = webManifest(app);
    assert.equal(m.display, "standalone");
    assert.equal(m.start_url, app.scope);
    assert.ok(inScope(m.start_url, m.scope));
    assert.match(m.theme_color, /^#[0-9a-f]{6}$/i);
    assert.match(m.background_color, /^#[0-9a-f]{6}$/i);
    const sizes = m.icons.filter((i) => i.type === "image/png").map((i) => `${i.sizes} ${i.purpose}`);
    assert.deepEqual(sizes, ["192x192 any", "512x512 any", "512x512 maskable"]);
  }
});

test("every file the worker saves besides pages is in public/ (icons built by prebuild)", () => {
  for (const app of standaloneApps) {
    for (const file of appFiles(app)) {
      if (file.endsWith(".webmanifest")) continue;
      assert.ok(existsSync(path.join(root, "public", file)), file);
    }
    assert.ok(existsSync(path.join(root, "public", `${iconBase(app)}.svg`)), app.id);
  }
});

test("the worker template has its three stamp lines and stamps them", () => {
  const template = read("common/apps/standalone/sw.js");
  for (const marker of ["app", "build", "precache"]) assert.equal(template.match(new RegExp(`// stamp:${marker}$`, "gm"))?.length, 1);
  const sw = stampWorker(template, { app: "const APP = 1;", build: "const BUILD = 2;", precache: "const PRECACHE = 3;" });
  assert.match(sw, /^const APP = 1;$/m);
  assert.match(sw, /^const BUILD = 2;$/m);
  assert.match(sw, /^const PRECACHE = 3;$/m);
  assert.doesNotMatch(sw, /\/\/ stamp:/);
});

test("scopeFiles leaves a nested app's files to that app", () => {
  const out = mkdtempSync(path.join(tmpdir(), "standalone-"));
  for (const f of ["apps/family.html", "apps/family/health.html", "apps/family/nila.html", "apps/family/nila/today.html", "apps/familyx.html"]) {
    mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
    writeFileSync(path.join(out, f), "");
  }
  const family = standaloneApps.find((a) => a.id === "family") as StandaloneApp;
  const nila = standaloneApps.find((a) => a.id === "nila") as StandaloneApp;
  assert.deepEqual(scopeFiles(out, family, standaloneApps, ".html").sort(), ["/apps/family", "/apps/family/health"]);
  assert.deepEqual(scopeFiles(out, nila, standaloneApps, ".html").sort(), ["/apps/family/nila", "/apps/family/nila/today"]);
});

test("staticFilesIn finds attribute URLs and the chunk paths in the page data", () => {
  const html = '<script src="/_next/static/chunks/a-1.js"></script><link href="/_next/static/css/b.css"/>' +
    'self.__next_f.push([1,"[\\"static/chunks/c-2.js\\"]"]) <script src="https://x.test/static/chunks/other.js">';
  assert.deepEqual(staticFilesIn(html).sort(), ["/_next/static/chunks/a-1.js", "/_next/static/chunks/c-2.js", "/_next/static/css/b.css"]);
});
