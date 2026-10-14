'use client'

import { useAuth } from '@/common/firebase/AuthProvider'
import { useTheme } from '@/common/components/ThemeProvider'
import { Card } from '../shell/Card'

export function SettingsView() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()

  const themeOptions: Array<{ value: 'light' | 'dark' | 'system'; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ]

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-[1.65rem] font-extrabold leading-tight">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-extrabold">Profile</h2>
        <Card>
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-domain text-xl font-bold text-domain-foreground">
                {(user?.displayName || user?.email || 'U')[0].toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-bold">{user?.displayName}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-extrabold">Appearance</h2>
        <Card>
          <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={theme === opt.value}
                onClick={() => setTheme(opt.value)}
                className="chip"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
