import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useT212Configured, triggerT212Sync } from '../hooks/useTrading212'
import { useGroups } from '../hooks/useGroups'
import { useInvites } from '../hooks/useInvites'
import { InviteManager } from '../components/InviteManager'
import { InlineSpinner } from '../../../components/Spinner'

const PROXY_BASE = import.meta.env.VITE_T212_PROXY_URL || 'https://t212-proxy.anand-mohan.workers.dev'

import { auth } from '../../../firebase'

async function saveT212Key(apiKey: string, apiSecret: string): Promise<void> {
  const idToken = await auth.currentUser?.getIdToken()
  if (!idToken) throw new Error('Not authenticated')
  const res = await fetch(`${PROXY_BASE}/api/key`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ apiKey, apiSecret }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to save: ${text}`)
  }
}

export function DashboardSettingsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const configured = useT212Configured(uid || undefined)
  const { groups, loading: groupsLoading, selectedGroupId, setSelectedGroupId, selectedGroup, createGroup } = useGroups()
  const { sentInvites, receivedInvites, userProfiles, sendInvite, respondToInvite } = useInvites()

  // T212 key form
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncDone, setSyncDone] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Group creation
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Invites panel
  const [showInvites, setShowInvites] = useState(false)

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apiKey.trim() || !apiSecret.trim()) return
    setSaving(true)
    setKeyError(null)
    setKeySaved(false)
    try {
      await saveT212Key(apiKey.trim(), apiSecret.trim())
      setApiKey('')
      setApiSecret('')
      setKeySaved(true)
      // Auto-trigger sync so data appears immediately
      setSyncing(true)
      setSyncDone(false)
      setSyncError(null)
      try {
        await triggerT212Sync()
        setSyncDone(true)
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : 'Sync failed')
      } finally {
        setSyncing(false)
      }
    } catch (err) {
      setKeyError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncDone(false)
    setSyncError(null)
    try {
      await triggerT212Sync()
      setSyncDone(true)
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setCreatingGroup(true)
    try {
      await createGroup(newGroupName.trim())
      setNewGroupName('')
      setShowCreateGroup(false)
    } finally {
      setCreatingGroup(false)
    }
  }

  if (groupsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <InlineSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 pt-6 space-y-8">

      {/* Trading 212 */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Trading 212</h2>
        <div className="border border-border p-4 space-y-4">

          {configured === true && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-success flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-success">API credentials saved</span>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="text-xs px-3 py-1.5 border border-border hover:bg-muted/20 transition-colors disabled:opacity-50"
              >
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          )}

          {syncDone && (
            <p className="text-xs text-success">Portfolio synced successfully.</p>
          )}
          {syncError && (
            <p className="text-xs text-destructive">{syncError}</p>
          )}

          <form onSubmit={handleSaveKey} className="space-y-3">
            <p className="text-xs text-muted">
              {configured ? 'Update your credentials:' : 'Enter your Trading 212 API key and secret:'}
            </p>

            {/* API Key */}
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={configured ? 'New API key' : 'API key'}
                autoComplete="off"
                className="w-full text-sm border border-border bg-background px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                tabIndex={-1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showKey
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  }
                </svg>
              </button>
            </div>

            {/* API Secret */}
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder={configured ? 'New API secret' : 'API secret'}
                autoComplete="off"
                className="w-full text-sm border border-border bg-background px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
                tabIndex={-1}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {showSecret
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  }
                </svg>
              </button>
            </div>

            <button
              type="submit"
              disabled={saving || !apiKey.trim() || !apiSecret.trim()}
              className="px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving…' : configured ? 'Update Credentials' : 'Save Credentials'}
            </button>

            {keyError && <p className="text-xs text-destructive">{keyError}</p>}
            {keySaved && !keyError && <p className="text-xs text-success">Saved. Syncing portfolio…</p>}
          </form>

          <p className="text-xs text-muted">
            Credentials are encrypted server-side and never stored in plain text.
            Portfolio syncs automatically every 4 hours.
            Get your key from Trading 212: Settings → API (Beta) → Generate key.
          </p>
        </div>
      </div>

      {/* Groups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Groups</h2>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="text-xs px-3 py-1.5 border border-border hover:bg-muted/20 transition-colors"
          >
            + New group
          </button>
        </div>

        {/* Received invites banner */}
        {receivedInvites.length > 0 && (
          <div className="mb-3 p-3 bg-accent/10 border border-accent/20 flex items-center justify-between text-sm">
            <span className="text-xs">
              {receivedInvites.length} pending invite{receivedInvites.length > 1 ? 's' : ''}
            </span>
            <button onClick={() => setShowInvites(true)} className="text-xs font-medium hover:underline">View</button>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="border border-border p-4 text-center text-sm text-muted">
            No groups yet. Create one to share portfolios.
          </div>
        ) : (
          <div className="border border-border divide-y divide-border">
            {groups.map((g) => (
              <div key={g.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-xs text-muted">{g.members.length} member{g.members.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => { setSelectedGroupId(g.id); setShowInvites(true) }}
                  className="text-xs px-3 py-1.5 border border-border hover:bg-muted/20 transition-colors"
                >
                  Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create group modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
          <div className="bg-background border border-border w-full sm:max-w-md">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Create Group</h2>
              <button onClick={() => setShowCreateGroup(false)} className="text-muted hover:text-foreground p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <form onSubmit={handleCreateGroup} className="space-y-3">
                <div>
                  <label className="text-xs text-muted font-medium mb-1 block">Group name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Family"
                    className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="flex-1 py-2.5 text-sm border border-border hover:bg-muted/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingGroup || !newGroupName.trim()}
                    className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
                  >
                    {creatingGroup ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Invites modal */}
      {showInvites && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
          <div className="bg-background border border-border w-full sm:max-w-md max-h-[calc(90vh-4rem)] sm:max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold">Group Invites</h2>
              <button onClick={() => setShowInvites(false)} className="text-muted hover:text-foreground p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <InviteManager
                group={selectedGroup}
                sentInvites={sentInvites}
                receivedInvites={receivedInvites}
                userProfiles={userProfiles}
                onSendInvite={sendInvite}
                onRespond={respondToInvite}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
