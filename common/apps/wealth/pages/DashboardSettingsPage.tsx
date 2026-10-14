'use client'

import { useState } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { useGroups } from '../hooks/useGroups'
import { useInvites } from '../hooks/useInvites'
import { InviteManager } from '../components/InviteManager'
import { Field } from '@/common/apps/shell/Field'
import { SettingsCard, SettingsFormRow, SettingsRow } from '@/common/apps/components/SettingsRows'
import { InlineSpinner } from '@/common/apps/components/Spinner'

export function DashboardSettingsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''

  const { groups, loading: groupsLoading, selectedGroupId, setSelectedGroupId, selectedGroup, createGroup } = useGroups()
  const { sentInvites, receivedInvites, userProfiles, sendInvite, respondToInvite } = useInvites()

  // Group creation
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

      <SettingsCard title="Groups">
        {receivedInvites.length > 0 && (
          <SettingsRow
            label={`${receivedInvites.length} pending invite${receivedInvites.length > 1 ? 's' : ''}`}
            description="Someone invited you to a group."
          >
            <button type="button" onClick={() => setShowInvites(true)} className="btn btn--sm">
              View
            </button>
          </SettingsRow>
        )}
        {groups.length === 0 && (
          <SettingsRow label="No groups yet" description="Create one to share portfolios." />
        )}
        {groups.map((g) => (
          <SettingsRow
            key={g.id}
            label={g.name}
            description={`${g.members.length} member${g.members.length !== 1 ? 's' : ''}`}
          >
            <button
              type="button"
              onClick={() => { setSelectedGroupId(g.id); setShowInvites(true) }}
              className="btn btn--sm"
            >
              Manage
            </button>
          </SettingsRow>
        ))}
        <SettingsFormRow onSubmit={handleCreateGroup}>
          <Field
            label="New group"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g. Family"
          />
          <button
            type="submit"
            disabled={creatingGroup || !newGroupName.trim()}
            className="btn btn--sm btn--primary"
          >
            {creatingGroup ? 'Creating…' : 'Create group'}
          </button>
        </SettingsFormRow>
      </SettingsCard>

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
