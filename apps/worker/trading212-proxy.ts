const T212_BASE = 'https://live.trading212.com/api/v0'
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const FRANKFURTER_URL = 'https://api.frankfurter.app/latest?base=GBP&symbols=USD,EUR,INR'

// Instruments cache TTL: 24 hours (they change rarely)
const INSTRUMENTS_CACHE_MS = 24 * 60 * 60 * 1000

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

interface Env {
  RATE_LIMIT: KVNamespace
  FIREBASE_PROJECT_ID: string
  RATE_LIMIT_PER_MINUTE: number
  ENCRYPTION_SECRET: string  // set via: wrangler secret put ENCRYPTION_SECRET
  SA_EMAIL: string
  SA_PRIVATE_KEY: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

function b64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64Encode(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
}

function b64Decode(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

// ── Firebase JWT verification ─────────────────────────────────────────────────

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
      'jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    )
    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5', publicKey, b64urlDecode(parts[2]), signingInput
    )
    return valid ? (payload.sub as string) : null
  } catch {
    return null
  }
}

// ── Service account token ─────────────────────────────────────────────────────

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
  const pemStripped = privateKeyPem
    .replace(/\\n/g, '\n')
    .replace(/-----[^-]+-----/g, '')
    .replace(/\s/g, '')
  const keyBytes = Uint8Array.from(atob(pemStripped), (c) => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signingInput)
  )
  const jwt = `${signingInput}.${b64urlEncode(sig)}`

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  const { access_token } = (await tokenResp.json()) as { access_token: string }
  return access_token
}

// ── Encryption (HKDF + AES-GCM, keyed on uid + ENCRYPTION_SECRET) ───────────

async function deriveUserKey(encryptionSecret: string, uid: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(encryptionSecret),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(uid),
      info: new TextEncoder().encode('trading212-credentials'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptCredentials(
  secret: string, uid: string, apiKey: string, apiSecret: string
): Promise<{ ct: string; iv: string }> {
  const key = await deriveUserKey(secret, uid)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = JSON.stringify({ apiKey, apiSecret })
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  )
  return { ct: b64Encode(encrypted), iv: b64Encode(iv) }
}

async function decryptCredentials(
  secret: string, uid: string, ct: string, iv: string
): Promise<{ apiKey: string; apiSecret: string }> {
  const key = await deriveUserKey(secret, uid)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64Decode(iv) },
    key,
    b64Decode(ct)
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}

// ── Firestore REST helpers ────────────────────────────────────────────────────

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { arrayValue: { values: FsValue[] } }
  | { mapValue: { fields: Record<string, FsValue> } }

function toFsValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFsValue) } }
  if (typeof v === 'object') {
    const fields: Record<string, FsValue> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      fields[k] = toFsValue(val)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(v) }
}

function toFsDoc(obj: Record<string, unknown>): { fields: Record<string, FsValue> } {
  const fields: Record<string, FsValue> = {}
  for (const [k, v] of Object.entries(obj)) {
    fields[k] = toFsValue(v)
  }
  return { fields }
}

function fromFsFields(fields: Record<string, FsValue>): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fields)) {
    obj[k] = fromFsValue(v)
  }
  return obj
}

function fromFsValue(v: FsValue): unknown {
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return v.booleanValue
  if ('integerValue' in v) return parseInt(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('stringValue' in v) return v.stringValue
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(fromFsValue)
  if ('mapValue' in v) return fromFsFields(v.mapValue.fields ?? {})
  return null
}

const fsBase = (projectId: string) =>
  `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`

async function fsWrite(
  projectId: string, path: string, data: Record<string, unknown>, token: string
): Promise<void> {
  await fetch(`${fsBase(projectId)}/${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(toFsDoc(data)),
  })
}

async function fsRead(
  projectId: string, path: string, token: string
): Promise<Record<string, unknown> | null> {
  const resp = await fetch(`${fsBase(projectId)}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!resp.ok) return null
  const doc = (await resp.json()) as { fields?: Record<string, FsValue> }
  return doc.fields ? fromFsFields(doc.fields) : null
}

async function fsListIds(
  projectId: string, collection: string, token: string
): Promise<string[]> {
  const resp = await fetch(
    `${fsBase(projectId)}/${collection}?pageSize=300`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!resp.ok) return []
  const body = (await resp.json()) as { documents?: Array<{ name: string }> }
  return (body.documents ?? []).map((d) => d.name.split('/').pop()!)
}

// ── Exchange rates ────────────────────────────────────────────────────────────

async function fetchFrankfurterRates(): Promise<{ USD: number; EUR: number; INR: number }> {
  const resp = await fetch(FRANKFURTER_URL)
  if (!resp.ok) throw new Error(`Frankfurter error ${resp.status}`)
  const json = (await resp.json()) as { rates: { USD: number; EUR: number; INR: number } }
  return json.rates
}

async function writeRatesToFirestore(
  projectId: string,
  rates: { USD: number; EUR: number; INR: number },
  token: string
): Promise<void> {
  await fsWrite(projectId, 'config/exchangeRates', {
    base: 'GBP',
    rates,
    updatedAt: Date.now(),
  }, token)
}

// ── Trading 212 fetch helpers ────────────────────────────────────────────────

async function t212Get<T>(path: string, apiKey: string, apiSecret: string): Promise<T> {
  const basicAuth = 'Basic ' + btoa(`${apiKey}:${apiSecret}`)
  const resp = await fetch(`${T212_BASE}${path}`, {
    headers: { Authorization: basicAuth, 'Content-Type': 'application/json' },
  })
  if (resp.status === 403) return [] as unknown as T  // no permission, return empty
  if (!resp.ok) throw new Error(`T212 ${resp.status} on ${path}`)
  return resp.json()
}

interface T212Position {
  ticker: string; quantity: number; averagePrice: number; currentPrice: number
  ppl: number; fxPpl: number; initialFillDate: string; frontend: string
  maxBuy: number; maxSell: number; pieQuantity: number
}
interface T212Cash {
  blocked: number; free: number; invested: number; pieCash: number
  ppl: number; result: number; total: number
}
interface T212Order {
  dateModified: string; dateCreated: string; executor: string; fillCost: number
  fillId: number; fillPrice: number; fillResult: number; fillType: string
  filledQuantity: number; id: number; orderedQuantity: number; orderedValue: number
  parentOrder: number; status: string; ticker: string; timeValidity: string; type: string
}
interface T212Instrument { ticker: string; currencyCode: string; name: string; shortname: string }

// Fetch portfolio, cash, orders (and optionally instruments) for a user.
// Snapshot fields are minimal keys to save Firestore bandwidth.
async function fetchAndWriteSnapshot(
  projectId: string, uid: string, apiKey: string, apiSecret: string,
  token: string, fetchInstruments: boolean
): Promise<void> {
  let error: string | null = null
  let portfolio: T212Position[] = []
  let cash: T212Cash | null = null
  let orders: T212Order[] = []
  let instruments: T212Instrument[] | null = null

  try {
    const [p, c, oResp] = await Promise.all([
      t212Get<T212Position[]>('/equity/portfolio', apiKey, apiSecret),
      t212Get<T212Cash>('/equity/account/cash', apiKey, apiSecret),
      fetch(`${T212_BASE}/equity/history/orders?limit=50`, {
        headers: { Authorization: 'Basic ' + btoa(`${apiKey}:${apiSecret}`) },
      }),
    ])
    portfolio = p
    cash = c
    if (oResp.status !== 403 && oResp.ok) {
      const oBody = (await oResp.json()) as { items: T212Order[] }
      orders = oBody.items ?? []
    }
    if (fetchInstruments) {
      instruments = await t212Get<T212Instrument[]>('/equity/metadata/instruments', apiKey, apiSecret)
    }
  } catch (e) {
    error = String(e)
  }

  // Write snapshot with minimal field names (p, c, o, ts, err)
  await fsWrite(projectId, `t212Snapshots/${uid}`, {
    p: portfolio,
    c: cash,
    o: orders,
    ts: Date.now(),
    err: error,
  }, token)

  // Write instruments to shared config if fetched
  if (instruments && instruments.length > 0) {
    await fsWrite(projectId, 'config/t212Instruments', {
      i: instruments,
      updatedAt: Date.now(),
    }, token)
  }
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

async function checkRateLimit(kv: KVNamespace, uid: string, max: number): Promise<boolean> {
  const key = `rl:${uid}:${Math.floor(Date.now() / 60_000)}`
  const current = parseInt((await kv.get(key)) ?? '0')
  if (current >= max) return false
  await kv.put(key, String(current + 1), { expirationTtl: 120 })
  return true
}

// ── HTTP Handler ──────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }

    // Verify Firebase JWT on all endpoints
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

    // ── GET /rates ──────────────────────────────────────────────────────────
    if (url.pathname === '/rates' && request.method === 'GET') {
      try {
        const rates = await fetchFrankfurterRates()
        return new Response(JSON.stringify({ base: 'GBP', rates, updatedAt: Date.now() }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        })
      } catch (err) {
        return new Response(`Failed to fetch rates: ${err}`, { status: 502, headers: CORS_HEADERS })
      }
    }

    // ── POST /api/key — encrypt and store T212 credentials ──────────────────
    if (url.pathname === '/api/key' && request.method === 'POST') {
      if (!env.ENCRYPTION_SECRET) {
        return new Response('ENCRYPTION_SECRET not configured', { status: 500, headers: CORS_HEADERS })
      }
      let body: { apiKey?: string; apiSecret?: string }
      try {
        body = await request.json()
      } catch {
        return new Response('Invalid JSON body', { status: 400, headers: CORS_HEADERS })
      }
      const { apiKey, apiSecret } = body
      if (!apiKey || !apiSecret) {
        return new Response('apiKey and apiSecret are required', { status: 400, headers: CORS_HEADERS })
      }

      try {
        const { ct, iv } = await encryptCredentials(env.ENCRYPTION_SECRET, uid, apiKey, apiSecret)
        const saToken = await getServiceAccountToken(env.SA_EMAIL, env.SA_PRIVATE_KEY)
        await fsWrite(env.FIREBASE_PROJECT_ID, `t212Creds/${uid}`, {
          ct,
          iv,
          updatedAt: Date.now(),
        }, saToken)
        return new Response('OK', { status: 200, headers: CORS_HEADERS })
      } catch (err) {
        return new Response(`Failed to save key: ${err}`, { status: 500, headers: CORS_HEADERS })
      }
    }

    // ── POST /api/sync — fetch T212 data for the authenticated user ─────────
    if (url.pathname === '/api/sync' && request.method === 'POST') {
      if (!env.ENCRYPTION_SECRET) {
        return new Response('ENCRYPTION_SECRET not configured', { status: 500, headers: CORS_HEADERS })
      }

      // Rate limit: max 5 manual syncs per minute per user
      const allowed = await checkRateLimit(env.RATE_LIMIT, `sync:${uid}`, 5)
      if (!allowed) {
        return new Response('Rate limit exceeded', { status: 429, headers: { ...CORS_HEADERS, 'Retry-After': '60' } })
      }

      try {
        const saToken = await getServiceAccountToken(env.SA_EMAIL, env.SA_PRIVATE_KEY)
        const creds = await fsRead(env.FIREBASE_PROJECT_ID, `t212Creds/${uid}`, saToken)
        if (!creds) {
          return new Response('No credentials stored', { status: 404, headers: CORS_HEADERS })
        }
        const { apiKey, apiSecret } = await decryptCredentials(
          env.ENCRYPTION_SECRET, uid,
          creds.ct as string, creds.iv as string
        )

        // Check if instruments are stale
        const instrDoc = await fsRead(env.FIREBASE_PROJECT_ID, 'config/t212Instruments', saToken)
        const instrStale = !instrDoc || (Date.now() - (instrDoc.updatedAt as number ?? 0)) > INSTRUMENTS_CACHE_MS

        await fetchAndWriteSnapshot(
          env.FIREBASE_PROJECT_ID, uid, apiKey, apiSecret, saToken, instrStale
        )
        return new Response('OK', { status: 200, headers: CORS_HEADERS })
      } catch (err) {
        return new Response(`Sync failed: ${err}`, { status: 500, headers: CORS_HEADERS })
      }
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS })
  },

  // ── Cron — runs every 4 hours ─────────────────────────────────────────────
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    try {
      const saToken = await getServiceAccountToken(env.SA_EMAIL, env.SA_PRIVATE_KEY)

      // Update exchange rates
      try {
        const rates = await fetchFrankfurterRates()
        await writeRatesToFirestore(env.FIREBASE_PROJECT_ID, rates, saToken)
      } catch { /* non-fatal */ }

      if (!env.ENCRYPTION_SECRET) return

      // Check if instruments are stale
      const instrDoc = await fsRead(env.FIREBASE_PROJECT_ID, 'config/t212Instruments', saToken)
      const instrStale = !instrDoc || (Date.now() - (instrDoc.updatedAt as number ?? 0)) > INSTRUMENTS_CACHE_MS

      // List all users with T212 credentials
      const uids = await fsListIds(env.FIREBASE_PROJECT_ID, 't212Creds', saToken)

      let instrumentsFetched = false
      for (const uid of uids) {
        try {
          const creds = await fsRead(env.FIREBASE_PROJECT_ID, `t212Creds/${uid}`, saToken)
          if (!creds || !creds.ct || !creds.iv) continue

          const { apiKey, apiSecret } = await decryptCredentials(
            env.ENCRYPTION_SECRET, uid, creds.ct as string, creds.iv as string
          )

          // Fetch instruments from the first valid account if stale
          const fetchInstr = instrStale && !instrumentsFetched
          await fetchAndWriteSnapshot(
            env.FIREBASE_PROJECT_ID, uid, apiKey, apiSecret, saToken, fetchInstr
          )
          if (fetchInstr) instrumentsFetched = true
        } catch { /* skip this user, try next */ }
      }
    } catch { /* silent — next run will retry */ }
  },
}
