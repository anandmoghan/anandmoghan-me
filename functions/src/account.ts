import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export interface MergeResult {
  prefs: number
  comments: number
}

// Comment collections that hold a uid, as [parent collection, author field].
// posts/{slug}/comments (blog comments) and shareDecks/{slug}/comments (deck comments).
// Each parent is listed and queried per document, so no collection-group index is needed.
const COMMENT_SOURCES: Array<[string, string]> = [
  ['posts', 'uid'],
  ['shareDecks', 'authorUid'],
]

/**
 * Moves what an anonymous session owns to an existing account, then deletes the anonymous
 * user: users/{anon}/prefs docs the target does not have yet, and comments authored by the
 * anonymous uid. The users/{anon} doc and its prefs are deleted.
 */
export async function mergeAnonymousInto(anonUid: string, targetUid: string): Promise<MergeResult> {
  const db = getFirestore()
  const writer = db.bulkWriter()
  let prefs = 0
  let comments = 0

  const anonPrefs = await db.collection(`users/${anonUid}/prefs`).get()
  for (const pref of anonPrefs.docs) {
    const targetRef = db.doc(`users/${targetUid}/prefs/${pref.id}`)
    if (!(await targetRef.get()).exists) {
      writer.set(targetRef, pref.data())
      prefs++
    }
    writer.delete(pref.ref)
  }

  for (const [parent, field] of COMMENT_SOURCES) {
    const parents = await db.collection(parent).listDocuments()
    for (const parentRef of parents) {
      const authored = await parentRef.collection('comments').where(field, '==', anonUid).get()
      for (const comment of authored.docs) {
        writer.update(comment.ref, { [field]: targetUid })
        comments++
      }
    }
  }

  writer.delete(db.doc(`users/${anonUid}`))
  await writer.close()
  await getAuth().deleteUser(anonUid)
  return { prefs, comments }
}
