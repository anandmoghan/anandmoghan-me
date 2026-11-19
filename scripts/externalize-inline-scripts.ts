// Runs after `next build` (npm "postbuild", before stamp-app-sw): moves the inline scripts of every exported
// page into files (scripts/inline-scripts.ts), so the CSP in firebase.json can forbid inline scripts.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INLINE_DIR, externalizeInlineScripts } from "./inline-scripts";

const out = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), "out");
mkdirSync(path.join(out, INLINE_DIR), { recursive: true });

const pages = readdirSync(out, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".html"));
const written = new Set<string>();
for (const page of pages) {
  const file = path.join(out, page);
  const { html, files } = externalizeInlineScripts(readFileSync(file, "utf8"));
  for (const [name, source] of files) {
    if (written.has(name)) continue;
    writeFileSync(path.join(out, name), source);
    written.add(name);
  }
  writeFileSync(file, html);
}
console.log(`inline scripts: ${pages.length} pages, ${written.size} files in ${INLINE_DIR}`);
