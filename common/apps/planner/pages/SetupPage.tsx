'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where } from 'firebase/firestore'
import { useAuth } from '@/common/firebase/AuthProvider'
import { getDb } from '@/common/firebase/client'
import { Card } from '../../shell/Card'
import { Field } from '../../shell/Field'
import { COLOURS, COLOUR_VAR, GENERIC_SHORTCUT_PATH, INGEST_URL, SHORTCUT_URL, newShortcutKey } from '../lib'
import { usePlanner } from '../PlannerProvider'

interface KeyRow {
  hash: string
  label: string
  createdAt: Date | null
}

function useKeys(uid: string) {
  const [keys, setKeys] = useState<KeyRow[]>([])
  useEffect(
    () =>
      onSnapshot(
        query(collection(getDb(), 'plannerKeys'), where('uid', '==', uid)),
        (snap) =>
          setKeys(
            snap.docs
              .map((d) => {
                const at = d.get('createdAt')
                return { hash: d.id, label: String(d.get('label') ?? ''), createdAt: at instanceof Timestamp ? at.toDate() : null }
              })
              .sort((a, b) => (b.createdAt?.getTime() ?? Infinity) - (a.createdAt?.getTime() ?? Infinity)),
          ),
        (err) => console.error('[planner] reading keys failed', err),
      ),
    [uid],
  )
  return keys
}

function ColourPicker() {
  const { me, setColour } = usePlanner()
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-extrabold">Your colour</h2>
      <p className="text-sm text-muted">The dot next to your events on the shared calendar.</p>
      <div className="flex gap-2" role="group" aria-label="Colour">
        {COLOURS.map((c) => (
          <button key={c} type="button" className="chip" aria-pressed={me?.colour === c} onClick={() => setColour(c)} aria-label={`Colour ${c}`}>
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: COLOUR_VAR[c] }} />
          </button>
        ))}
      </div>
    </Card>
  )
}

function Keys({ uid }: { uid: string }) {
  const keys = useKeys(uid)
  const [label, setLabel] = useState('')
  const [shown, setShown] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const { user } = useAuth()

  // The Mac signs a .shortcut with the key inside and returns a one-time link to it.
  const download = async () => {
    if (!shown || !user) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await fetch(SHORTCUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ key: shown }),
      })
      const body: unknown = await res.json()
      const url = res.ok && typeof body === 'object' && body !== null && 'url' in body ? (body as { url: unknown }).url : null
      if (typeof url !== 'string') throw new Error(`status ${res.status}`)
      window.location.href = url
    } catch (err) {
      console.error('[planner] shortcut download failed', err)
      setDownloadError('The Mac is offline or the download failed, try again.')
    } finally {
      setDownloading(false)
    }
  }

  const create = async () => {
    const trimmed = label.trim().slice(0, 40)
    if (!trimmed) return
    setBusy(true)
    setError(null)
    try {
      const { key, hash } = await newShortcutKey()
      await setDoc(doc(getDb(), 'plannerKeys', hash), { uid, label: trimmed, createdAt: serverTimestamp() })
      setShown(key)
      setCopied(false)
      setLabel('')
    } catch (err) {
      console.error('[planner] creating key failed', err)
      setError(err instanceof Error ? err.message : 'Could not create the key.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!shown) return
    await navigator.clipboard.writeText(shown)
    setCopied(true)
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-extrabold">Shortcut keys</h2>
      <p className="text-sm text-muted">
        A key lets one Shortcut send your calendar to the server. Make one per phone, and revoke it if the phone is lost.
      </p>

      {shown && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="text-sm font-bold">Your new key</p>
          <code className="block break-all text-sm">{shown}</code>
          <p className="field-error">
            This key is shown once. Copy it now and paste it into the Shortcut; it cannot be shown again.
          </p>
          <button type="button" className="btn btn--primary" disabled={downloading} onClick={download}>
            {downloading ? 'Preparing...' : 'Download the Shortcut'}
          </button>
          {downloadError && <p className="field-error">{downloadError}</p>}
          <span className="flex gap-2">
            <button type="button" className="btn" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button type="button" className="btn" onClick={() => setShown(null)}>
              Done
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field label="Label" placeholder="Anand's iPhone" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary" disabled={busy || !label.trim()} onClick={create}>
          Create key
        </button>
      </div>
      {error && <p className="field-error">{error}</p>}

      {keys.length === 0 ? (
        <p className="text-sm italic text-muted">No keys yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {keys.map((k) => (
            <li key={k.hash} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-bold">{k.label}</span>
                <span className="block text-sm text-muted">{k.createdAt ? `Created ${format(k.createdAt, 'd MMM yyyy')}` : 'Created just now'}</span>
              </span>
              <button type="button" className="chip" onClick={() => deleteDoc(doc(getDb(), 'plannerKeys', k.hash))}>
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function ShortcutSteps() {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-extrabold">iPhone Shortcut</h2>
      <p className="text-sm text-muted">
        Easiest: create a key above and press Download the Shortcut. Or{' '}
        <a href={GENERIC_SHORTCUT_PATH} className="font-bold underline">
          download the generic Shortcut
        </a>
        ; it asks for your key when you add it. To build it by hand, create a shortcut named{' '}
        <strong>Mirror calendar to planner</strong> with these actions.
      </p>
      <ol className="list-decimal space-y-2 pl-5 text-sm">
        <li>Current Date, then Adjust Date: subtract 7 days. Save it as the variable <strong>From</strong>.</li>
        <li>Current Date, then Adjust Date: add 30 days. Save it as the variable <strong>To</strong>.</li>
        <li>Find Calendar Events where Start Date is between From and To (all calendars, limit off).</li>
        <li>
          Repeat with each event: a Dictionary with <code>title</code> (Title), <code>start</code> (Start Date, format ISO 8601),{' '}
          <code>end</code> (End Date, ISO 8601), <code>allDay</code> (Is All Day), <code>location</code> (Location) and{' '}
          <code>calendar</code> (Calendar), then Add to Variable <strong>Events</strong>.
        </li>
        <li>
          A Dictionary with <code>from</code> (From, ISO 8601), <code>to</code> (To, ISO 8601) and <code>events</code> (Events).
        </li>
        <li>
          Get Contents of URL: <code className="break-all">{INGEST_URL}</code>, method POST, Request Body JSON (the dictionary
          from step 5), and a header <code>Authorization</code> with the value <code>Bearer &lt;your key&gt;</code>.
        </li>
      </ol>
      <p className="text-sm text-muted">
        To run it on its own: Automation, Personal Automation, Time of Day (for example 07:00, 13:00 and 19:00), Run
        Immediately. Optionally add a second automation for When the Calendar app is closed.
      </p>
    </Card>
  )
}

export function SetupPage() {
  const { user } = useAuth()
  return (
    <div className="site-container space-y-6 pb-6 pt-3">
      <h1 className="text-[1.65rem] font-extrabold leading-tight">Setup</h1>
      <ColourPicker />
      {user && <Keys uid={user.uid} />}
      <ShortcutSteps />
    </div>
  )
}
