'use client'

import { useState } from 'react'
import { editSession, deleteSession } from '../services/activity'
import type { Category, Session } from '../types'
import { formatDuration, duration } from '../schema'

interface SessionEditModalProps {
  session: Session
  categories: Category[]
  uid: string
  tz: string
  onClose: () => void
}

function dateToInput(date: Date): string {
  // Local ISO string for datetime-local input
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function inputToDate(value: string): Date {
  return new Date(value)
}

export function SessionEditModal({ session, categories, uid, tz, onClose }: SessionEditModalProps) {
  const [categoryId, setCategoryId] = useState(session.categoryId)
  const [startedAt, setStartedAt] = useState(dateToInput(session.startedAt))
  const [endedAt, setEndedAt] = useState(session.endedAt ? dateToInput(session.endedAt) : '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const isActive = session.endedAt === null

  const handleSave = async () => {
    setError('')
    const newStart = inputToDate(startedAt)
    const newEnd = endedAt ? inputToDate(endedAt) : undefined

    if (newEnd && newStart >= newEnd) {
      setError('End time must be after start time.')
      return
    }

    setSaving(true)
    try {
      await editSession(uid, session.id, {
        categoryId,
        startedAt: newStart,
        ...(newEnd ? { endedAt: newEnd } : {}),
      }, tz)
      onClose()
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await deleteSession(uid, session.id, tz)
      onClose()
    } catch (e) {
      setError(String(e))
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
      <div className="bg-background border border-border w-full sm:max-w-md mb-[calc(4rem+env(safe-area-inset-bottom))] sm:mb-0">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Edit Session</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-4">
          {isActive && (
            <div className="text-xs text-muted bg-accent/5 border border-accent/20 p-2">
              This session is currently active. You can change its category or start time.
            </div>
          )}

          {/* Category */}
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Start time */}
          <div>
            <label className="text-xs text-muted font-medium mb-1 block">Start time</label>
            <input
              type="datetime-local"
              value={startedAt}
              onChange={e => setStartedAt(e.target.value)}
              className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* End time — only for sealed sessions */}
          {!isActive && (
            <div>
              <label className="text-xs text-muted font-medium mb-1 block">End time</label>
              <input
                type="datetime-local"
                value={endedAt}
                onChange={e => setEndedAt(e.target.value)}
                className="w-full text-sm border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-xs text-muted mt-1">
                Duration: {endedAt ? formatDuration(duration({ startedAt: inputToDate(startedAt), endedAt: inputToDate(endedAt) })) : '—'}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-border hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 text-sm bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 font-medium"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`w-full py-2.5 text-sm transition-colors disabled:opacity-50 ${
              confirmDelete
                ? 'bg-destructive text-white font-medium'
                : 'text-destructive border border-destructive/30 hover:bg-destructive/10'
            }`}
          >
            {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete?' : 'Delete session'}
          </button>
        </div>
      </div>
    </div>
  )
}
