import DOMPurify, { type WindowLike } from 'dompurify'

// HTML that a person or an agent wrote (ladder job descriptions, company notes, resumes) is rendered only
// through this allowlist. It matches the writer side (scripts/ladder-migrate.ts and the API's
// modules/ladder/html.mjs): text structure, lists, tables, code and http(s)/mailto links. No images, no
// styles, no classes, no ids, no event handlers. Author-controlled HTML (blog posts, materials, KaTeX)
// is built from this repo or published by an admin and is not passed through here.
export const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'u', 'a',
  'blockquote', 'code', 'pre', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
]
export const ALLOWED_ATTR = ['href', 'rel', 'target']
// DOMPurify's default pattern with the schemes narrowed: a value with a scheme must be http(s) or mailto;
// plain values (rel, target, relative links) pass.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i

/** Sanitises untrusted HTML with the DOM of `win` (the browser window, or a jsdom window in tests). */
export function sanitizeUntrustedHtml(html: string, win: WindowLike): string {
  return DOMPurify(win).sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
  })
}
