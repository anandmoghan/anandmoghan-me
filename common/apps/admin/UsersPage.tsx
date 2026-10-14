'use client'

import { useCallback, useEffect, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { Badge } from '../shell/Badge'
import { Card } from '../shell/Card'
import { PageSkeleton } from '../shell/Skeleton'
import { formatDateTime } from './format'

const MAX_USERS = 300

interface UserRow {
  uid: string
  isAnonymous: boolean
  displayName: string | null
  email: string | null
  country: string | null
  lastSeenAt: unknown
  firstSeenAt: unknown
  visitCount: number
  consent: string | null
}

function rowFrom(uid: string, d: Record<string, unknown>): UserRow {
  return {
    uid,
    isAnonymous: d.isAnonymous !== false,
    displayName: typeof d.displayName === 'string' ? d.displayName : null,
    email: typeof d.email === 'string' ? d.email : null,
    country: typeof d.country === 'string' ? d.country : null,
    lastSeenAt: d.lastSeenAt,
    firstSeenAt: d.firstSeenAt ?? d.createdAt,
    visitCount: typeof d.visitCount === 'number' ? d.visitCount : 0,
    consent: typeof d.consent === 'string' ? d.consent : null,
  }
}

// users/ by last seen, newest first.
export function UsersPage() {
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const snap = await getDocs(query(collection(getDb(), 'users'), orderBy('createdAt', 'desc'), limit(MAX_USERS)))
      setUsers(snap.docs.map((d) => rowFrom(d.id, d.data())))
    } catch (err) {
      console.error('Loading users failed', err)
      setError('Users could not be loaded.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="site-container py-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }
  if (!users) return <PageSkeleton />

  const signedIn = users.filter((u) => !u.isAnonymous).length

  return (
    <div className="site-container space-y-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[1.4rem] font-extrabold">Users</h1>
        <button type="button" className="btn btn--sm" onClick={load}>
          Refresh
        </button>
      </div>
      <p className="text-sm text-muted">
        {users.length} most recently seen{users.length === MAX_USERS ? ' (limit)' : ''}: {signedIn} signed in,
        {' '}{users.length - signedIn} anonymous.
      </p>

      <Card flush className="overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Last seen</th>
              <th className="px-4 py-3">First seen</th>
              <th className="px-4 py-3 text-right">Visits</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid} className="border-t border-border">
                <td className="px-4 py-2">
                  <div className="font-semibold">{u.displayName || u.email || 'Anonymous'}</div>
                  <div className="text-xs text-muted">
                    {u.email && u.displayName ? `${u.email} · ` : ''}
                    <code>{u.uid.slice(0, 10)}</code>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <span className="flex flex-wrap gap-1">
                    {u.isAnonymous ? <Badge tone="muted">Anonymous</Badge> : <Badge tone="accent">Signed in</Badge>}
                    {u.consent === 'denied' && <Badge tone="warn">Declined</Badge>}
                  </span>
                </td>
                <td className="px-4 py-2">{u.country ?? '-'}</td>
                <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(u.lastSeenAt)}</td>
                <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(u.firstSeenAt)}</td>
                <td className="px-4 py-2 text-right tabular-nums">{u.visitCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
