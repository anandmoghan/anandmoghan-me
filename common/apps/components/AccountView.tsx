'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '@/common/firebase/AuthProvider'
import { GoogleLoginButton } from './GoogleLoginButton'
import { Spinner } from './Spinner'

const PROVIDER_NAMES: Record<string, string> = {
  'google.com': 'Google',
  password: 'Email and password',
}

function upgradeError(code: string | undefined): string {
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'That email already has an account, and the password does not match.'
  }
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.'
  if (code === 'auth/invalid-email') return 'That email address is not valid.'
  return 'Something went wrong. Please try again.'
}

export function AccountView() {
  const { user, loading, isAnonymous, isAdmin, apps, displayName, upgradeWithEmail, refresh, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (loading) return <Spinner text="Loading" />

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setSubmitting(true)
    try {
      const outcome = await upgradeWithEmail(email, password, name.trim() || undefined)
      setNotice(outcome === 'linked'
        ? 'Account created. Check your inbox for a verification link.'
        : 'Signed in to your existing account.')
    } catch (err: unknown) {
      setError(upgradeError((err as { code?: string }).code))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!user) return
    setError(null)
    try {
      await sendEmailVerification(user)
      setNotice('Verification email sent.')
    } catch {
      setError('Could not send the email. Please try again later.')
    }
  }

  const providers = (user?.providerData ?? []).map(p => PROVIDER_NAMES[p.providerId] ?? p.providerId)

  return (
    <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">Account</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Identity</h2>
        <div className="rounded-lg border border-border bg-background p-5 space-y-2">
          {isAnonymous ? (
            <>
              <p className="font-semibold">Guest{displayName ? ` (${displayName})` : ''}</p>
              <p className="text-sm text-muted">
                You are browsing as a guest.
                Create an account or sign in to keep your comments and settings on any device.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">{user?.displayName || user?.email}</p>
              {user?.email && <p className="text-sm text-muted">{user.email}</p>}
              <p className="text-sm text-muted">Signed in with {providers.join(', ')}</p>
              {user && !user.emailVerified && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-sm text-destructive">Email not verified.</span>
                  <button
                    onClick={handleResend}
                    className="text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/20 transition-colors"
                  >
                    Resend link
                  </button>
                  <button
                    onClick={() => refresh()}
                    className="text-sm font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted/20 transition-colors"
                  >
                    I have verified
                  </button>
                </div>
              )}
              {(isAdmin || apps.length > 0) && (
                <p className="text-sm text-muted">
                  {isAdmin ? 'Admin. ' : ''}
                  {apps.length > 0 ? `Apps: ${apps.join(', ')}` : ''}
                </p>
              )}
            </>
          )}
          {notice && <p className="text-sm">{notice}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </section>

      {isAnonymous ? (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Keep this session</h2>
          <div className="rounded-lg border border-border bg-background p-6 shadow-sm space-y-4">
            <GoogleLoginButton />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleUpgrade} className="space-y-3">
              <input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating account...' : 'Create account with email'}
              </button>
            </form>

            <p className="text-center text-xs text-muted">
              Already have an account?{' '}
              <Link href="/apps/login?return=/apps/account" className="underline hover:text-foreground transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </section>
      ) : (
        <button
          onClick={() => signOut()}
          className="text-sm font-medium px-3 py-1.5 rounded-md border border-border text-destructive hover:bg-muted/20 transition-colors"
        >
          Sign out
        </button>
      )}
    </div>
  )
}
