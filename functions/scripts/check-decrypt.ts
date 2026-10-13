// Usage: ENCRYPTION_SECRET=... UID=... GOOGLE_CLOUD_PROJECT=anandmoghan-me \
//   npx tsx scripts/check-decrypt.ts
// Reads t212Creds/{UID} with application default credentials and reports only
// whether it decrypts, plus the last 4 characters of the API key.
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { decryptCredentials } from '../src/crypto.js'

async function main(): Promise<void> {
  const secret = process.env.ENCRYPTION_SECRET
  const uid = process.env.UID
  if (!secret || !uid) {
    console.error('FAILURE: set ENCRYPTION_SECRET and UID in the environment')
    process.exit(2)
  }

  initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT ?? 'anandmoghan-me' })
  const data = (await getFirestore().doc(`t212Creds/${uid}`).get()).data()
  if (!data || typeof data.ct !== 'string' || typeof data.iv !== 'string') {
    console.error('FAILURE: no t212Creds document with ct/iv for this uid')
    process.exit(1)
  }

  try {
    const { apiKey } = await decryptCredentials(secret, uid, data.ct, data.iv)
    console.log(`SUCCESS: decrypted, key ends with ${apiKey.slice(-4)}`)
  } catch {
    console.error('FAILURE: decryption failed (wrong secret or uid, or corrupt data)')
    process.exit(1)
  }
}

main().catch(() => {
  console.error('FAILURE: could not read the credentials document')
  process.exit(1)
})
