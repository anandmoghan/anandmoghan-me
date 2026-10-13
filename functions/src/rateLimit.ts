import { getFirestore } from 'firebase-admin/firestore'

const WINDOW_MS = 60_000

// Fixed one-minute window per key, same semantics as the worker's KV limiter.
// Doc: t212RateLimits/{key} = { windowStart: ms epoch of the minute, count }.
export async function checkRateLimit(key: string, max: number): Promise<boolean> {
  const db = getFirestore()
  const ref = db.doc(`t212RateLimits/${key}`)
  const windowStart = Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.data()
    const current = data && data.windowStart === windowStart ? (data.count as number) : 0
    if (current >= max) return false
    tx.set(ref, { windowStart, count: current + 1 })
    return true
  })
}
