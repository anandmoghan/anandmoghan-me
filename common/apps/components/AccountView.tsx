'use client'

import { useState } from 'react'
import Link from 'next/link'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '@/common/firebase/AuthProvider'
import { RESET_NEUTRAL_NOTICE, requestPasswordReset } from '@/common/firebase/passwordReset'
import { DeleteMyData } from '@/common/visitors/DeleteMyData'
import { NicknameEditor } from '@/common/visitors/NicknameEditor'
import { Card } from '../shell/Card'
import { Field } from '../shell/Field'
import { ButtonSpinner } from '../shell/Skeleton'
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

// The account sections without page chrome: shared by /account and the Settings General tab.
export function AccountPanel() {
  const { user, loading, isAnonymous, isAdmin, apps, upgradeWithEmail, refresh, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      // No name here: the account keeps the profile nickname shown above.
      const outcome = await upgradeWithEmail(email, password)
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

  const hasPassword = user?.providerData.some(p => p.providerId === 'password') ?? false

  const handleResetPassword = async () => {
    if (!user?.email) return
    setError(null)
    setNotice(null)
    const problem = await requestPasswordReset(user.email, '/account')
    if (problem) setError(problem)
    else setNotice(RESET_NEUTRAL_NOTICE)
  }

  const providers = (user?.providerData ?? []).map(p => PROVIDER_NAMES[p.providerId] ?? p.providerId)

  return (
    <>
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Identity</h2>
        <Card className="space-y-2">
          {isAnonymous ? (
            <>
              <NicknameEditor label="Browsing as" />
              <p className="text-sm text-muted">
                You are a guest.
                Create an account to keep your comments, reading history and settings on any device.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">{user?.displayName || user?.email}</p>
              {user?.displayName && user.email && <p className="text-sm text-muted">{user.email}</p>}
              <p className="text-sm text-muted">Signed in with {providers.join(', ')}</p>
              <NicknameEditor label="Commenting as" />
              {hasPassword && (
                <div className="pt-2">
                  <button type="button" onClick={handleResetPassword} className="btn btn--sm">
                    Send password reset email
                  </button>
                </div>
              )}
              {user && !user.emailVerified && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-sm text-destructive">Email not verified.</span>
                  <button type="button" onClick={handleResend} className="btn btn--sm">
                    Resend link
                  </button>
                  <button type="button" onClick={() => refresh()} className="btn btn--sm">
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
        </Card>
      </section>

      {isAnonymous ? (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Create an account</h2>
          <Card className="space-y-4">
            <p className="text-sm text-muted">
              Your comments, reading history and settings stay with you, also when you sign in to an account you already have.
            </p>
            <GoogleLoginButton />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleUpgrade} className="space-y-3">
              <Field
                type="email"
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <Field
                type="password"
                placeholder="Password"
                aria-label="Password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button type="submit" disabled={submitting} aria-busy={submitting} className="btn btn--primary w-full">
                {submitting ? <><ButtonSpinner />Creating account...</> : 'Create account with email'}
              </button>
            </form>

            <p className="text-center text-sm text-muted">
              Already have an account?{' '}
              <Link href="/login?return=/account" className="underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </Card>
        </section>
      ) : (
        <button type="button" onClick={() => signOut()} className="btn btn--sm">
          Sign out
        </button>
      )}

    </>
  )
}

export function AccountView() {
  return (
    <div className="site-container py-10">
      <h1 className="text-2xl font-bold mb-8">Account</h1>
      <AccountPanel />
      <div className="mt-10">
        <DeleteMyData />
      </div>
    </div>
  )
}
