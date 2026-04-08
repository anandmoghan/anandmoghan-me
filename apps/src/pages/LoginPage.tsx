import { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { GoogleLoginButton } from '../components/GoogleLoginButton'

export function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const params = new URLSearchParams(location.search)
  const returnTo = params.get('return') || (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  useEffect(() => {
    if (!loading && user) {
      navigate(returnTo, { replace: true })
    }
  }, [user, loading, navigate, returnTo])

  if (loading) return null

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-muted mt-2 text-sm">
            Use your Google account to access apps.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <GoogleLoginButton onSuccess={() => navigate(returnTo, { replace: true })} />
        </div>
        <p className="text-center text-xs text-muted mt-6">
          <Link to="/" className="hover:text-foreground transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  )
}
