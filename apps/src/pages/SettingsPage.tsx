import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../components/ThemeProvider'
import { encryptApiKey } from '../apps/dashboard/services/crypto'

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [savingKey, setSavingKey] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'settings', 'trading212'))
      if (snap.exists() && snap.data().encryptedApiSecret) {
        setHasApiKey(true)
      }
    }
    load()
  }, [user])

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !apiKey.trim() || !apiSecret.trim()) return
    setSavingKey(true)
    setKeyError(null)
    setKeySaved(false)
    try {
      const [{ encryptedApiKey, iv }, { encryptedApiKey: encryptedApiSecret, iv: secretIv }] = await Promise.all([
        encryptApiKey(apiKey.trim()),
        encryptApiKey(apiSecret.trim()),
      ])
      await setDoc(doc(db, 'users', user.uid, 'settings', 'trading212'), {
        encryptedApiKey,
        iv,
        encryptedApiSecret,
        secretIv,
        lastSynced: serverTimestamp(),
      })
      setHasApiKey(true)
      setKeySaved(true)
      setApiKey('')
      setApiSecret('')
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingKey(false)
    }
  }

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: string }> = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-8">Settings</h1>

      {/* Profile */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Profile</h2>
        <div className="rounded-lg border border-border bg-background p-5">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-14 h-14 rounded-full border border-border" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center text-xl font-medium text-background">
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{user?.displayName}</p>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Appearance</h2>
        <div className="rounded-lg border border-border bg-background p-5">
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  theme === opt.value
                    ? 'bg-foreground text-background'
                    : 'border border-border hover:bg-muted/20'
                }`}
              >
                <span>{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trading212 API Key */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-4">Trading212</h2>
        <div className="rounded-lg border border-border bg-background p-5">
          <p className="text-sm text-muted mb-4">
            Your API key is encrypted with AES-GCM before being stored. Only you can decrypt it.
          </p>
          {hasApiKey && (
            <div className="flex items-center gap-2 mb-4 p-3 rounded-md bg-success/10 border border-success/20">
              <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-success">API key is configured</span>
            </div>
          )}
          <form onSubmit={handleSaveApiKey} className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? 'Enter new API key to update' : 'API key'}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showKey ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={hasApiKey ? 'Enter new API secret to update' : 'API secret'}
                className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showSecret ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  )}
                </svg>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={savingKey || !apiKey.trim() || !apiSecret.trim()}
                className="px-4 py-2 text-sm rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {savingKey ? 'Saving...' : hasApiKey ? 'Update Credentials' : 'Save Credentials'}
              </button>
            </div>
            {keyError && <p className="text-sm text-destructive">{keyError}</p>}
            {keySaved && <p className="text-sm text-success">Credentials saved successfully!</p>}
          </form>
          <p className="text-xs text-muted mt-4">
            Get your credentials from Trading212: Settings → API (Beta) → Generate key
          </p>
        </div>
      </section>
    </div>
  )
}
