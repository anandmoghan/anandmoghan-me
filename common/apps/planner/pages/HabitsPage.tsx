'use client'

import { useEffect, useState } from 'react'
import { addDays, format, isAfter, startOfDay } from 'date-fns'
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useAuth } from '@/common/firebase/AuthProvider'
import { getDb } from '@/common/firebase/client'
import { Card } from '../../shell/Card'
import { Field } from '../../shell/Field'
import { dayKey, weekDays, weekStart, type Habit } from '../lib'

function useHabits(uid: string) {
  const [habits, setHabits] = useState<Habit[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      onSnapshot(
        collection(getDb(), 'planner', uid, 'habits'),
        (snap) =>
          setHabits(
            snap.docs
              .map((d) => ({
                id: d.id,
                name: String(d.get('name') ?? ''),
                perWeek: Number(d.get('perWeek') ?? 1),
                archived: d.get('archived') === true,
              }))
              .filter((h) => !h.archived)
              .sort((a, b) => a.name.localeCompare(b.name)),
          ),
        (err) => {
          console.error('[planner] reading habits failed', err)
          setError(err.message)
        },
      ),
    [uid],
  )

  return { habits, error }
}

function HabitRow({ uid, habit, days }: { uid: string; habit: Habit; days: Date[] }) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<string | null>(null)
  const ref = (id: string) => doc(getDb(), 'planner', uid, 'habits', habit.id, 'days', id)
  const first = dayKey(days[0])
  const last = dayKey(days[6])

  useEffect(
    () =>
      onSnapshot(
        query(
          collection(getDb(), 'planner', uid, 'habits', habit.id, 'days'),
          where(documentId(), '>=', first),
          where(documentId(), '<=', last),
        ),
        (snap) => setDone(new Set(snap.docs.map((d) => d.id))),
        (err) => console.error('[planner] reading ticks failed', err),
      ),
    [uid, habit.id, first, last],
  )

  const toggle = (key: string) =>
    done.has(key) ? deleteDoc(ref(key)) : setDoc(ref(key), { done: true, at: serverTimestamp() })

  const rename = async () => {
    const name = (editing ?? '').trim()
    setEditing(null)
    if (!name || name === habit.name) return
    await updateDoc(doc(getDb(), 'planner', uid, 'habits', habit.id), { name: name.slice(0, 60), updatedAt: serverTimestamp() })
  }

  const archive = () =>
    updateDoc(doc(getDb(), 'planner', uid, 'habits', habit.id), { archived: true, updatedAt: serverTimestamp() })

  const today = startOfDay(new Date())

  return (
    <li className="card card--compact space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editing === null ? (
          <span className="min-w-0">
            <span className="block truncate font-bold">{habit.name}</span>
            <span className="block text-sm text-muted">
              {done.size} of {habit.perWeek} this week
            </span>
          </span>
        ) : (
          <Field
            aria-label="Habit name"
            value={editing}
            maxLength={60}
            autoFocus
            onChange={(e) => setEditing(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && rename()}
          />
        )}
        <span className="flex gap-2">
          {editing === null ? (
            <button type="button" className="chip" onClick={() => setEditing(habit.name)}>
              Rename
            </button>
          ) : (
            <button type="button" className="chip" onClick={rename}>
              Save
            </button>
          )}
          <button type="button" className="chip" onClick={archive}>
            Archive
          </button>
        </span>
      </div>
      <div className="flex gap-2">
        {days.map((day) => {
          const key = dayKey(day)
          const on = done.has(key)
          const future = isAfter(day, today)
          return (
            <button
              key={key}
              type="button"
              className="chip flex-1 justify-center"
              aria-pressed={on}
              disabled={future}
              aria-label={`${habit.name} ${format(day, 'EEEE d MMM')}${on ? ', done' : ''}`}
              onClick={() => toggle(key)}
            >
              {format(day, 'EEEEE')}
            </button>
          )
        })}
      </div>
    </li>
  )
}

function AddHabit({ uid }: { uid: string }) {
  const [name, setName] = useState('')
  const [perWeek, setPerWeek] = useState(3)
  const [busy, setBusy] = useState(false)

  const add = async () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setBusy(true)
    try {
      await setDoc(doc(collection(getDb(), 'planner', uid, 'habits')), {
        name: trimmed.slice(0, 60),
        perWeek,
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setName('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-extrabold">Add a habit</h2>
      <Field label="Name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
      <div>
        <span className="field-label">Times per week</span>
        <div className="flex gap-2" role="group" aria-label="Times per week">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button key={n} type="button" className="chip flex-1 justify-center" aria-pressed={perWeek === n} onClick={() => setPerWeek(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
      <button type="button" className="btn btn--primary" disabled={busy || !name.trim()} onClick={add}>
        Add habit
      </button>
    </Card>
  )
}

export function HabitsPage() {
  const { user } = useAuth()
  const uid = user?.uid ?? ''
  const { habits, error } = useHabits(uid)
  const [anchor] = useState(() => weekStart(new Date()))
  const days = weekDays(anchor)

  return (
    <div className="site-container space-y-6 pb-6 pt-3">
      <div>
        <h1 className="text-[1.65rem] font-extrabold leading-tight">Habits</h1>
        <p className="text-sm text-muted">
          Week of {format(anchor, 'd MMM')} to {format(addDays(anchor, 6), 'd MMM')}. Only you can see your habits.
        </p>
      </div>
      {error && <p className="field-error">Could not load habits: {error}</p>}
      {habits && habits.length === 0 && <p className="text-sm italic text-muted">No habits yet.</p>}
      <ul className="space-y-2">
        {habits?.map((h) => (
          <HabitRow key={h.id} uid={uid} habit={h} days={days} />
        ))}
      </ul>
      <AddHabit uid={uid} />
    </div>
  )
}
