import { FieldValue, getFirestore } from 'firebase-admin/firestore'

// Public post view counter (POST /api/views/:slug).
// postStats/{slug}: { views, updatedAt }. Public read, written only here (rules deny client
// writes). The counter stores nothing about the visitor: no uid, no IP, no cookie.

const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/

/** The slug when it is well formed, else null. */
export function parseViewSlug(path: string): string | null {
  const match = /^\/api\/views\/([^/]+)$/.exec(path)
  return match && SLUG.test(match[1]) ? match[1] : null
}

export async function incrementViews(slug: string): Promise<void> {
  await getFirestore()
    .doc(`postStats/${slug}`)
    .set({ views: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true })
}
