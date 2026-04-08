import { useState } from 'react'
import type { Group, Invite } from '../../../types'

interface Props {
  group: Group | null
  sentInvites: Invite[]
  receivedInvites: Invite[]
  onSendInvite: (groupId: string, groupName: string, email: string) => Promise<void>
  onRespond: (inviteId: string, status: 'accepted' | 'declined', groupId?: string) => Promise<void>
}

export function InviteManager({ group, sentInvites, receivedInvites, onSendInvite, onRespond }: Props) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !email.trim()) return
    setSending(true)
    setError(null)
    setSuccess(false)
    try {
      await onSendInvite(group.id, group.name, email.trim())
      setEmail('')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally {
      setSending(false)
    }
  }

  const groupInvites = group ? sentInvites.filter((i) => i.groupId === group.id) : []

  return (
    <div className="space-y-4">
      {receivedInvites.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Pending Invites</h3>
          <div className="space-y-2">
            {receivedInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background">
                <div>
                  <p className="text-sm font-medium">{invite.groupName}</p>
                  <p className="text-xs text-muted">From {invite.fromName}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRespond(invite.id, 'accepted', invite.groupId)}
                    className="text-xs px-3 py-1 rounded-md bg-success text-success-foreground hover:bg-success/90 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onRespond(invite.id, 'declined')}
                    className="text-xs px-3 py-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {group && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Invite to {group.name}</h3>
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="flex-1 text-sm rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              required
            />
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="text-sm px-4 py-2 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {sending ? '...' : 'Send'}
            </button>
          </form>
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
          {success && <p className="text-xs text-success mt-1">Invite sent!</p>}

          {groupInvites.length > 0 && (
            <div className="mt-3 space-y-1">
              {groupInvites.map((i) => (
                <div key={i.id} className="flex items-center justify-between text-xs py-1">
                  <span className="text-muted">{i.toEmail}</span>
                  <span className={`px-2 py-0.5 rounded-full ${
                    i.status === 'accepted' ? 'bg-success/10 text-success' :
                    i.status === 'declined' ? 'bg-destructive/10 text-destructive' :
                    'bg-muted/20 text-muted'
                  }`}>{i.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
