'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  type DocumentReference,
  collectionGroup,
  deleteDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { Badge } from '../shell/Badge'
import { Card } from '../shell/Card'
import { PageSkeleton } from '../shell/Skeleton'
import { formatDateTime } from './format'

// Newest blog comments across all posts (collection-group query on "comments", index in
// firestore.indexes.json). Share-deck comments share the collection name and are filtered out.
const MAX_COMMENTS = 200

type Filter = 'all' | 'visible' | 'hidden'

interface Row {
  ref: DocumentReference
  slug: string
  displayName: string
  body: string
  status: string
  createdAt: unknown
}

export function CommentsPage() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      onSnapshot(
        query(collectionGroup(getDb(), 'comments'), orderBy('createdAt', 'desc'), limit(MAX_COMMENTS)),
        (snap) => {
          setRows(
            snap.docs
              .filter((d) => d.ref.parent.parent?.parent.id === 'posts')
              .map((d) => ({
                ref: d.ref,
                slug: d.ref.parent.parent?.id ?? '',
                displayName: String(d.get('displayName') ?? ''),
                body: String(d.get('body') ?? ''),
                status: String(d.get('status') ?? 'visible'),
                createdAt: d.get('createdAt'),
              })),
          )
        },
        (err) => {
          console.error('Loading comments failed', err)
          setError('Comments could not be loaded.')
        },
      ),
    [],
  )

  const act = async (action: () => Promise<void>) => {
    setError(null)
    try {
      await action()
    } catch (err) {
      console.error('Moderation failed', err)
      setError('That did not work. Please try again.')
    }
  }

  if (!rows) {
    return error ? (
      <div className="site-container py-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    ) : (
      <PageSkeleton />
    )
  }

  const shown = rows.filter((r) => filter === 'all' || r.status === filter)
  const hiddenCount = rows.filter((r) => r.status === 'hidden').length

  return (
    <div className="site-container space-y-4 py-6">
      <h1 className="text-[1.4rem] font-extrabold">Comments</h1>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
        {(['all', 'visible', 'hidden'] as const).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? `All (${rows.length})` : f === 'hidden' ? `Hidden (${hiddenCount})` : `Visible (${rows.length - hiddenCount})`}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-muted">No comments.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => {
            const hidden = r.status === 'hidden'
            return (
              <li key={r.ref.path}>
                <Card compact className="space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                    <span className="font-bold">{r.displayName}</span>
                    <span className="text-muted">on</span>
                    <Link href={`/posts/${r.slug}#comments`} className="underline">
                      {r.slug}
                    </Link>
                    <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                    {hidden && <Badge tone="warn">Hidden</Badge>}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{r.body}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() => act(() => updateDoc(r.ref, { status: hidden ? 'visible' : 'hidden' }))}
                    >
                      {hidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() => {
                        if (window.confirm('Delete this comment?')) act(() => deleteDoc(r.ref))
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
