// Token patterns and rules learned from the three sample issuers (HSBC bank,
// HSBC CC, Amex). The goal isn't perfect canonicalisation — it's "good enough
// to suggest a default vendor name" that users can refine with vendor aliases.

const BANK_TYPE_PREFIXES = /^\s*(?:DD|CR|OBP|BP|TFR|ATM|SO|BAC|CHQ|POS|VIS|DR|INT|IAP)\s+/

const FULL_URL = /\bHTTPS?:\/\/\S+/gi
// Strip just the TLD/path so "AMAZON.CO.UK" becomes "AMAZON" (brand survives).
const URL_SUFFIX = /\.(?:CO\.UK|COM|GOV\.UK|UK|EU|IO|ORG|NET|LONDON|US)(?:\/\S*)?/gi

const REF_TOKEN_STAR = /\*\S{4,}/g            // "*A87CC9DP5"
const REF_TOKEN_MASKED = /\b\d{4,}\*+\d{4,}\b/g  // "543458******1015"
const ALNUM_NOISE = /\b[A-Z]*\d[A-Z\d]*\b/g  // any uppercase/alphanumeric token containing a digit

const STAR_NOISE = /\s\*\s/g
const STANDALONE_STAR = /(^|\s)\*+(\s|$)/g
const TRAILING_STAR_ON_TOKEN = /\*+/g  // strip every remaining * (e.g. "BH*" -> "BH")
const REPEAT_WORD = /\b(\w+)(?:\s+\1\b)+/gi

const TRAILING_LOCATION_HINT = /\s+(BRENTWOOD|LONDON|HATFIELD|HEXAM|BAKEWELL|BILLERICAY|ROMFORD|CAMBRIDGE|WARWICK|READING|GLASGOW|DUBLIN|SHEFFIELD|MOUNTAIN VIEW|LOS ANGELES|SAN FRANCISCO|HOLLYHILL|SEATTLE)(?:\s+[A-Z]{1,4})?\s*$/i
const POSTCODE = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d?[A-Z]{0,2}\b/g

const BRAND_CASE_TOKENS = new Set(['tfl', 'amzn', 'm&s', 'tv', 'cc', 'hsbc', 'nwl', 'esw', 'ee', 'ee.', 'ocado'])

export function normalizeDescription(raw: string): string {
  let s = ' ' + raw.toUpperCase().trim() + ' '

  s = s.replace(BANK_TYPE_PREFIXES, ' ')
  s = s.replace(FULL_URL, ' ')
  s = s.replace(URL_SUFFIX, ' ')
  s = s.replace(REF_TOKEN_MASKED, ' ')
  s = s.replace(REF_TOKEN_STAR, ' ')
  s = s.replace(ALNUM_NOISE, ' ')
  s = s.replace(STAR_NOISE, ' ')
  s = s.replace(STANDALONE_STAR, ' ')
  s = s.replace(TRAILING_STAR_ON_TOKEN, '')
  s = s.replace(POSTCODE, ' ')

  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(REPEAT_WORD, '$1')
  s = s.replace(TRAILING_LOCATION_HINT, '').trim()
  s = s.replace(/\s+/g, ' ').trim()

  return titleCase(s)
}

/**
 * Extracts the brand portion of a normalized description for use as a vendor
 * alias. Takes up to N leading alphabetic tokens, skipping anything containing
 * digits or short stop-words. Returns title-cased text.
 */
export function brandFromNormalized(normalized: string, maxTokens = 3): string {
  if (!normalized) return ''
  const tokens = normalized.split(/\s+/).filter((t) => t && !/\d/.test(t))
  if (tokens.length === 0) return ''
  return tokens.slice(0, maxTokens).join(' ').trim()
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => {
      if (!w) return w
      const stripped = w.replace(/[^a-z]/g, '')
      if (stripped.length > 0 && stripped.length <= 4 && BRAND_CASE_TOKENS.has(stripped)) return w.toUpperCase()
      return w[0].toUpperCase() + w.slice(1)
    })
    .join(' ')
}
