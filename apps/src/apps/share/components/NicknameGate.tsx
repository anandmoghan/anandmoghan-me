import { ReactNode, useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { Spinner } from '../../../components/Spinner'

export interface NicknameGateProps {
  children: ReactNode
}

export function NicknameGate({ children }: NicknameGateProps) {
  const { loading, displayName, signInAsGuest } = useAuth()
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <Spinner text="Loading" />
  if (displayName) return <>{children}</>

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = nickname.trim()
    if (!trimmed) return

    setError(null)
    setSubmitting(true)
    try {
      await signInAsGuest(trimmed)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Who&apos;s viewing?</h1>
          <p className="text-muted mt-2 text-sm">Pick a nickname so people know who&apos;s commenting.</p>
        </div>

        <div className="rounded-lg border border-border bg-background p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Nickname"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              required
              maxLength={40}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Continuing...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
