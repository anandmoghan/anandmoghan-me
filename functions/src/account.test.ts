import { beforeAll, describe, expect, it } from 'vitest'
import { getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { mergeAnonymousInto } from './account.js'

// Runs against the Firestore and Auth emulators only (`npm run test:merge` in the repo root);
// skipped by a plain `npm test`, so it never touches a real project.
const EMULATED = !!process.env.FIRESTORE_EMULATOR_HOST && !!process.env.FIREBASE_AUTH_EMULATOR_HOST

describe.skipIf(!EMULATED)('mergeAnonymousInto (emulator)', () => {
  beforeAll(() => {
    if (!getApps().length) initializeApp({ projectId: 'demo-anandmoghan-me' })
  })

  async function seedGuest(anon: string) {
    const db = getFirestore()
    await getAuth().createUser({ uid: anon })
    await db.doc(`users/${anon}`).set({ isAnonymous: true, displayName: 'Bob the guest', consent: 'granted' })
    await db.doc(`users/${anon}/prefs/p`).set({ th: 'dark' })
    await db.doc(`users/${anon}/reads/a-post`).set({ slug: 'a-post', title: 'A post', progress: 0.5 })
    await db.doc(`posts/a-post/comments/c-${anon}`).set({ uid: anon, displayName: 'Bob the guest', body: 'Hi' })
    await db.doc(`shareDecks/deck/comments/s-${anon}`).set({ authorUid: anon, nickname: 'Bob the guest', text: 'Hi' })
  }

  it('moves profile, prefs, reads and comments, then deletes the guest', async () => {
    const db = getFirestore()
    await seedGuest('anon-a')
    // The target signed in first, so it already has a generated name and no consent yet.
    await db.doc('users/target-a').set({ isAnonymous: false, displayName: 'guest-0a1b' })
    await db.doc('users/target-a/reads/a-post').set({ slug: 'a-post', title: 'A post', progress: 1 })

    const result = await mergeAnonymousInto('anon-a', 'target-a')
    expect(result).toEqual({ profile: ['displayName', 'consent'], prefs: 1, comments: 2, reads: 0 })

    const target = (await db.doc('users/target-a').get()).data()
    expect(target).toMatchObject({ displayName: 'Bob the guest', consent: 'granted' })
    expect((await db.doc('users/target-a/prefs/p').get()).data()).toEqual({ th: 'dark' })
    expect((await db.doc('users/target-a/reads/a-post').get()).get('progress')).toBe(1)
    expect((await db.doc('posts/a-post/comments/c-anon-a').get()).data()).toMatchObject({
      uid: 'target-a',
      displayName: 'Bob the guest',
    })
    expect((await db.doc('shareDecks/deck/comments/s-anon-a').get()).data()).toMatchObject({
      authorUid: 'target-a',
      nickname: 'Bob the guest',
    })

    expect((await db.doc('users/anon-a').get()).exists).toBe(false)
    expect((await db.collection('users/anon-a/prefs').get()).empty).toBe(true)
    expect((await db.collection('users/anon-a/reads').get()).empty).toBe(true)
    await expect(getAuth().getUser('anon-a')).rejects.toMatchObject({ code: 'auth/user-not-found' })
  })

  it("keeps the target's own name and consent and renames the guest's comments", async () => {
    const db = getFirestore()
    await seedGuest('anon-b')
    await db.doc('users/target-b').set({ isAnonymous: false, displayName: 'Anand', consent: 'denied' })

    const result = await mergeAnonymousInto('anon-b', 'target-b')
    expect(result.profile).toEqual([])
    expect(result.reads).toBe(1)

    expect((await db.doc('users/target-b').get()).data()).toMatchObject({ displayName: 'Anand', consent: 'denied' })
    expect((await db.doc('posts/a-post/comments/c-anon-b').get()).get('displayName')).toBe('Anand')
    expect((await db.doc('shareDecks/deck/comments/s-anon-b').get()).get('nickname')).toBe('Anand')
  })
})
