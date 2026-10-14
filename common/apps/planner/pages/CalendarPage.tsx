'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { addDays, addWeeks, format, isSameDay, isSameWeek } from 'date-fns'
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { Card } from '../../shell/Card'
import { COLOUR_VAR, timeAgo, weekDays, weekStart, type Person, type PlannerEvent, type Task } from '../lib'
import { usePlanner } from '../PlannerProvider'
import { useTasks } from '../useTasks'

interface Row extends PlannerEvent {
  person: Person
}

function toEvent(id: string, data: Record<string, unknown>): PlannerEvent {
  const ts = (v: unknown) => (v instanceof Timestamp ? v.toDate() : new Date(0))
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '(no title)',
    start: ts(data.start),
    end: ts(data.end),
    allDay: data.allDay === true,
    location: typeof data.location === 'string' && data.location ? data.location : null,
    calendar: typeof data.calendar === 'string' ? data.calendar : '',
  }
}

// Live events of the shown people in [from, to), keyed by uid; one listener per person.
function useWeekEvents(uids: string[], from: Date, to: Date) {
  const [events, setEvents] = useState<Record<string, PlannerEvent[]>>({})
  const [error, setError] = useState<string | null>(null)
  const uidKey = uids.join(',')

  useEffect(() => {
    const unsubs = uidKey.split(',').filter(Boolean).map((uid) =>
      onSnapshot(
        query(
          collection(getDb(), 'planner', uid, 'events'),
          where('start', '>=', Timestamp.fromDate(from)),
          where('start', '<', Timestamp.fromDate(to)),
          orderBy('start'),
        ),
        (snap) => setEvents((prev) => ({ ...prev, [uid]: snap.docs.map((d) => toEvent(d.id, d.data())) })),
        (err) => {
          console.error('[planner] reading events failed', err)
          setError(err.message)
        },
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [uidKey, from, to])

  return { events, error }
}

// The newest syncedAt per person (one doc, newest first).
function useLastSynced(uids: string[]) {
  const [synced, setSynced] = useState<Record<string, Date | null>>({})
  const uidKey = uids.join(',')

  useEffect(() => {
    const unsubs = uidKey.split(',').filter(Boolean).map((uid) =>
      onSnapshot(
        query(collection(getDb(), 'planner', uid, 'events'), orderBy('syncedAt', 'desc'), limit(1)),
        (snap) => {
          const at = snap.docs[0]?.get('syncedAt')
          setSynced((prev) => ({ ...prev, [uid]: at instanceof Timestamp ? at.toDate() : null }))
        },
        (err) => console.error('[planner] reading sync time failed', err),
      ),
    )
    return () => unsubs.forEach((u) => u())
  }, [uidKey])

  return synced
}

function eventTime(e: PlannerEvent): string {
  return e.allDay ? 'All day' : format(e.start, 'HH:mm')
}

function EventRow({ row }: { row: Row }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="w-14 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-muted">{eventTime(row)}</span>
      <span
        className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: COLOUR_VAR[row.person.colour] }}
        title={row.person.displayName}
      />
      <span className="min-w-0">
        <span className="block font-bold">{row.title}</span>
        <span className="block text-sm text-muted">
          {[row.location, row.calendar, row.person.displayName].filter(Boolean).join(' · ')}
        </span>
      </span>
    </li>
  )
}

function TaskLine({ task, person }: { task: Task; person: Person | undefined }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="w-14 shrink-0 pt-0.5 text-sm font-bold tabular-nums text-muted">
        {task.due && task.dueHasTime ? format(task.due, 'HH:mm') : 'Task'}
      </span>
      {person && (
        <span
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: COLOUR_VAR[person.colour] }}
          title={person.displayName}
        />
      )}
      <Link href="/apps/planner/tasks" className={`min-w-0 font-bold${task.done ? ' text-muted line-through' : ''}`}>
        {task.title}
      </Link>
    </li>
  )
}

export function CalendarPage() {
  const { people, me } = usePlanner()
  const [anchor, setAnchor] = useState(() => weekStart(new Date()))
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const from = anchor
  const to = useMemo(() => addDays(anchor, 7), [anchor])
  const shown = people.filter((p) => !hidden.has(p.uid))
  const shownUids = useMemo(() => shown.map((p) => p.uid), [shown])
  const { events, error } = useWeekEvents(shownUids, from, to)
  const { tasks, error: tasksError } = useTasks(me?.uid ?? '', shownUids)
  const synced = useLastSynced(useMemo(() => people.map((p) => p.uid), [people]))

  const rows: Row[] = shown
    .flatMap((person) => (events[person.uid] ?? []).map((e) => ({ ...e, person })))
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.getTime() - b.start.getTime())

  const dueTasks = shown.flatMap((person) =>
    (tasks[person.uid] ?? []).filter((t) => t.due !== null && t.due >= from && t.due < to).map((t) => ({ task: t, person })),
  )
  const tasksOn = (day: Date) =>
    dueTasks
      .filter(({ task }) => task.due !== null && isSameDay(task.due, day))
      .sort((a, b) => Number(a.task.dueHasTime) - Number(b.task.dueHasTime) || a.task.due!.getTime() - b.task.due!.getTime())

  const now = new Date()
  const onCurrentWeek = isSameWeek(anchor, now, { weekStartsOn: 1 })
  const today = rows.filter((r) => isSameDay(r.start, now))
  const days = weekDays(anchor)

  const toggle = (uid: string) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (!next.delete(uid)) next.add(uid)
      return next
    })

  return (
    <div className="site-container space-y-6 pb-6 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[1.65rem] font-extrabold leading-tight">Calendar</h1>
        <div className="flex items-center gap-2">
          <button type="button" className="chip" onClick={() => setAnchor((a) => addWeeks(a, -1))} aria-label="Previous week">
            Prev
          </button>
          <button type="button" className="chip" onClick={() => setAnchor(weekStart(new Date()))} disabled={onCurrentWeek}>
            Today
          </button>
          <button type="button" className="chip" onClick={() => setAnchor((a) => addWeeks(a, 1))} aria-label="Next week">
            Next
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="People">
        {people.map((p) => (
          <button key={p.uid} type="button" className="chip" aria-pressed={!hidden.has(p.uid)} onClick={() => toggle(p.uid)}>
            <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOUR_VAR[p.colour] }} />
            {p.uid === me?.uid ? 'Me' : p.displayName}
          </button>
        ))}
      </div>

      <p className="text-sm font-bold text-muted">
        {format(from, 'd MMM')} to {format(addDays(from, 6), 'd MMM yyyy')}
      </p>
      {error && <p className="field-error">Could not load events: {error}</p>}
      {tasksError && <p className="field-error">Could not load tasks: {tasksError}</p>}

      {onCurrentWeek && today.length > 0 && (
        <Card>
          <h2 className="mb-1 text-lg font-extrabold">Today</h2>
          <ul className="divide-y divide-border">
            {today.map((r) => (
              <EventRow key={`${r.person.uid}-${r.id}`} row={r} />
            ))}
          </ul>
        </Card>
      )}

      {rows.length === 0 && dueTasks.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Nothing this week. If no calendar has synced yet, set up the iPhone Shortcut in{' '}
            <Link href="/apps/planner/setup" className="font-bold underline">
              Setup
            </Link>
            .
          </p>
        </Card>
      ) : (
        days.map((day) => {
          const dayRows = rows.filter((r) => isSameDay(r.start, day))
          const dayTasks = tasksOn(day)
          if (dayRows.length === 0 && dayTasks.length === 0) return null
          return (
            <section key={day.toISOString()}>
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">
                {isSameDay(day, now) ? 'Today, ' : ''}
                {format(day, 'EEEE d MMM')}
              </h2>
              <ul className="card card--compact divide-y divide-border">
                {dayRows.map((r) => (
                  <EventRow key={`${r.person.uid}-${r.id}`} row={r} />
                ))}
                {dayTasks.map(({ task, person }) => (
                  <TaskLine key={`${task.ownerUid}-${task.id}`} task={task} person={person} />
                ))}
              </ul>
            </section>
          )
        })
      )}

      <p className="text-sm text-muted">
        {people
          .map((p) => {
            const at = synced[p.uid]
            return `${p.uid === me?.uid ? 'Me' : p.displayName}: ${at ? `last synced ${timeAgo(at)}` : 'never synced'}`
          })
          .join(' · ')}
      </p>
    </div>
  )
}
