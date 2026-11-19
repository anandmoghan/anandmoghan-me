import { addDays, format, startOfWeek } from 'date-fns'
import { PLANNER_API } from '@/common/api/config'

// Planner lives at /apps/planner; the Mac server ingests the iPhone Shortcut under /planner.
export const INGEST_URL = `${PLANNER_API}/ingest`
export const SHORTCUT_URL = `${PLANNER_API}/shortcut`
export const GENERIC_SHORTCUT_PATH = '/apps/planner-calendar-mirror.shortcut'

export const COLOURS = ['a', 'b', 'c', 'd'] as const
export type PlannerColour = (typeof COLOURS)[number]

// Person colours reuse existing area tokens (tokens.css), so they follow light and dark mode.
export const COLOUR_VAR: Record<PlannerColour, string> = {
  a: 'var(--time)',
  b: 'var(--share)',
  c: 'var(--fitness)',
  d: 'var(--updates)',
}

export function isColour(value: unknown): value is PlannerColour {
  return typeof value === 'string' && (COLOURS as readonly string[]).includes(value)
}

export interface Person {
  uid: string
  displayName: string
  colour: PlannerColour
}

export interface PlannerEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  location: string | null
  calendar: string
}

export interface Habit {
  id: string
  name: string
  perWeek: number
  archived: boolean
}

export interface Task {
  id: string
  /** The planner uid of the task's owner. */
  ownerUid: string
  title: string
  notes: string
  due: Date | null
  dueHasTime: boolean
  done: boolean
  shared: boolean
}

export function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** yyyy-mm-dd in local time: the id of a habit day doc. */
export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function timeAgo(date: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  return `${Math.round(hours / 24)} d ago`
}

function base64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** A new Shortcut key: 32 random bytes as base64url, and the sha256 hex that is its doc id. */
export async function newShortcutKey(): Promise<{ key: string; hash: string }> {
  const key = base64Url(crypto.getRandomValues(new Uint8Array(32)))
  return { key, hash: await sha256Hex(key) }
}
