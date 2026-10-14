'use client'

import { useState } from 'react'
import { ButtonSpinner } from '../../shell/Skeleton'
import { updateJob } from '../data'
import type { ApplyPrepItem, JobDoc } from '../types'

// Application question and answer drafts. Edits stay local until Save writes the whole list.
// The parent keys this by slug, so switching jobs starts from that job's saved items.
export function ApplyPrepEditor({ job }: { job: JobDoc }) {
  const [items, setItems] = useState<ApplyPrepItem[]>(job.apply_prep ?? [])
  const [editing, setEditing] = useState<Set<number>>(new Set())
  const [question, setQuestion] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const updateAnswer = (index: number, answer: string) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, answer } : item)))

  const toggleEdit = (index: number) =>
    setEditing((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  // Indices shift after a delete, so the edit set is cleared rather than remapped.
  const remove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setEditing(new Set())
  }

  function add() {
    const q = question.trim()
    if (!q) return
    setEditing((prev) => new Set(prev).add(items.length))
    setItems((prev) => [...prev, { question: q, answer: '' }])
    setQuestion('')
  }

  async function save() {
    setSaving(true)
    setMessage(null)
    try {
      await updateJob(job.tracker, job.slug, { apply_prep: items })
      setMessage({ ok: true, text: 'Saved' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      console.error('[ladder] saving apply prep failed', err)
      setMessage({ ok: false, text: 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isEditing = editing.has(index) || item.answer.trim() === ''
        const id = `answer-${job.slug}-${index}`
        return (
          <div key={index} className="rounded-lg border border-border p-3">
            <label htmlFor={id} className="text-sm font-bold">
              {item.question}
            </label>
            {isEditing ? (
              <textarea
                id={id}
                className="field mt-2"
                autoComplete="off"
                value={item.answer}
                onChange={(e) => updateAnswer(index, e.target.value)}
                placeholder="Answer"
                rows={4}
                autoFocus={editing.has(index)}
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm">{item.answer}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => toggleEdit(index)} className="btn btn--outline btn--sm">
                {isEditing ? 'Done' : 'Edit'}
              </button>
              <button type="button" onClick={() => navigator.clipboard.writeText(item.answer)} className="btn btn--outline btn--sm">
                Copy answer
              </button>
              <button type="button" onClick={() => remove(index)} className="btn btn--danger btn--sm">
                Delete
              </button>
            </div>
          </div>
        )
      })}

      <div className="rounded-lg border border-dashed border-border p-3">
        <label htmlFor={`new-question-${job.slug}`} className="field-label">
          Add a question
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id={`new-question-${job.slug}`}
            className="field flex-1"
            autoComplete="off"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') add()
            }}
            placeholder="e.g. What's your notice period?"
          />
          <button type="button" onClick={add} className="btn btn--outline">
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn btn--primary btn--sm">
          {saving && <ButtonSpinner />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        {message && <span className={message.ok ? 'text-sm text-success' : 'field-error'}>{message.text}</span>}
      </div>
    </div>
  )
}
