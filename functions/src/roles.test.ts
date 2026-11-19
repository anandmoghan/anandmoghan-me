import { beforeAll, describe, expect, it } from 'vitest'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { accessReduced, applyRoleClaims, claimsRefreshFor, roleFromDoc, roleId, type RoleClaims } from './roles.js'

const role = (admin: boolean, apps: string[], ladderTrackers: string[] = []): RoleClaims => ({ admin, apps, ladderTrackers })

describe('roleId', () => {
  it('lower-cases and trims emails', () => {
    expect(roleId('  Anand.Moghan@Example.COM ')).toBe('anand.moghan@example.com')
  })
})

describe('claimsRefreshFor', () => {
  const google = { sign_in_provider: 'google.com' }
  it('applies roles only for a verified email', () => {
    expect(claimsRefreshFor({ email: 'a@example.com', email_verified: true, firebase: google })).toBe('apply')
    expect(claimsRefreshFor({ email: 'a@example.com', email_verified: false, firebase: google })).toBe('unverified')
    expect(claimsRefreshFor({ email: 'a@example.com', firebase: { sign_in_provider: 'password' } })).toBe('unverified')
  })

  it('skips anonymous sessions and tokens without an email', () => {
    expect(claimsRefreshFor({ firebase: { sign_in_provider: 'anonymous' } })).toBe('skip')
    expect(claimsRefreshFor({ email_verified: true, firebase: google })).toBe('skip')
  })
})

describe('accessReduced', () => {
  it('is false for a first grant or a widening change', () => {
    expect(accessReduced(null, role(true, ['family']))).toBe(false)
    expect(accessReduced(role(false, ['family']), role(true, ['family', 'ladder'], ['anand']))).toBe(false)
    expect(accessReduced(role(false, ['family']), role(false, ['family']))).toBe(false)
  })

  it('is true when admin, an app or a tracker is taken away, or the role is removed', () => {
    expect(accessReduced(role(true, ['family']), role(false, ['family']))).toBe(true)
    expect(accessReduced(role(false, ['family', 'ladder']), role(false, ['ladder']))).toBe(true)
    expect(accessReduced(role(false, ['ladder'], ['anand', 'kavya']), role(false, ['ladder'], ['anand']))).toBe(true)
    expect(accessReduced(role(false, ['family']), null)).toBe(true)
  })

  it('reads the previous claims the same way as a role doc', () => {
    expect(accessReduced(roleFromDoc({ admin: true, apps: ['x'], other: 1 }), role(false, ['x']))).toBe(true)
  })
})

// Runs against the Auth emulator only (`npm run test:merge` in the repo root).
const EMULATED = !!process.env.FIREBASE_AUTH_EMULATOR_HOST

describe.skipIf(!EMULATED)('applyRoleClaims (emulator)', () => {
  beforeAll(() => {
    if (!getApps().length) initializeApp({ projectId: 'demo-anandmoghan-me' })
  })

  async function validSince(uid: string): Promise<string | undefined> {
    return (await getAuth().getUser(uid)).tokensValidAfterTime
  }

  async function freshUser(uid: string, claims: Record<string, unknown>) {
    await getAuth().createUser({ uid, email: `${uid}@example.com`, emailVerified: true })
    await getAuth().setCustomUserClaims(uid, claims)
    // tokensValidAfterTime has one-second resolution; make a revocation visible.
    await new Promise((r) => setTimeout(r, 1100))
    return validSince(uid)
  }

  it('widening access keeps the sessions and other claims', async () => {
    const before = await freshUser('role-grow', { apps: ['family'], admin: false, ladderTrackers: [], beta: true })
    expect(await applyRoleClaims('role-grow', role(false, ['family', 'ladder']))).toBe(true)
    const user = await getAuth().getUser('role-grow')
    expect(user.customClaims).toMatchObject({ apps: ['family', 'ladder'], beta: true })
    expect(user.tokensValidAfterTime).toBe(before)
  })

  it('removing an app revokes the refresh tokens', async () => {
    const before = await freshUser('role-shrink', { admin: false, apps: ['family', 'ladder'], ladderTrackers: [] })
    expect(await applyRoleClaims('role-shrink', role(false, ['ladder']))).toBe(true)
    expect(await validSince('role-shrink')).not.toBe(before)
  })

  it('revoking admin or deleting the role revokes the refresh tokens', async () => {
    const before = await freshUser('role-admin', { admin: true, apps: [], ladderTrackers: [] })
    expect(await applyRoleClaims('role-admin', null)).toBe(true)
    expect((await getAuth().getUser('role-admin')).customClaims ?? {}).toEqual({})
    expect(await validSince('role-admin')).not.toBe(before)
  })

  it('an unchanged role changes nothing', async () => {
    const before = await freshUser('role-same', { admin: false, apps: ['family'], ladderTrackers: [] })
    expect(await applyRoleClaims('role-same', role(false, ['family']))).toBe(false)
    expect(await validSince('role-same')).toBe(before)
  })
})
