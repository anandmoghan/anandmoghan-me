// HKDF + AES-GCM, keyed on uid + ENCRYPTION_SECRET.
// Byte-compatible with the Cloudflare worker: salt = utf8(uid),
// info = "trading212-credentials", AES-256-GCM, 12-byte IV,
// ciphertext (with tag) and IV stored as standard base64.

const subtle = globalThis.crypto.subtle

function b64Encode(buf: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...(buf instanceof Uint8Array ? buf : new Uint8Array(buf))))
}

function b64Decode(str: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
}

async function deriveUserKey(encryptionSecret: string, uid: string) {
  const keyMaterial = await subtle.importKey(
    'raw',
    new TextEncoder().encode(encryptionSecret),
    { name: 'HKDF' },
    false,
    ['deriveKey']
  )
  return subtle.deriveKey(
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

export async function encryptCredentials(
  secret: string, uid: string, apiKey: string, apiSecret: string
): Promise<{ ct: string; iv: string }> {
  const key = await deriveUserKey(secret, uid)
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  const plaintext = JSON.stringify({ apiKey, apiSecret })
  const encrypted = await subtle.encrypt(
    { name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)
  )
  return { ct: b64Encode(encrypted), iv: b64Encode(iv) }
}

export async function decryptCredentials(
  secret: string, uid: string, ct: string, iv: string
): Promise<{ apiKey: string; apiSecret: string }> {
  const key = await deriveUserKey(secret, uid)
  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: b64Decode(iv) },
    key,
    b64Decode(ct)
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}
