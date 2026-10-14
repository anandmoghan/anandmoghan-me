'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { GoogleLoginButton } from './GoogleLoginButton'
import { Card } from '../shell/Card'
import { Field } from '../shell/Field'
import { ButtonSpinner } from '../shell/Skeleton'

// Only same-site absolute paths are accepted as a post-login destination.
function safeReturnPath(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'
}

// Reads ?return=, so the page must render this inside <Suspense>.
export function LoginForm() {
  const { user, isAnonymous, loading, signInExisting, upgradeWithEmail } = useAuth()
  const router = useRouter()
  const returnTo = safeReturnPath(useSearchParams().get('return'))

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user && !isAnonymous) {
      router.replace(returnTo)
    }
  }, [user, isAnonymous, loading, router, returnTo])

  if (loading) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'signin') {
        await signInExisting(email, password)
      } else {
        if (!displayName.trim()) {
          setError('Display name is required.')
          return
        }
        await upgradeWithEmail(email, password, displayName.trim())
      }
      router.replace(returnTo)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password.')
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const submitLabel = mode === 'signin' ? 'Sign in' : 'Create account'
  const busyLabel = mode === 'signin' ? 'Signing in...' : 'Creating account...'

  return (
    <div className="flex flex-1 items-center justify-center py-8">
      <div className="w-full max-w-sm px-4">
        <div className="mb-6 text-center">
          <h1 className="text-[1.65rem] font-extrabold leading-tight">{submitLabel}</h1>
          <p className="mt-1 text-[0.95rem] text-muted">
            {isAnonymous
              ? 'Keep your comments and reading history, and use the apps.'
              : 'Comment on posts, keep your reading history, and use the apps.'}
          </p>
        </div>

        <Card>
          <div className="space-y-4">
            <GoogleLoginButton onSuccess={() => router.replace(returnTo)} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'signup' && (
                <Field
                  type="text"
                  placeholder="Display name"
                  aria-label="Display name"
                  autoComplete="name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                />
              )}
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
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                aria-busy={submitting}
                className="btn btn--primary w-full"
              >
                {submitting ? <><ButtonSpinner />{busyLabel}</> : submitLabel}
              </button>
            </form>

            <p className="text-center text-sm text-muted">
              {mode === 'signin' ? (
                <>No account?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(null) }} className="font-semibold text-domain underline underline-offset-2">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(null) }} className="font-semibold text-domain underline underline-offset-2">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </Card>

      </div>
    </div>
  )
}
