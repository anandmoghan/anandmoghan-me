'use client'

import { useMemo, useState } from 'react'
import { format, isBefore, startOfDay } from 'date-fns'
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import { useAuth } from '@/common/firebase/AuthProvider'
import { getDb } from '@/common/firebase/client'
import { Card } from '../../shell/Card'
import { Field } from '../../shell/Field'
import { COLOUR_VAR, type Person, type Task } from '../lib'
import { usePlanner } from '../PlannerProvider'
import { useTasks } from '../useTasks'

interface Draft {
  title: string
  notes: string
  date: string
  time: string
  shared: boolean
}

const EMPTY_DRAFT: Draft = { title: '', notes: '', date: '', time: '', shared: false }

function draftOf(task: Task): Draft {
  return {
    title: task.title,
    notes: task.notes,
    date: task.due ? format(task.due, 'yyyy-MM-dd') : '',
    time: task.due && task.dueHasTime ? format(task.due, 'HH:mm') : '',
    shared: task.shared,
  }
}

/** The due Timestamp of a draft, or null without a date. A date alone means the start of that day. */
function dueOf(draft: Draft): Timestamp | null {
  if (!draft.date) return null
  const at = new Date(`${draft.date}T${draft.time || '00:00'}`)
  return Number.isNaN(at.getTime()) ? null : Timestamp.fromDate(at)
}

function dueLabel(task: Task): string {
  if (!task.due) return ''
  return format(task.due, task.dueHasTime ? 'EEE d MMM, HH:mm' : 'EEE d MMM')
}

function byDue(a: Task, b: Task): number {
  if (a.due && b.due) return a.due.getTime() - b.due.getTime() || a.title.localeCompare(b.title)
  if (a.due) return -1
  if (b.due) return 1
  return a.title.localeCompare(b.title)
}

function TaskForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: Draft
  submitLabel: string
  onSubmit: (draft: Draft) => Promise<void>
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await onSubmit(draft)
      if (!onCancel) setDraft(EMPTY_DRAFT)
    } catch (err) {
      console.error('[planner] saving task failed', err)
      setError(err instanceof Error ? err.message : 'Could not save the task.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Title" value={draft.title} maxLength={200} onChange={(e) => set('title', e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Due date" type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
        <Field
          label="Time (optional)"
          type="time"
          value={draft.time}
          disabled={!draft.date}
          onChange={(e) => set('time', e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="task-notes" className="field-label">
          Notes
        </label>
        <textarea
          id="task-notes"
          className="field"
          rows={2}
          maxLength={2000}
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5 accent-[var(--domain)]"
          checked={draft.shared}
          onChange={(e) => set('shared', e.target.checked)}
        />
        Share with the household
      </label>
      {error && <p className="field-error">{error}</p>}
      <div className="flex gap-2">
        <button type="button" className="btn btn--primary" disabled={busy || !draft.title.trim()} onClick={submit}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function TaskRow({ task, owner, mine }: { task: Task; owner: Person | undefined; mine: boolean }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = doc(getDb(), 'planner', task.ownerUid, 'tasks', task.id)
  const overdue = !task.done && task.due !== null && isBefore(task.due, task.dueHasTime ? new Date() : startOfDay(new Date()))

  const tick = async () => {
    setError(null)
    try {
      await updateDoc(ref, {
        done: !task.done,
        doneAt: task.done ? null : serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error('[planner] ticking task failed', err)
      setError('Could not update the task.')
    }
  }

  const save = async (draft: Draft) => {
    const due = dueOf(draft)
    await updateDoc(ref, {
      title: draft.title.trim().slice(0, 200),
      notes: draft.notes.trim() ? draft.notes.trim().slice(0, 2000) : deleteField(),
      due: due ?? deleteField(),
      dueHasTime: due !== null && draft.time !== '',
      shared: draft.shared,
      updatedAt: serverTimestamp(),
    })
    setEditing(false)
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    await deleteDoc(ref)
  }

  if (editing) {
    return (
      <li className="card card--compact">
        <TaskForm initial={draftOf(task)} submitLabel="Save" onSubmit={save} onCancel={() => setEditing(false)} />
      </li>
    )
  }

  return (
    <li className="card card--compact space-y-1">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 shrink-0 accent-[var(--domain)]"
          checked={task.done}
          onChange={tick}
          aria-label={`${task.done ? 'Mark not done' : 'Mark done'}: ${task.title}`}
        />
        <span className="min-w-0 flex-1">
          <span className={`block font-bold${task.done ? ' text-muted line-through' : ''}`}>{task.title}</span>
          <span className="block text-sm text-muted">
            {owner && !mine && (
              <span
                className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COLOUR_VAR[owner.colour] }}
                title={owner.displayName}
              />
            )}
            {[
              owner && !mine ? owner.displayName : null,
              dueLabel(task) ? (overdue ? `${dueLabel(task)} (overdue)` : dueLabel(task)) : null,
              mine && task.shared ? 'Shared' : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
          {task.notes && <span className="mt-1 block whitespace-pre-line text-sm">{task.notes}</span>}
        </span>
        {mine && (
          <span className="flex shrink-0 gap-2">
            <button type="button" className="chip" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="chip" onClick={remove}>
              Delete
            </button>
          </span>
        )}
      </div>
      {error && <p className="field-error">{error}</p>}
    </li>
  )
}

export function TasksPage() {
  const { user } = useAuth()
  const { people } = usePlanner()
  const uid = user?.uid ?? ''
  const uids = useMemo(() => people.map((p) => p.uid), [people])
  const { tasks, error } = useTasks(uid, uids)
  const [showDone, setShowDone] = useState(false)

  const all = people.flatMap((p) => tasks[p.uid] ?? [])
  const open = all.filter((t) => !t.done).sort(byDue)
  const done = all.filter((t) => t.done).sort(byDue).reverse()
  const personOf = (t: Task) => people.find((p) => p.uid === t.ownerUid)

  const add = async (draft: Draft) => {
    const due = dueOf(draft)
    const notes = draft.notes.trim()
    await setDoc(doc(collection(getDb(), 'planner', uid, 'tasks')), {
      title: draft.title.trim().slice(0, 200),
      ...(notes ? { notes: notes.slice(0, 2000) } : {}),
      ...(due ? { due } : {}),
      dueHasTime: due !== null && draft.time !== '',
      done: false,
      shared: draft.shared,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  return (
    <div className="site-container space-y-6 pb-6 pt-3">
      <div>
        <h1 className="text-[1.65rem] font-extrabold leading-tight">Tasks</h1>
        <p className="text-sm text-muted">Yours, and the ones the household shares with you.</p>
      </div>
      {error && <p className="field-error">Could not load tasks: {error}</p>}
      {open.length === 0 && <p className="text-sm italic text-muted">Nothing to do.</p>}
      <ul className="space-y-2">
        {open.map((t) => (
          <TaskRow key={`${t.ownerUid}-${t.id}`} task={t} owner={personOf(t)} mine={t.ownerUid === uid} />
        ))}
      </ul>

      <Card className="space-y-3">
        <h2 className="text-lg font-extrabold">Add a task</h2>
        <TaskForm initial={EMPTY_DRAFT} submitLabel="Add task" onSubmit={add} />
      </Card>

      {done.length > 0 && (
        <section className="space-y-2">
          <button type="button" className="chip" aria-expanded={showDone} onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Hide' : 'Show'} done ({done.length})
          </button>
          {showDone && (
            <ul className="space-y-2">
              {done.map((t) => (
                <TaskRow key={`${t.ownerUid}-${t.id}`} task={t} owner={personOf(t)} mine={t.ownerUid === uid} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
