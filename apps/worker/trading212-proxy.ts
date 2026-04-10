const T212_BASE = 'https://live.trading212.com/api/v0'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=GBP&symbols=USD,EUR,INR'
const CACHE_TTL_SECONDS = 30
const INSTRUMENTS_CACHE_TTL_SECONDS = 3600 // instrument metadata changes rarely

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-T212-Key, X-T212-Secret',
}

interface Env {
  RATE_LIMIT: KVNamespace
  FIREBASE_PROJECT_ID: string
  RATE_LIMIT_PER_MINUTE: number
  SA_EMAIL: string        // service account client_email (set in [vars])
  SA_PRIVATE_KEY: string  // service account private_key (set via: wrangler secret put SA_PRIVATE_KEY)
}

// ── JWT helpers ──────────────────────────────────────────────────────────────

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function verifyFirebaseToken(token: string, projectId: string): Promise<string | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const header = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])))
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])))

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp < now) return null
    if (payload.iat > now + 300) return null
    if (payload.aud !== projectId) return null
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null
    if (!payload.sub) return null

    const keysResp = await fetch(JWKS_URL, { cf: { cacheTtl: 3600 } } as RequestInit)
    const { keys } = (await keysResp.json()) as { keys: (JsonWebKey & { kid: string })[] }
    const jwk = keys.find((k) => k.kid === header.kid)
    if (!jwk) return null

    const publicKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, b64urlDecode(parts[2]), signingInput)

    return valid ? (payload.sub as string) : null
  } catch {
    return null
  }
}

// ── Service account token (for Worker → Firestore writes) ────────────────────

async function getServiceAccountToken(email: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const jwtHeader = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const jwtPayload = b64urlEncode(new TextEncoder().encode(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })))

  const signingInput = `${jwtHeader}.${jwtPayload}`

  const pemStripped = privateKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemStripped), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )

  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput))
  const jwt = `${signingInput}.${b64urlEncode(sig)}`

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const { access_token } = (await tokenResp.json()) as { access_token: string }
  return access_token
}

// ── Firestore write helper ────────────────────────────────────────────────────

async function writeRatesToFirestore(
  projectId: string,
  rates: { USD: number; EUR: number; INR: number },
  token: string
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/exchangeRates`
  await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        base: { stringValue: 'GBP' },
        rates: {
          mapValue: {
            fields: {
              USD: { doubleValue: rates.USD },
              EUR: { doubleValue: rates.EUR },
              INR: { doubleValue: rates.INR },
            },
          },
        },
        updatedAt: { integerValue: String(Date.now()) },
      },
    }),
  })
}

// ── Exchange rates fetch ──────────────────────────────────────────────────────

async function fetchFrankfurterRates(): Promise<{ USD: number; EUR: number; INR: number }> {
  const resp = await fetch(FRANKFURTER_URL)
  if (!resp.ok) throw new Error(`Frankfurter error ${resp.status}`)
  const json = (await resp.json()) as { rates: { USD: number; EUR: number; INR: number } }
  return json.rates
}

// ── Rate limiting (Cloudflare KV, per-user per-minute) ───────────────────────

async function checkRateLimit(kv: KVNamespace, uid: string, max: number): Promise<boolean> {
  const key = `rl:${uid}:${Math.floor(Date.now() / 60_000)}`
  const current = parseInt((await kv.get(key)) ?? '0')
  if (current >= max) return false
  await kv.put(key, String(current + 1), { expirationTtl: 120 })
  return true
}

// ── Response cache (Cloudflare Cache API, per-user per-endpoint, 30s TTL) ────

async function getCached(uid: string, t212Url: string): Promise<Response | null> {
  const cache = caches.default
  const key = new Request(`https://t212-cache/${uid}/${encodeURIComponent(t212Url)}`)
  const hit = await cache.match(key)
  return hit ?? null
}

async function putCached(uid: string, t212Url: string, body: string, status: number): Promise<void> {
  if (status !== 200) return
  const ttl = t212Url.includes('/metadata/instruments') ? INSTRUMENTS_CACHE_TTL_SECONDS : CACHE_TTL_SECONDS
  const cache = caches.default
  const key = new Request(`https://t212-cache/${uid}/${encodeURIComponent(t212Url)}`)
  const response = new Response(body, {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttl}`,
      'X-Cache': 'MISS',
    },
  })
  await cache.put(key, response)
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default {
  // HTTP handler — proxies T212 requests + serves /rates
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS })
    }

    // Verify Firebase JWT for all endpoints
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      return new Response('Missing Authorization header', { status: 401, headers: CORS_HEADERS })
    }

    const uid = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID)
    if (!uid) {
      return new Response('Invalid or expired token', { status: 401, headers: CORS_HEADERS })
    }

    const url = new URL(request.url)

    // ── /rates — proxy frankfurter.app (no CORS from browser) ──────────────
    if (url.pathname === '/rates') {
      try {
        const rates = await fetchFrankfurterRates()
        const payload = { base: 'GBP', rates, updatedAt: Date.now() }
        return new Response(JSON.stringify(payload), {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        })
      } catch (err) {
        return new Response(`Failed to fetch rates: ${err}`, { status: 502, headers: CORS_HEADERS })
      }
    }

    // ── T212 proxy ──────────────────────────────────────────────────────────
    const t212Url = `${T212_BASE}${url.pathname}${url.search}`

    // Edge cache (cache hits don't count against rate limit)
    const cached = await getCached(uid, t212Url)
    if (cached) {
      const body = await cached.text()
      return new Response(body, {
        status: cached.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Cache': 'HIT' },
      })
    }

    // Per-user rate limit
    const allowed = await checkRateLimit(env.RATE_LIMIT, uid, env.RATE_LIMIT_PER_MINUTE)
    if (!allowed) {
      return new Response('Rate limit exceeded', { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': '60' } })
    }

    const apiKey = request.headers.get('X-T212-Key')
    const apiSecret = request.headers.get('X-T212-Secret')
    if (!apiKey || !apiSecret) {
      return new Response('Missing T212 credentials', { status: 400, headers: CORS_HEADERS })
    }

    const basicAuth = 'Basic ' + btoa(`${apiKey}:${apiSecret}`)

    try {
      const response = await fetch(t212Url, {
        headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
      })

      const body = await response.text()
      await putCached(uid, t212Url, body, response.status)

      return new Response(body, {
        status: response.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Cache': 'MISS' },
      })
    } catch (err) {
      return new Response(`Proxy error: ${err}`, { status: 502, headers: CORS_HEADERS })
    }
  },

  // Cron handler — runs every hour, writes fresh rates to Firestore
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    try {
      const rates = await fetchFrankfurterRates()
      const saToken = await getServiceAccountToken(env.SA_EMAIL, env.SA_PRIVATE_KEY)
      await writeRatesToFirestore(env.FIREBASE_PROJECT_ID, rates, saToken)
    } catch {
      // Errors are silent — next cron run will retry
    }
  },
}
