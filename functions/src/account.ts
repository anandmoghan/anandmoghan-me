import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export interface MergeResult {
  /** users/{target} fields taken from the guest (displayName, consent). */
  profile: string[]
  prefs: number
  comments: number
  reads: number
}

// Comment collections that hold a uid, as [parent collection, author field, name field].
// posts/{slug}/comments (blog comments) and shareDecks/{slug}/comments (deck comments).
// Each parent is listed and queried per document, so no collection-group index is needed.
const COMMENT_SOURCES: Array<[string, string, string]> = [
  ['posts', 'uid', 'displayName'],
  ['shareDecks', 'authorUid', 'nickname'],
]

// Generated guest names (common/firebase/nickname.ts). The target's sign-in may already have
// given it one before the merge runs, so it counts as having no name of its own.
const GUEST_NAME = /^guest-[0-9a-f]{4,6}$/

function ownName(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && !GUEST_NAME.test(value) ? value : null
}

/**
 * Moves what an anonymous session owns to an existing account, then deletes the anonymous
 * user: from users/{anon}, displayName when the target has no name of its own and consent when
 * the target has not chosen; users/{anon}/prefs and users/{anon}/reads docs the target does not
 * have yet; and comments authored by the anonymous uid, re-attributed with the target's name.
 * The users/{anon} doc, its prefs and reads are deleted.
 */
export async function mergeAnonymousInto(anonUid: string, targetUid: string): Promise<MergeResult> {
  const db = getFirestore()
  const writer = db.bulkWriter()
  const profile: string[] = []
  let prefs = 0
  let comments = 0
  let reads = 0

  const anonRef = db.doc(`users/${anonUid}`)
  const targetRef = db.doc(`users/${targetUid}`)
  const [anonDoc, targetDoc] = await Promise.all([anonRef.get(), targetRef.get()])
  const anonData = anonDoc.data() ?? {}
  const targetData = targetDoc.data() ?? {}
  const fields: Record<string, unknown> = {}
  const anonName = typeof anonData.displayName === 'string' ? anonData.displayName : null
  if (!ownName(targetData.displayName) && anonName) {
    fields.displayName = anonName
    profile.push('displayName')
  }
  if (targetData.consent === undefined && anonData.consent !== undefined) {
    fields.consent = anonData.consent
    if (anonData.consentAt !== undefined) fields.consentAt = anonData.consentAt
    profile.push('consent')
  }
  if (Object.keys(fields).length > 0) writer.set(targetRef, fields, { merge: true })
  // The name the target's comments show from now on.
  const targetName = typeof targetData.displayName === 'string' ? targetData.displayName : null
  const name = ownName(targetName) ?? anonName ?? targetName

  const anonReads = await db.collection(`users/${anonUid}/reads`).get()
  for (const read of anonReads.docs) {
    const targetRef = db.doc(`users/${targetUid}/reads/${read.id}`)
    if (!(await targetRef.get()).exists) {
      writer.set(targetRef, read.data())
      reads++
    }
    writer.delete(read.ref)
  }

  const anonPrefs = await db.collection(`users/${anonUid}/prefs`).get()
  for (const pref of anonPrefs.docs) {
    const targetRef = db.doc(`users/${targetUid}/prefs/${pref.id}`)
    if (!(await targetRef.get()).exists) {
      writer.set(targetRef, pref.data())
      prefs++
    }
    writer.delete(pref.ref)
  }

  for (const [parent, field, nameField] of COMMENT_SOURCES) {
    const parents = await db.collection(parent).listDocuments()
    for (const parentRef of parents) {
      const authored = await parentRef.collection('comments').where(field, '==', anonUid).get()
      for (const comment of authored.docs) {
        writer.update(comment.ref, { [field]: targetUid, ...(name ? { [nameField]: name } : {}) })
        comments++
      }
    }
  }

  writer.delete(anonRef)
  await writer.close()
  await getAuth().deleteUser(anonUid)
  return { profile, prefs, comments, reads }
}
