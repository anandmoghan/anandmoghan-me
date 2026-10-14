import { sendPasswordResetEmail } from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { getFirebaseAuth } from './client'

export const RESET_NEUTRAL_NOTICE = 'If an account exists for that email, a reset link is on its way.'

/**
 * Sends a password reset email whose continue link returns to /login. Resolves with null for
 * every outcome that must not reveal whether the account exists (including user-not-found);
 * resolves with a message only for errors the visitor can act on.
 */
export async function requestPasswordReset(email: string, returnTo: string): Promise<string | null> {
  const url = `${window.location.origin}/login?return=${encodeURIComponent(returnTo)}`
  try {
    await sendPasswordResetEmail(getFirebaseAuth(), email, { url })
    return null
  } catch (err: unknown) {
    const code = err instanceof FirebaseError ? err.code : null
    if (code === 'auth/invalid-email') return 'That email address is not valid.'
    if (code === 'auth/too-many-requests') return 'Too many requests. Please wait a few minutes and try again.'
    if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.'
    return null
  }
}
