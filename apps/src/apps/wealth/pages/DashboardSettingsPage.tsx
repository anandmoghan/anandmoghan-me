import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { useGroups } from '../hooks/useGroups'
import { useInvites } from '../hooks/useInvites'
import { InviteManager } from '../components/InviteManager'
import { InlineSpinner } from '../../../components/Spinner'

export function DashboardSettingsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const { groups, loading: groupsLoading, selectedGroupId, setSelectedGroupId, selectedGroup, createGroup } = useGroups()
  const { sentInvites, receivedInvites, userProfiles, sendInvite, respondToInvite } = useInvites()

  // Group creation
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Invites panel
  const [showInvites, setShowInvites] = useState(false)

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
