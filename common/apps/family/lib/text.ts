// Turning agent-written markdown into short points: feed cards, health notes, style guide sections.

/** Markdown to a single line of plain text. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`|]+/g, " ")
    .replace(/^\s*-\s+/gm, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Markdown to a single line that keeps inline formatting (bold, italics, links, code), images dropped. */
function inlineMarkdown(md: string): string {
  return md.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
}

/** Drops bold markers left unpaired when a sentence split falls inside a bold run. */
function balanceBold(s: string): string {
  return (s.match(/\*\*/g) ?? []).length % 2 === 1 ? s.replace(/\*\*/g, "") : s;
}

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+(.*)$/;
const ABBREV = /(?:\b(?:Rs|e\.g|i\.e|etc|vs|approx|No|Mr|Mrs|Ms|Dr|St|Inc|Ltd|Co)\.)$/i;

/** Splits prose into sentences. A full stop only ends a sentence when whitespace and then a capital, digit, rupee sign,
 * quote or bracket follows, and the word before it is not an abbreviation ("Rs.", "e.g."). Decimals ("4.5") and dates
 * ("Thu 8 Oct") never contain such a break. */
export function splitSentences(text: string): string[] {
  const parts = text.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9₹"'(\[*_])/);
  const out: string[] = [];
  for (const part of parts) {
    const prev = out[out.length - 1];
    if (prev !== undefined && ABBREV.test(prev)) out[out.length - 1] = `${prev} ${part}`;
    else out.push(part);
  }
  return out.map((x) => x.trim()).filter(Boolean);
}

const isProseBlock = (p: string) => p !== "" && !/^(#|\||---|\*\*\*|```|>|!\[)/.test(p);

/** Up to `max` points that keep inline markdown (bold, links), for rendering with react-markdown. Blocks are read in
 * order: list items become one point each (wrapped continuation lines join their item), prose becomes its sentences.
 * Headings, tables, quotes and code are skipped. */
export function markdownPoints(body: string | undefined, max: number): string[] {
  if (!body) return [];
  const out: string[] = [];
  for (const raw of body.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/)) {
    const block = raw.trim();
    if (!isProseBlock(block)) continue;
    const lines = block.split("\n");
    if (lines.some((l) => LIST_ITEM.test(l))) {
      const items: string[] = [];
      for (const l of lines) {
        const m = LIST_ITEM.exec(l);
        if (m) items.push(m[1].replace(/^\[[ xX]\]\s+/, ""));
        else if (items.length > 0 && l.trim()) items[items.length - 1] += ` ${l.trim()}`;
      }
      out.push(...items.map(inlineMarkdown).filter(Boolean));
    } else {
      out.push(...splitSentences(inlineMarkdown(block)));
    }
    if (out.length >= max) break;
  }
  return out.slice(0, max).map(balanceBold);
}

/** True when the points (all of them, not just the first few) carry everything in the body: every block is prose or a
 * list. Headings, tables, quotes and code are never covered. */
export function pointsCoverBody(body: string): boolean {
  return body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).every(isProseBlock);
}

export interface Section { heading: string | null; body: string }

/** Splits markdown on `#` and `##` headings. Text before the first heading is a section with no heading; deeper
 * headings (`###`) stay inside their section. */
export function splitSections(md: string): Section[] {
  const out: Section[] = [];
  let current: Section = { heading: null, body: "" };
  let fenced = false;
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("```")) fenced = !fenced;
    const m = !fenced && /^#{1,2}\s+(.*)$/.exec(line);
    if (m) {
      if (current.heading !== null || current.body.trim()) out.push(current);
      current = { heading: plainText(m[1]), body: "" };
    } else {
      current.body += `${line}\n`;
    }
  }
  if (current.heading !== null || current.body.trim()) out.push(current);
  return out.map((s) => ({ ...s, body: s.body.trim() }));
}

/** True when the markdown has a table (shown whole, tables are already compact). */
export function hasTable(md: string): boolean {
  return /^\s*\|.*\|\s*$/m.test(md);
}
