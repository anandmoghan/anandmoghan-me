import { describe, expect, it } from 'vitest'
import { decryptCredentials, encryptCredentials } from './crypto.js'

// ── Verbatim port of the Cloudflare worker's original implementation ─────────

function b64Encode(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
}

function b64Decode(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

async function deriveUserKey(encryptionSecret: string, uid: string) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(encryptionSecret),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(uid),
      info: new TextEncoder().encode('trading212-credentials'),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function workerEncrypt(
  secret: string, uid: string, apiKey: string, apiSecret: string
): Promise<{ ct: string; iv: string }> {
  const key = await deriveUserKey(secret, uid)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = JSON.stringify({ apiKey, apiSecret })
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  )
  return { ct: b64Encode(encrypted), iv: b64Encode(iv) }
}

async function workerDecrypt(
  secret: string, uid: string, ct: string, iv: string
): Promise<{ apiKey: string; apiSecret: string }> {
  const key = await deriveUserKey(secret, uid)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64Decode(iv) },
    key,
    b64Decode(ct)
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}

// ── Tests ────────────────────────────────────────────────────────────────────

const cases = [
  { secret: 'a-32-char-secret-for-testing-0123456789', uid: 'uid123', apiKey: 'key-ABCD', apiSecret: 'sec-xyz' },
  { secret: 's', uid: 'Zk9QmN3pX2aVbC7dEfGhIjKlMnO1', apiKey: 'k', apiSecret: 's' },
  { secret: 'unicode-secret-é中文', uid: 'user/with:odd chars', apiKey: 'kéy☃', apiSecret: 'a'.repeat(500) },
]

describe('crypto compatibility with the worker', () => {
  for (const c of cases) {
    it(`worker encrypt -> new decrypt (uid ${c.uid.slice(0, 8)})`, async () => {
      const { ct, iv } = await workerEncrypt(c.secret, c.uid, c.apiKey, c.apiSecret)
      expect(await decryptCredentials(c.secret, c.uid, ct, iv)).toEqual({ apiKey: c.apiKey, apiSecret: c.apiSecret })
    })

    it(`new encrypt -> worker decrypt (uid ${c.uid.slice(0, 8)})`, async () => {
      const { ct, iv } = await encryptCredentials(c.secret, c.uid, c.apiKey, c.apiSecret)
      expect(await workerDecrypt(c.secret, c.uid, ct, iv)).toEqual({ apiKey: c.apiKey, apiSecret: c.apiSecret })
    })
  }

  it('uses a 12-byte IV', async () => {
    const { iv } = await encryptCredentials('s', 'u', 'k', 'v')
    expect(b64Decode(iv).length).toBe(12)
  })

  it('fails with the wrong uid', async () => {
    const { ct, iv } = await encryptCredentials('s', 'u1', 'k', 'v')
    await expect(decryptCredentials('s', 'u2', ct, iv)).rejects.toThrow()
  })
})
