'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { sendEmailVerification } from 'firebase/auth'
import { useAuth } from '@/common/firebase/AuthProvider'
import { RESET_NEUTRAL_NOTICE, requestPasswordReset } from '@/common/firebase/passwordReset'
import { useTheme } from '@/common/components/ThemeProvider'
import { AnalyticsSwitch } from '@/common/visitors/AnalyticsSwitch'
import { useDeleteMyData } from '@/common/visitors/DeleteMyData'
import { NicknameEditor } from '@/common/visitors/NicknameEditor'
import { Card } from '../shell/Card'
import { Spinner } from './Spinner'

const PROVIDER_NAMES: Record<string, string> = {
  'google.com': 'Google',
  password: 'Email',
}

const THEME_OPTIONS: Array<{ value: 'system' | 'light' | 'dark'; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Cache Storage and service workers are absent in some browsers, so each step is feature-detected.
async function refreshApp() {
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
  window.location.reload()
}

function SettingsCard({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className={`settings-card-title${danger ? ' text-destructive' : ''}`}>{title}</h2>
      <Card className="settings-rows">{children}</Card>
    </section>
  )
}

// Label and one-line description on the left, the control on the right; stacked on phones.
function Row({ label, description, children }: { label: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="settings-row">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {description && <p className="text-sm text-muted break-words">{description}</p>}
      </div>
      {children && <div className="settings-row__control">{children}</div>}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="avatar" aria-hidden>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export function GeneralSettings() {
  const { user, loading, isAnonymous, isAdmin, apps, displayName, refresh, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const deletion = useDeleteMyData()
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Linked providers can change outside this tab (another device, the console), and the cached
  // user only learns of them on reload, so re-read the account once.
  const [providerIds, setProviderIds] = useState<string[] | null>(null)
  useEffect(() => {
    if (!user || user.isAnonymous) return
    let live = true
    user.reload().then(
      () => { if (live) setProviderIds(user.providerData.map((p) => p.providerId)) },
      () => {},
    )
    return () => { live = false }
  }, [user])

  if (loading) return <Spinner text="Loading" />

  const providerKeys = providerIds ?? (user?.providerData ?? []).map((p) => p.providerId)
  const hasPassword = providerKeys.includes('password')
  const providers = providerKeys.map((id) => PROVIDER_NAMES[id] ?? id)

  const handleResend = async () => {
    if (!user) return
    setError(null)
    setNotice(null)
    try {
      await sendEmailVerification(user)
      setNotice('Verification email sent.')
    } catch {
      setError('Could not send the email. Please try again later.')
    }
  }

  const handleResetPassword = async () => {
    if (!user?.email) return
    setError(null)
    setNotice(null)
    const problem = await requestPasswordReset(user.email, '/account')
    if (problem) setError(problem)
    else setNotice(RESET_NEUTRAL_NOTICE)
  }

  const profileName = displayName || user?.displayName || user?.email || 'Guest'

  return (
    <div className="space-y-8">
      <SettingsCard title="Profile">
        <div className="settings-row">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={profileName} />
            <div className="min-w-0">
              <p className="font-semibold break-words">{profileName}</p>
              <p className="text-sm text-muted">
                {isAnonymous ? 'Guest' : (isAdmin ? 'Admin' : 'Member')}
                {apps.length > 0 ? ` · ${apps.join(', ')}` : ''}
              </p>
            </div>
          </div>
        </div>
        <Row label="Nickname" description="Shown on your comments.">
          <NicknameEditor label="Shown as" />
        </Row>
        {isAnonymous ? (
          <Row label="Create an account" description="Keep your comments, reading history and settings on any device.">
            <Link href="/account" className="btn btn--sm btn--primary">
              Create an account
            </Link>
            <Link href="/login?return=/settings" className="btn btn--sm">
              Sign in
            </Link>
          </Row>
        ) : (
          <Row label="Email" description={user?.email ?? 'No email on this account.'}>
            <span className={`badge ${user?.emailVerified ? 'badge--accent' : 'badge--warn'}`}>
              {user?.emailVerified ? 'Verified' : 'Unverified'}
            </span>
            {user && !user.emailVerified && (
              <>
                <button type="button" onClick={handleResend} className="btn btn--sm">
                  Send verification email
                </button>
                <button type="button" onClick={() => refresh()} className="btn btn--sm">
                  I have verified
                </button>
              </>
            )}
          </Row>
        )}
      </SettingsCard>

      {!isAnonymous && (
        <SettingsCard title="Sign-in and security">
          <Row label="Linked accounts" description="How you sign in.">
            {providers.map((name) => (
              <span key={name} className="badge badge--fg">
                {name}
              </span>
            ))}
          </Row>
          {hasPassword && (
            <Row label="Password" description="We email you a link to choose a new one.">
              <button type="button" onClick={handleResetPassword} className="btn btn--sm">
                Send password reset email
              </button>
            </Row>
          )}
          <Row label="Sign out" description="End this session on this device.">
            <button type="button" onClick={() => signOut()} className="btn btn--sm">
              Sign out
            </button>
          </Row>
        </SettingsCard>
      )}

      {(notice || error) && (
        <p className={`text-sm${error ? ' text-destructive' : ''}`} role="status">
          {error ?? notice}
        </p>
      )}

      <SettingsCard title="Appearance">
        <Row label="Theme" description="Follow the device, or pick one.">
          <div role="group" aria-label="Theme" className="segmented">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={theme === opt.value}
                onClick={() => setTheme(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Row>
      </SettingsCard>

      <SettingsCard title="Privacy">
        <AnalyticsSwitch linkToPrivacy />
      </SettingsCard>

      <SettingsCard title="App">
        <Row label="Refresh the app" description="Reload with fresh files after an update; clears cached copies on this device.">
          <button
            type="button"
            disabled={refreshing}
            aria-busy={refreshing}
            onClick={() => {
              setRefreshing(true)
              void refreshApp().catch(() => setRefreshing(false))
            }}
            className="btn btn--sm"
          >
            {refreshing ? 'Refreshing...' : 'Refresh the app'}
          </button>
        </Row>
      </SettingsCard>

      <SettingsCard title="Danger zone" danger>
        <Row
          label="Delete my data"
          description="Deletes your page visits, comments, reading history, profile and this account. This cannot be undone."
        >
          <button
            type="button"
            className="btn btn--sm btn--danger"
            disabled={deletion.disabled}
            onClick={deletion.handleDelete}
          >
            {deletion.busy ? 'Deleting...' : 'Delete my data'}
          </button>
        </Row>
        {deletion.message && <p className="settings-row text-sm">{deletion.message}</p>}
      </SettingsCard>
    </div>
  )
}
