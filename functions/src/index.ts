import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { onRequest, type Request } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import type { Response } from 'express'
import { ENCRYPTION_SECRET, REGION, SYNC_RATE_LIMIT_PER_MINUTE } from './config.js'
import { decryptCredentials, encryptCredentials } from './crypto.js'
import { checkRateLimit } from './rateLimit.js'
import { fetchFrankfurterRates, writeRatesToFirestore } from './rates.js'
import { fetchAndWriteSnapshot } from './trading212.js'

initializeApp()

// Same-origin in production (Hosting rewrite), so CORS is only for the local emulator.
const CORS_HEADERS: Record<string, string> = process.env.FUNCTIONS_EMULATOR === 'true'
  ? {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  : {}

function text(res: Response, status: number, body: string, extra: Record<string, string> = {}): void {
  res.status(status)
  res.set({ ...CORS_HEADERS, 'Content-Type': 'text/plain;charset=UTF-8', ...extra })
  res.send(body)
}

async function verifyToken(token: string): Promise<string | null> {
  try {
    return (await getAuth().verifyIdToken(token)).uid
  } catch {
    return null
  }
}

function parseJsonBody(req: Request): unknown {
  // Parse the raw bytes so any content type works, like the worker's request.json().
  if (req.rawBody) return JSON.parse(req.rawBody.toString('utf8'))
  if (req.body && typeof req.body === 'object') return req.body
  throw new Error('no body')
}

async function readCreds(uid: string): Promise<Record<string, unknown> | null> {
  const snap = await getFirestore().doc(`t212Creds/${uid}`).get()
  const data = snap.data()
  return data && Object.keys(data).length > 0 ? data : null
}

export const api = onRequest(
  { region: REGION, secrets: [ENCRYPTION_SECRET], invoker: 'public', timeoutSeconds: 120 },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).set(CORS_HEADERS).send()
      return
    }

    const authHeader = req.get('Authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) {
      text(res, 401, 'Missing Authorization header')
      return
    }
    const uid = await verifyToken(token)
    if (!uid) {
      text(res, 401, 'Invalid or expired token')
      return
    }

    const secret = ENCRYPTION_SECRET.value()

    // GET /api/rates (and /rates)
    if ((req.path === '/api/rates' || req.path === '/rates') && req.method === 'GET') {
      try {
        const rates = await fetchFrankfurterRates()
        res.status(200)
        res.set({ ...CORS_HEADERS, 'Content-Type': 'application/json' })
        res.send(JSON.stringify({ base: 'GBP', rates, updatedAt: Date.now() }))
      } catch (err) {
        text(res, 502, `Failed to fetch rates: ${err}`)
      }
      return
    }

    // POST /api/key: encrypt and store T212 credentials
    if (req.path === '/api/key' && req.method === 'POST') {
      if (!secret) {
        text(res, 500, 'ENCRYPTION_SECRET not configured')
        return
      }
      let body: { apiKey?: string; apiSecret?: string }
      try {
        body = (parseJsonBody(req) ?? {}) as { apiKey?: string; apiSecret?: string }
      } catch {
        text(res, 400, 'Invalid JSON body')
        return
      }
      const { apiKey, apiSecret } = body
      if (!apiKey || !apiSecret) {
        text(res, 400, 'apiKey and apiSecret are required')
        return
      }

      try {
        const { ct, iv } = await encryptCredentials(secret, uid, apiKey, apiSecret)
        await getFirestore().doc(`t212Creds/${uid}`).set({ ct, iv, updatedAt: Date.now() })
        text(res, 200, 'OK')
      } catch (err) {
        text(res, 500, `Failed to save key: ${err}`)
      }
      return
    }

    // POST /api/sync: fetch T212 data for the authenticated user
    if (req.path === '/api/sync' && req.method === 'POST') {
      if (!secret) {
        text(res, 500, 'ENCRYPTION_SECRET not configured')
        return
      }

      // Max 5 manual syncs per minute per user
      let allowed: boolean
      try {
        allowed = await checkRateLimit(uid, SYNC_RATE_LIMIT_PER_MINUTE)
      } catch (err) {
        text(res, 500, `Sync failed: ${err}`)
        return
      }
      if (!allowed) {
        text(res, 429, 'Rate limit exceeded', { 'Retry-After': '60' })
        return
      }

      try {
        const creds = await readCreds(uid)
        if (!creds) {
          text(res, 404, 'No credentials stored')
          return
        }
        const { apiKey, apiSecret } = await decryptCredentials(
          secret, uid, creds.ct as string, creds.iv as string
        )
        await fetchAndWriteSnapshot(uid, apiKey, apiSecret)
        text(res, 200, 'OK')
      } catch (err) {
        text(res, 500, `Sync failed: ${err}`)
      }
      return
    }

    text(res, 404, 'Not found')
  }
)

// Every 4 hours on the hour, UTC (Cloudflare crons are UTC).
export const syncAll = onSchedule(
  {
    region: REGION,
    schedule: '0 */4 * * *',
    timeZone: 'Etc/UTC',
    secrets: [ENCRYPTION_SECRET],
    timeoutSeconds: 540,
    retryCount: 0,
  },
  async () => {
    try {
      try {
        const rates = await fetchFrankfurterRates()
        await writeRatesToFirestore(rates)
      } catch { /* non-fatal */ }

      const secret = ENCRYPTION_SECRET.value()
      if (!secret) return

      const refs = await getFirestore().collection('t212Creds').listDocuments()
      for (const ref of refs) {
        const uid = ref.id
        try {
          const creds = await readCreds(uid)
          if (!creds || !creds.ct || !creds.iv) continue
          const { apiKey, apiSecret } = await decryptCredentials(
            secret, uid, creds.ct as string, creds.iv as string
          )
          await fetchAndWriteSnapshot(uid, apiKey, apiSecret)
        } catch { /* skip this user, try next */ }
      }
    } catch { /* silent: next run will retry */ }
  }
)
