'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/common/firebase/AuthProvider'
import { GoogleLoginButton } from './GoogleLoginButton'

// Only same-site absolute paths are accepted as a post-login destination.
function safeReturnPath(raw: string | null): string {
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/apps'
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

  return (
    <div className="flex items-center justify-center flex-1">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h1>
          <p className="text-muted mt-2 text-sm">
            {mode === 'signin' ? 'Sign in to access your apps.' : 'Create an account to get started.'}
          </p>
          {isAnonymous && (
            <p className="text-muted mt-2 text-sm">
              You are browsing as a guest. Signing in keeps your comments and settings.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-background p-6 shadow-sm space-y-4">
          <GoogleLoginButton onSuccess={() => router.replace(returnTo)} />

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                placeholder="Display name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
              />
            )}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          <p className="text-center text-xs text-muted">
            {mode === 'signin' ? (
              <>No account?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }} className="underline hover:text-foreground transition-colors">
                  Sign up
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null) }} className="underline hover:text-foreground transition-colors">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="text-center text-xs text-muted mt-6">
          <Link href="/apps" className="hover:text-foreground transition-colors">← Back to apps</Link>
        </p>
      </div>
    </div>
  )
}
