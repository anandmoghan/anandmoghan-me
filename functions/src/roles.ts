import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// roles/{emailLowercase}: { admin, apps, ladderTrackers }. Mirrored into custom claims of the
// same names; Firestore rules check the claims plus email_verified.
export interface RoleClaims {
  admin: boolean
  apps: string[]
  ladderTrackers: string[]
}

const ROLE_KEYS = ['admin', 'apps', 'ladderTrackers'] as const

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function roleFromDoc(data: Record<string, unknown> | undefined): RoleClaims | null {
  if (!data) return null
  return {
    admin: data.admin === true,
    apps: stringList(data.apps),
    ladderTrackers: stringList(data.ladderTrackers),
  }
}

export async function readRole(email: string): Promise<RoleClaims | null> {
  const snap = await getFirestore().doc(`roles/${email.toLowerCase()}`).get()
  return roleFromDoc(snap.data())
}

/**
 * Sets the role claims on a user, keeping any other custom claims. A null role removes them.
 * Returns true when the claims changed (the client should then force-refresh its ID token).
 */
export async function applyRoleClaims(uid: string, role: RoleClaims | null): Promise<boolean> {
  const auth = getAuth()
  const existing = (await auth.getUser(uid)).customClaims ?? {}
  const next: Record<string, unknown> = { ...existing }
  for (const key of ROLE_KEYS) delete next[key]
  if (role) Object.assign(next, role)
  if (JSON.stringify(sortKeys(existing)) === JSON.stringify(sortKeys(next))) return false
  await auth.setCustomUserClaims(uid, next)
  return true
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}
