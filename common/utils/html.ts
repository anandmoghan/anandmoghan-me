// Render hand-written HTML post fragments: includes, KaTeX, code highlighting, heading ids.
// Ported from materials/scripts/build.mjs so both sites accept the same source.
import 'server-only';
import fs from 'fs';
import path from 'path';
import katex from 'katex';
import hljs from 'highlight.js';
import type { PostHeading as Heading } from '../types/post';

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, 'content');

function rel(file: string): string {
  return path.relative(ROOT, file);
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

function slugify(text: string): string {
  const slug = decodeEntities(stripTags(text))
    .replace(/\\[()[\]]|\$/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'section';
}

// ---------------------------------------------------------------- includes

const INCLUDE_RE = /<!--\s*@include\s+(\S+)\s*-->/g;

// Include paths are relative to the repo root and must stay inside content/.
export function resolveIncludes(source: string, file: string, stack: string[] = []): string {
  if (stack.includes(file)) {
    throw new Error(`include cycle: ${[...stack, file].map(rel).join(' -> ')}`);
  }
  return source.replace(INCLUDE_RE, (_match, target: string) => {
    const resolved = path.resolve(ROOT, target);
    if (!resolved.startsWith(CONTENT_DIR + path.sep)) {
      throw new Error(`${rel(file)}: include must point inside content/: ${target}`);
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      throw new Error(`${rel(file)}: include not found: ${target}`);
    }
    const included = fs.readFileSync(resolved, 'utf8');
    return resolveIncludes(included, resolved, [...stack, file]).trim();
  });
}

// ------------------------------------------------------------------- maths

const PROTECTED_RE = /<!--[\s\S]*?-->|<(code|pre|script|style)\b[\s\S]*?<\/\1\s*>/gi;
const ESCAPED_DOLLAR = '\u0000DOLLAR\u0000';

function renderTex(tex: string, displayMode: boolean, file: string): string {
  const source = decodeEntities(tex);
  try {
    return katex.renderToString(source, { displayMode, throwOnError: true, strict: 'error' });
  } catch (err) {
    console.warn(`${rel(file)}: KaTeX: ${(err as Error).message} in "${source.trim().slice(0, 60)}"`);
    return katex.renderToString(source, { displayMode, throwOnError: false, strict: 'ignore' });
  }
}

function renderMathInText(text: string, file: string): string {
  let out = text.replace(/\\\$/g, ESCAPED_DOLLAR);
  // Preferred delimiters: \[ ... \] display, \( ... \) inline. $$ and $ still work.
  out = out.replace(/\\\[([\s\S]+?)\\\]/g, (_m, tex) => renderTex(tex, true, file));
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, tex) => renderTex(tex, false, file));
  out = out.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex) => renderTex(tex, true, file));
  // Inline: opening $ not followed by space, closing $ not preceded by space or followed by digit.
  out = out.replace(/\$(?=\S)([^$\n<>]*?[^$\s\\])\$(?!\d)/g, (_m, tex) =>
    renderTex(tex, false, file)
  );
  return out.split(ESCAPED_DOLLAR).join('$');
}

function renderMath(html: string, file: string): string {
  let result = '';
  let last = 0;
  for (const match of html.matchAll(PROTECTED_RE)) {
    result += renderMathInText(html.slice(last, match.index), file);
    result += match[0];
    last = match.index! + match[0].length;
  }
  return result + renderMathInText(html.slice(last), file);
}

// -------------------------------------------------------------------- code

const CODE_BLOCK_RE = /<pre>\s*<code class="language-([\w+-]+)">([\s\S]*?)<\/code>\s*<\/pre>/g;

// Highlight <pre><code class="language-x"> at build time; blocks without a language stay plain.
function highlightCode(html: string, file: string): string {
  return html.replace(CODE_BLOCK_RE, (whole, lang: string, body: string) => {
    if (!hljs.getLanguage(lang)) {
      console.warn(`${rel(file)}: unknown code language "${lang}"`);
      return whole;
    }
    const highlighted = hljs.highlight(decodeEntities(body), { language: lang }).value;
    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
  });
}

// --------------------------------------------------------------------- ids

// Optional leading <section id="..."> lets an id-less h2 reuse its section's id.
const HEADING_RE =
  /(<section\b[^>]*\sid="([^"]+)"[^>]*>\s*)?<h([23])\b([^>]*)>([\s\S]*?)<\/h\3\s*>/g;

function ensureIds(html: string): string {
  const used = new Set<string>();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) used.add(m[1]);
  return html.replace(HEADING_RE, (whole, lead, sectionId, level, attrs, inner) => {
    if (/\sid="/.test(' ' + attrs)) return whole;
    if (sectionId && level === '2') return whole;
    const base = slugify(inner);
    let id = base;
    for (let n = 2; used.has(id); n += 1) id = `${base}-${n}`;
    used.add(id);
    return `${lead ?? ''}<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
  });
}

function checkDuplicateIds(html: string, file: string): void {
  const seen = new Set<string>();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(m[1])) throw new Error(`${rel(file)}: duplicate id "${m[1]}"`);
    seen.add(m[1]);
  }
}

// Heading text for the table of contents: tags stripped, maths delimiters dropped.
function extractHeadings(html: string): Heading[] {
  const headings: Heading[] = [];
  for (const m of html.matchAll(HEADING_RE)) {
    const idMatch = /\sid="([^"]+)"/.exec(' ' + m[4]);
    const text = decodeEntities(stripTags(m[5]))
      .replace(/\\[()[\]]/g, '')
      .replace(/\$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    headings.push({ level: Number(m[3]) as 2 | 3, id: idMatch ? idMatch[1] : m[2], text });
  }
  return headings;
}

// ------------------------------------------------------------------ sections

function validateSection(html: string, file: string): void {
  const trimmed = html.trim();
  if (!/^<section\b[^>]*\sid="[^"]+"[^>]*>/.test(trimmed)) {
    throw new Error(`${rel(file)}: fragment must start with <section id="...">`);
  }
  if (!/<\/section>$/.test(trimmed)) {
    throw new Error(`${rel(file)}: fragment must end with </section>`);
  }
  if (!/<h2\b/.test(trimmed)) {
    throw new Error(`${rel(file)}: fragment must contain an <h2>`);
  }
}

// Section fragments are NN-name.html files, ordered by their numeric prefix.
export function listSections(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => /^\d+-[\w-]+\.html$/.test(name))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((name) => path.join(dir, name));
}

export interface RenderedSections {
  html: string;
  headings: Heading[];
  text: string;
}

export function renderSections(files: string[]): RenderedSections {
  const parts = files.map((file) => {
    const source = resolveIncludes(fs.readFileSync(file, 'utf8'), file);
    validateSection(source, file);
    return { file, html: source.trim() };
  });
  const joined = ensureIds(parts.map((p) => p.html).join('\n\n'));
  const owner = files[0] ?? CONTENT_DIR;
  checkDuplicateIds(joined, owner);
  const rendered = highlightCode(renderMath(joined, owner), owner);
  return {
    html: rendered,
    headings: extractHeadings(joined),
    text: decodeEntities(stripTags(joined.replace(PROTECTED_RE, ' '))),
  };
}
