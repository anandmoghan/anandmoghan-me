// AES-GCM encryption/decryption using Web Crypto API
// Key is derived from the user's password via PBKDF2 and stored in sessionStorage.
// The password is never stored — only the derived key bytes (for the session duration).
// Even a Firestore admin cannot decrypt without the user's password.

const SESSION_KEY = 'anandmoghan:enc_key'

async function getKey(): Promise<CryptoKey> {
  let stored = localStorage.getItem(SESSION_KEY)
  // Migrate from old sessionStorage location (users who were already signed in)
  if (!stored) {
    const legacy = sessionStorage.getItem(SESSION_KEY)
    if (legacy) {
      localStorage.setItem(SESSION_KEY, legacy)
      stored = legacy
    }
  }
  if (!stored) throw new Error('Session key not found. Please sign in again.')
  const rawKey = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0))
  return window.crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function initEncryptionKey(password: string, uid: string): Promise<void> {
  const encoder = new TextEncoder()
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('apps.anandmoghan.me:' + uid),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const exported = await window.crypto.subtle.exportKey('raw', derivedKey)
  localStorage.setItem(SESSION_KEY, btoa(String.fromCharCode(...new Uint8Array(exported))))
}

export function clearEncryptionKey(): void {
  localStorage.removeItem(SESSION_KEY)
}

export async function encryptApiKey(value: string): Promise<{ encryptedApiKey: string; iv: string }> {
  const key = await getKey()
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  )
  return {
    encryptedApiKey: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  }
}

export async function decryptApiKey(encryptedApiKey: string, iv: string): Promise<string> {
  const key = await getKey()
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0))
  const encryptedBytes = Uint8Array.from(atob(encryptedApiKey), (c) => c.charCodeAt(0))
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    encryptedBytes
  )
  return new TextDecoder().decode(decrypted)
}
