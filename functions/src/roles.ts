import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

// roles/{emailLowercase}: { admin, apps, ladderTrackers, ladderHome? }. Mirrored into custom claims of the
// same names; Firestore rules check the claims plus email_verified. Role ids are always lower case (the
// rules refuse any other id), so every email is lower-cased before it names a role doc.
export interface RoleClaims {
  admin: boolean
  apps: string[]
  ladderTrackers: string[]
  /** The user's own tracker; one of ladderTrackers. Absent means the default (first listed). */
  ladderHome?: string
}

const ROLE_KEYS = ['admin', 'apps', 'ladderTrackers', 'ladderHome'] as const

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

export function roleFromDoc(data: Record<string, unknown> | undefined): RoleClaims | null {
  if (!data) return null
  const role: RoleClaims = {
    admin: data.admin === true,
    apps: stringList(data.apps),
    ladderTrackers: stringList(data.ladderTrackers),
  }
  if (typeof data.ladderHome === 'string' && data.ladderHome) role.ladderHome = data.ladderHome
  return role
}

export function roleId(email: string): string {
  return email.trim().toLowerCase()
}

export async function readRole(email: string): Promise<RoleClaims | null> {
  const snap = await getFirestore().doc(`roles/${roleId(email)}`).get()
  return roleFromDoc(snap.data())
}

/**
 * What POST /api/account/refresh-claims does for a caller: anonymous sessions and tokens without an
 * email have no role ('skip'); an unverified email is refused ('unverified'), since claims grant access
 * only together with email_verified and an unverified address may not belong to the caller.
 */
export function claimsRefreshFor(token: {
  email?: string
  email_verified?: boolean
  firebase: { sign_in_provider: string }
}): 'skip' | 'unverified' | 'apply' {
  if (token.firebase.sign_in_provider === 'anonymous' || !token.email) return 'skip'
  return token.email_verified === true ? 'apply' : 'unverified'
}

/** True when `next` takes away anything `before` granted: admin, an app or a ladder tracker. */
export function accessReduced(before: RoleClaims | null, next: RoleClaims | null): boolean {
  if (!before) return false
  if (before.admin && !next?.admin) return true
  const lost = (had: string[], has: string[] | undefined) => had.some((v) => !has?.includes(v))
  return lost(before.apps, next?.apps) || lost(before.ladderTrackers, next?.ladderTrackers)
}

/**
 * Sets the role claims on a user, keeping any other custom claims. A null role removes them.
 * When access shrinks, the user's refresh tokens are revoked, so a session cannot keep minting ID
 * tokens with the old claims; the user signs in again and gets the new ones.
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
  if (accessReduced(roleFromDoc(existing), role)) await auth.revokeRefreshTokens(uid)
  return true
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}
