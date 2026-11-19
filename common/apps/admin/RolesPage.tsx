'use client'

import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore'
import { getDb } from '@/common/firebase/client'
import { APP_GLYPH, isGlyphId } from '../icons'
import { apps as registry } from '../registry'
import { Badge } from '../shell/Badge'
import { Card } from '../shell/Card'
import { Field } from '../shell/Field'
import { ListSkeleton } from '../shell/Skeleton'

// roles/{emailLowercase}: { admin, apps, ladderTrackers, ladderHome? }. The syncRoleClaims function mirrors a
// saved role into that user's claims; they pick it up on their next sign-in or token refresh.

interface Role {
  email: string
  admin: boolean
  apps: string[]
  ladderTrackers: string[]
  /** Empty means the default: the only tracker, else the first listed. */
  ladderHome: string
}

// App claims the rules check, plus every registry area. Values already on a role are kept even
// when they are not in this list.
const APP_OPTIONS = Array.from(
  new Set(['family', 'ladder', ...registry.map((a) => a.domain), 'share']),
).filter((a) => a !== 'home')
const TRACKER_OPTIONS = ['anand', 'kavya']

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}

const EMPTY: Role = { email: '', admin: false, apps: [], ladderTrackers: [], ladderHome: '' }

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

/** An app id with its icon when it has one (a stored id may be one this build no longer knows). */
function AppName({ id }: { id: string }) {
  const AppGlyph = isGlyphId(id) ? APP_GLYPH[id] : undefined
  return (
    <span className="inline-flex items-center gap-1">
      {AppGlyph && <AppGlyph size={16} />}
      {id}
    </span>
  )
}

function ChipToggles({ options, selected, onChange, label, appIcons = false }: {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  label: string
  /** Values are app ids: show each app's icon. */
  appIcons?: boolean
}) {
  const all = Array.from(new Set([...options, ...selected]))
  return (
    <div>
      <p className="field-label">{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {all.map((value) => (
          <button
            key={value}
            type="button"
            className="chip"
            aria-pressed={selected.includes(value)}
            onClick={() => onChange(toggle(selected, value))}
          >
            {appIcons ? <AppName id={value} /> : value}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RolesPage() {
  const [roles, setRoles] = useState<Role[] | null>(null)
  const [draft, setDraft] = useState<Role>(EMPTY)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () =>
      onSnapshot(
        collection(getDb(), 'roles'),
        (snap) => {
          setRoles(
            snap.docs
              .map((d) => ({
                email: d.id,
                admin: d.get('admin') === true,
                apps: strings(d.get('apps')),
                ladderTrackers: strings(d.get('ladderTrackers')),
                ladderHome: typeof d.get('ladderHome') === 'string' ? d.get('ladderHome') : '',
              }))
              .sort((a, b) => a.email.localeCompare(b.email)),
          )
        },
        (err) => {
          console.error('Loading roles failed', err)
          setError('Roles could not be loaded.')
        },
      ),
    [],
  )

  const startNew = () => {
    setDraft(EMPTY)
    setEditing(false)
    setError(null)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = draft.email.trim().toLowerCase()
    if (!email.includes('@')) {
      setError('Enter an email address.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await setDoc(doc(getDb(), 'roles', email), {
        admin: draft.admin,
        apps: draft.apps,
        ladderTrackers: draft.ladderTrackers,
        ...(draft.ladderTrackers.includes(draft.ladderHome) ? { ladderHome: draft.ladderHome } : {}),
      })
      startNew()
    } catch (err) {
      console.error('Saving the role failed', err)
      setError('The role could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (email: string) => {
    if (!window.confirm(`Remove the role for ${email}? Their claims are cleared.`)) return
    try {
      await deleteDoc(doc(getDb(), 'roles', email))
      if (draft.email === email) startNew()
    } catch (err) {
      console.error('Removing the role failed', err)
      setError('The role could not be removed.')
    }
  }

  return (
    <div className="site-container space-y-4 py-6">
      <h1 className="text-[1.4rem] font-extrabold">Roles</h1>

      <Card>
        <form onSubmit={save} className="space-y-4">
          <h2 className="font-bold">{editing ? `Edit ${draft.email}` : 'New role'}</h2>
          {!editing && (
            <Field
              label="Email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              required
            />
          )}
          <label className="flex items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={draft.admin}
              onChange={(e) => setDraft({ ...draft, admin: e.target.checked })}
            />
            Admin
          </label>
          <ChipToggles
            label="Apps"
            options={APP_OPTIONS}
            selected={draft.apps}
            onChange={(apps) => setDraft({ ...draft, apps })}
            appIcons
          />
          <ChipToggles
            label="Ladder trackers"
            options={TRACKER_OPTIONS}
            selected={draft.ladderTrackers}
            onChange={(ladderTrackers) => setDraft({ ...draft, ladderTrackers })}
          />
          <div>
            <label className="field-label" htmlFor="ladder-home">
              Home tracker
            </label>
            <select
              id="ladder-home"
              className="field max-w-60"
              value={draft.ladderTrackers.includes(draft.ladderHome) ? draft.ladderHome : ''}
              onChange={(e) => setDraft({ ...draft, ladderHome: e.target.value })}
              disabled={draft.ladderTrackers.length === 0}
            >
              <option value="">Default</option>
              {draft.ladderTrackers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="field-error">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save role'}
            </button>
            {editing && (
              <button type="button" className="btn" onClick={startNew}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>

      {!roles ? (
        <ListSkeleton rows={3} />
      ) : roles.length === 0 ? (
        <p className="text-sm text-muted">No roles yet.</p>
      ) : (
        <ul className="space-y-3">
          {roles.map((role) => (
            <li key={role.email}>
              <Card compact className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="break-all">{role.email}</span>
                    {role.admin && <Badge tone="domain">Admin</Badge>}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    Apps:
                    {role.apps.length > 0 ? role.apps.map((id) => <AppName key={id} id={id} />) : ' none'}
                  </p>
                  <p className="text-xs text-muted">
                    Trackers: {role.ladderTrackers.join(', ') || 'none'}{role.ladderHome ? ` (home ${role.ladderHome})` : ''}.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => {
                      setDraft(role)
                      setEditing(true)
                      setError(null)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    Edit
                  </button>
                  <button type="button" className="btn btn--sm btn--danger" onClick={() => remove(role.email)}>
                    Remove
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
