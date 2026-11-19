import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { iconBase, inScope, manifestUrl, type StandaloneApp } from "../common/apps/standalone/apps";
import { INLINE_DIR } from "./inline-scripts";

// What each standalone app's service worker saves at install, taken from the static export in out/.

const FILE = String.raw`static\/(?:chunks|css|media)\/[\w./~%-]+\.(?:js|css|woff2)`;
const STATIC_FILE = new RegExp(String.raw`\/_next\/(${FILE})|(?<![/\w])(${FILE})`, "g");

/** The build's /_next/static files a page's HTML refers to: src and href attributes, and the chunk paths in the
 * inlined page data (written there without the /_next/ prefix). A path the HTML cuts in two is not a file name
 * and is skipped, because only names ending in a file extension match. */
export function staticFilesIn(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(STATIC_FILE)) found.add(`/_next/${m[1] ?? m[2]}`);
  return [...found];
}

/** Public files the installed app needs besides its pages: the head script, its manifest and icons. */
export const appFiles = (app: StandaloneApp): string[] => {
  const icons = iconBase(app);
  return ["/site-init.js", manifestUrl(app), `${icons}.svg`, `${icons}-180.png`, `${icons}-192.png`, `${icons}-512.png`, `${icons}-maskable-512.png`];
};

/** The URL paths of the files in out/ that belong to `app`: in its scope and not in a narrower app's scope
 * (Family leaves Nila's files to Nila). Pages come back without .html, as the site serves them. */
export function scopeFiles(out: string, app: StandaloneApp, apps: StandaloneApp[], ext: ".html" | ".txt"): string[] {
  const nested = apps.filter((a) => a.scope !== app.scope && inScope(a.scope, app.scope)).map((a) => a.scope);
  const found: string[] = [];
  const page = path.join(out, `${app.scope}${ext}`);
  if (existsSync(page)) found.push(`${app.scope}${ext}`);
  const dir = path.join(out, app.scope);
  if (existsSync(dir)) {
    for (const f of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
      if (f.endsWith(ext)) found.push(`${app.scope}/${f.split(path.sep).join("/")}`);
    }
  }
  return found
    .filter((url) => !nested.some((scope) => inScope(url.slice(0, -ext.length), scope)))
    .map((url) => (ext === ".html" ? url.slice(0, -ext.length) : url));
}

/** Everything the worker of `app` saves at install, sorted; throws when a listed file is missing from out/. */
export function precacheList(out: string, app: StandaloneApp, apps: StandaloneApp[]): string[] {
  const pages = scopeFiles(out, app, apps, ".html");
  if (!pages.includes(app.scope)) throw new Error(`${app.id}: no start page ${app.scope} in the build`);
  const data = scopeFiles(out, app, apps, ".txt");
  const statics = new Set<string>();
  for (const page of pages) {
    const html = readFileSync(path.join(out, `${page}.html`), "utf8");
    for (const f of staticFilesIn(html)) {
      statics.add(f);
      // The page data moved out of the HTML (scripts/externalize-inline-scripts.ts) names chunks too.
      if (f.startsWith(`${INLINE_DIR}/`)) for (const g of staticFilesIn(readFileSync(path.join(out, f), "utf8"))) statics.add(g);
    }
    // The shared design system the layouts link from public/global (not part of _next/static).
    for (const m of html.matchAll(/href="(\/global\/[^"?#]+\.css)"/g)) statics.add(m[1]);
  }
  // The chunks the page data Next fetches for in-app navigation names, so moving between screens works offline.
  for (const url of data) for (const f of staticFilesIn(readFileSync(path.join(out, url), "utf8"))) statics.add(f);
  // Every stylesheet of the build (a few small files), so no screen is ever unstyled offline.
  const chunks = path.join(out, "_next", "static", "chunks");
  for (const f of readdirSync(chunks)) if (f.endsWith(".css")) statics.add(`/_next/static/chunks/${f}`);
  const list = [...new Set([...pages, ...appFiles(app), ...data, ...statics])].sort();
  for (const url of list) {
    if (!existsSync(path.join(out, pages.includes(url) ? `${url}.html` : url))) throw new Error(`${app.id}: not in out/: ${url}`);
  }
  return list;
}

/** The worker template (common/apps/standalone/sw.js) with its three `// stamp:<marker>` lines replaced. */
export function stampWorker(template: string, values: Record<"app" | "build" | "precache", string>): string {
  let sw = template;
  for (const [marker, line] of Object.entries(values)) {
    const re = new RegExp(`^.*// stamp:${marker}$`, "m");
    if (!re.test(sw)) throw new Error(`sw.js has no stamp:${marker} line`);
    sw = sw.replace(re, line);
  }
  return sw;
}
