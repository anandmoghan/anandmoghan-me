'use client'

import { useState } from 'react'
import { ButtonSpinner } from '../../shell/Skeleton'
import { updateJob } from '../data'
import { formatDate, todayIso } from '../lib'
import type { JobDoc } from '../types'

// Dated notes on a job, newest first. Adding one rewrites the whole list (rules check its size).
export function NotesPanel({ job }: { job: JobDoc }) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const notes = job.notes ?? []
  const sorted = notes.map((note, i) => ({ note, i })).sort((a, b) => (a.note.date < b.note.date ? 1 : -1))

  async function add() {
    const value = text.trim()
    if (!value) return
    setSaving(true)
    setError(null)
    try {
      await updateJob(job.tracker, job.slug, { notes: [...notes, { date: todayIso(), text: value }] })
      setText('')
    } catch (err) {
      console.error('[ladder] adding note failed', err)
      setError('Could not save the note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      {sorted.length > 0 && (
        <ul className="space-y-2">
          {sorted.map(({ note, i }) => (
            <li key={i} className="rounded-lg border border-border p-3">
              <p className="text-xs tabular-nums text-muted">{formatDate(note.date)}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{note.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div>
        <label htmlFor={`note-${job.slug}`} className="sr-only">
          Add a note
        </label>
        <textarea
          id={`note-${job.slug}`}
          className="field"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          rows={3}
        />
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={add} disabled={saving || !text.trim()} className="btn btn--primary btn--sm">
            {saving && <ButtonSpinner />}
            {saving ? 'Adding...' : 'Add note'}
          </button>
          {error && <span className="field-error">{error}</span>}
        </div>
      </div>
    </div>
  )
}
