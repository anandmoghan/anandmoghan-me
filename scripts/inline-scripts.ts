import { createHash } from "node:crypto";

// The Content-Security-Policy in firebase.json allows scripts from 'self' only, so no page may carry an
// inline script. Next's static export still inlines the page data (self.__next_f.push(...)); after the
// build, each run of adjacent inline scripts becomes one content-addressed file under INLINE_DIR, loaded
// by a plain <script src> in the same place, so it runs at the same point of the parse as before.

export const INLINE_DIR = "/_next/static/chunks/inline";

const SCRIPT = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g;
const RUN_GAP = /^\s*$/;
const DATA_BLOCK = /^\s+type="application\/ld\+json"$/;

export interface Externalized {
  html: string;
  /** File path under INLINE_DIR (e.g. "/_next/static/chunks/inline/ab12.js") to its source. */
  files: Map<string, string>;
}

/**
 * Moves every inline script of a page into external files. JSON-LD data blocks stay inline (the browser
 * never runs them, so CSP does not apply). Any other inline script with attributes is an error: it would
 * be blocked at runtime, so it should be moved to a file at the source.
 */
export function externalizeInlineScripts(html: string): Externalized {
  const files = new Map<string, string>();
  const parts: string[] = [];
  let run: string[] = [];
  // Whitespace between merged scripts, kept after the merged tag so the markup around it is unchanged.
  let gaps = "";
  let cursor = 0;

  const flush = () => {
    if (!run.length) return;
    const source = run.join("\n;\n");
    const name = `${INLINE_DIR}/${createHash("sha256").update(source).digest("hex").slice(0, 20)}.js`;
    files.set(name, source);
    parts.push(`<script src="${name}"></script>`, gaps);
    run = [];
    gaps = "";
  };

  for (const m of html.matchAll(SCRIPT)) {
    const [whole, attrs = "", body] = m;
    const start = m.index;
    const inline = !/\ssrc=/.test(attrs) && body.trim() !== "";
    const executable = inline && !DATA_BLOCK.test(attrs);
    if (executable && attrs !== "") {
      throw new Error(`Inline script with attributes ${attrs.trim()}: move it to a file`);
    }
    const between = html.slice(cursor, start);
    if (executable && run.length && RUN_GAP.test(between)) {
      gaps += between;
      run.push(body);
      cursor = start + whole.length;
      continue;
    }
    flush();
    parts.push(between);
    if (executable) {
      run.push(body);
    } else {
      parts.push(whole);
    }
    cursor = start + whole.length;
  }
  flush();
  parts.push(html.slice(cursor));
  return { html: parts.join(""), files };
}
