import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'

// Visit logging (POST /api/visit) and the visitor's own data deletion (POST /api/account/delete).
// visits/{autoId}: { uid, isAnonymous, path, referrer, country, sessionId, createdAt }.
// users/{uid} gains lastSeenAt, country, visitCount and firstSeenAt. Visits are written only here
// (rules deny client writes) and only for users whose users/{uid}.consent is 'granted'.

export interface VisitInput {
  path: string
  referrer: string | null
  sessionId: string
}

const MAX_PATH = 500
const MAX_REFERRER = 1000
const SESSION_ID = /^[A-Za-z0-9_-]{8,64}$/
const COUNTRY = /^[A-Z]{2}$/

/** Validates the request body; null when it is not a usable visit. */
export function parseVisit(body: unknown): VisitInput | null {
  if (!body || typeof body !== 'object') return null
  const { path, referrer, sessionId } = body as Record<string, unknown>
  if (typeof path !== 'string' || !path.startsWith('/') || path.length > MAX_PATH) return null
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return null
  if (referrer !== undefined && referrer !== null && typeof referrer !== 'string') return null
  const ref = typeof referrer === 'string' && referrer.length > 0 ? referrer.slice(0, MAX_REFERRER) : null
  return { path, referrer: ref, sessionId }
}

/**
 * Two-letter country of the visitor. Firebase Hosting (Fastly) adds x-country-code to requests
 * it forwards to functions; x-appengine-country is the Google front end's header, set on
 * first-gen functions and App Engine only. Unknown values (ZZ, XX) and anything else map to null.
 */
export function countryFromHeaders(get: (name: string) => string | undefined): string | null {
  for (const name of ['x-country-code', 'x-appengine-country']) {
    const value = get(name)?.trim().toUpperCase()
    if (value && COUNTRY.test(value) && value !== 'ZZ' && value !== 'XX') return value
  }
  return null
}

/**
 * Writes one visit and updates the user's counters. Returns false (and writes nothing) when the
 * user has not accepted analytics.
 */
export async function recordVisit(
  uid: string,
  isAnonymous: boolean,
  country: string | null,
  visit: VisitInput,
): Promise<boolean> {
  const db = getFirestore()
  const userRef = db.doc(`users/${uid}`)
  return db.runTransaction(async (tx) => {
    const user = await tx.get(userRef)
    if (user.get('consent') !== 'granted') return false
    const now = FieldValue.serverTimestamp()
    tx.create(db.collection('visits').doc(), {
      uid,
      isAnonymous,
      path: visit.path,
      referrer: visit.referrer,
      country,
      sessionId: visit.sessionId,
      createdAt: now,
    })
    tx.set(
      userRef,
      {
        lastSeenAt: now,
        visitCount: FieldValue.increment(1),
        ...(country ? { country } : {}),
        ...(user.get('firstSeenAt') ? {} : { firstSeenAt: now }),
      },
      { merge: true },
    )
    return true
  })
}

export interface DeleteResult {
  visits: number
  comments: number
}

/**
 * Deletes everything the visitor features in: their visits, their blog comments, users/{uid}
 * and its prefs, then the auth user. Blog comments are found per post, like the account merge,
 * so no collection-group index is needed.
 */
export async function deleteVisitorData(uid: string): Promise<DeleteResult> {
  const db = getFirestore()
  const writer = db.bulkWriter()
  let visits = 0
  let comments = 0

  const ownVisits = await db.collection('visits').where('uid', '==', uid).get()
  for (const visit of ownVisits.docs) {
    writer.delete(visit.ref)
    visits++
  }

  const posts = await db.collection('posts').listDocuments()
  for (const post of posts) {
    const authored = await post.collection('comments').where('uid', '==', uid).get()
    for (const comment of authored.docs) {
      writer.delete(comment.ref)
      comments++
    }
  }

  const prefs = await db.collection(`users/${uid}/prefs`).listDocuments()
  for (const pref of prefs) writer.delete(pref)
  writer.delete(db.doc(`users/${uid}`))
  await writer.close()
  await getAuth().deleteUser(uid)
  return { visits, comments }
}
