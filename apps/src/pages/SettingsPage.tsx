import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../components/ThemeProvider'

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

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
    </div>
  )
}
