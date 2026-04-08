// AES-GCM encryption/decryption using Web Crypto API
// Key is derived from user UID (deterministic but not server-readable without UID)

async function getKey(uid: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(uid),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('apps.anandmoghan.me'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptApiKey(apiKey: string, uid: string): Promise<{ encryptedApiKey: string; iv: string }> {
  const key = await getKey(uid)
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encoder = new TextEncoder()
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  )
  return {
    encryptedApiKey: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

export async function decryptApiKey(encryptedApiKey: string, iv: string, uid: string): Promise<string> {
  const key = await getKey(uid)
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const encryptedBytes = Uint8Array.from(atob(encryptedApiKey), (c) => c.charCodeAt(0))
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedBytes
  )
  return new TextDecoder().decode(decrypted)
}
