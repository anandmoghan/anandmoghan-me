'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { Badge } from '../../shell/Badge'
import { ButtonSpinner } from '../../shell/Skeleton'
import { createRequest, fileUrl, updateJob } from '../data'
import { latestRequest, useLadder } from '../LadderProvider'
import { STATUS_ACTIONS, formatDate, statusPatch } from '../lib'
import type { JobDoc, Rating, RequestDoc } from '../types'

const isPending = (r?: RequestDoc) => r?.status === 'queued' || r?.status === 'running'

// Up and down rating; clicking the active one clears it.
export function RatingToggle({ job }: { job: JobDoc }) {
  const [busy, setBusy] = useState(false)

  async function click(value: Rating) {
    setBusy(true)
    try {
      await updateJob(job.tracker, job.slug, { rating: job.rating === value ? null : value })
    } catch (err) {
      console.error('[ladder] rating failed', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => click('up')}
        disabled={busy}
        aria-pressed={job.rating === 'up'}
        aria-label="Rate up"
        className={job.rating === 'up' ? 'btn btn--sm btn--icon text-success' : 'btn btn--sm btn--icon btn--ghost'}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => click('down')}
        disabled={busy}
        aria-pressed={job.rating === 'down'}
        aria-label="Rate down"
        className={job.rating === 'down' ? 'btn btn--sm btn--icon text-destructive' : 'btn btn--sm btn--icon btn--ghost'}
      >
        ▼
      </button>
    </div>
  )
}

// Asks the worker to re-fetch this job (refresh-job request), and flags the job meanwhile.
export function ReloadButton({ job }: { job: JobDoc }) {
  const { user } = useAuth()
  const { requests } = useLadder()
  const [busy, setBusy] = useState(false)
  const latest = latestRequest(requests, 'refresh-job', job.slug)
  const requested = isPending(latest) || (Boolean(job.refresh_requested) && latest?.status !== 'failed')

  async function click() {
    if (!user) return
    setBusy(true)
    try {
      await createRequest(job.tracker, 'refresh-job', user.uid, job.slug)
      await updateJob(job.tracker, job.slug, { refresh_requested: true })
    } catch (err) {
      console.error('[ladder] refresh request failed', err)
    } finally {
      setBusy(false)
    }
  }

  const title = requested
    ? 'Refresh requested, will update when the worker runs'
    : latest?.status === 'failed'
      ? `Last refresh failed: ${latest.error ?? 'unknown error'}`
      : job.last_refreshed_date
        ? `Reload (last refreshed ${formatDate(job.last_refreshed_date)})`
        : 'Reload'

  return (
    <button
      type="button"
      onClick={click}
      disabled={busy || requested}
      title={title}
      aria-label={title}
      className={requested ? 'btn btn--sm btn--icon btn--soft' : 'btn btn--sm btn--icon btn--ghost'}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={busy ? 'animate-spin' : ''}
        aria-hidden
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    </button>
  )
}

// "Mark as ..." select plus Set, as in the markdown app's status route.
export function StatusActionControl({ job }: { job: JobDoc }) {
  const current = job.progress_stage ?? job.status
  const options = STATUS_ACTIONS.filter((a) => a.value !== current)
  const [choice, setSelected] = useState(options[0]?.value ?? '')
  const [busy, setBusy] = useState(false)
  // After a status change (here or from the worker) the old choice may be the current status.
  const selected = options.some((a) => a.value === choice) ? choice : (options[0]?.value ?? '')

  async function submit() {
    const action = options.find((a) => a.value === selected)
    if (!action) return
    setBusy(true)
    try {
      await updateJob(job.tracker, job.slug, statusPatch(job, action))
    } catch (err) {
      console.error('[ladder] status change failed', err)
    } finally {
      setBusy(false)
    }
  }

  const id = `status-action-${job.slug}`
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Change status
      </label>
      <select id={id} className="field max-w-60" value={selected} onChange={(e) => setSelected(e.target.value)} disabled={busy}>
        {options.map((a) => (
          <option key={a.value} value={a.value}>
            Mark as {a.label}
          </option>
        ))}
      </select>
      <button type="button" onClick={submit} disabled={busy} className="btn btn--outline btn--sm">
        {busy && <ButtonSpinner />}
        {busy ? 'Setting...' : 'Set'}
      </button>
    </div>
  )
}

/** A link to a Storage file, resolved to a download URL once mounted. */
export function FileLink({ path, label, primary = false }: { path: string; label: string; primary?: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setFailed(false)
    fileUrl(path)
      .then((u) => !cancelled && setUrl(u))
      .catch((err) => {
        console.error('[ladder] file URL failed', err)
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [path])

  const classes = primary ? 'btn btn--primary btn--sm' : 'btn btn--outline btn--sm'
  if (failed) return <Badge tone="destructive">{label} unavailable</Badge>
  if (!url) {
    return (
      <span className={classes} aria-disabled="true">
        <ButtonSpinner />
        {label}
      </span>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={classes}>
      {label}
    </a>
  )
}

// Tailored resume and cover letter: links once generated, else a prepare-materials request.
export function PrepareMaterials({ job }: { job: JobDoc }) {
  const { user } = useAuth()
  const { requests } = useLadder()
  const [busy, setBusy] = useState(false)
  const latest = latestRequest(requests, 'prepare-materials', job.slug)

  if (job.resume_pdf || job.cover_letter_pdf) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {job.resume_pdf ? <FileLink path={job.resume_pdf} label="View resume" primary /> : <Badge tone="warn">Resume pending</Badge>}
        {job.cover_letter_pdf ? (
          <FileLink path={job.cover_letter_pdf} label="View cover letter" primary />
        ) : (
          <Badge tone="warn">Cover letter pending</Badge>
        )}
      </div>
    )
  }

  if (isPending(latest) || (!latest && (job.resume_requested || job.cover_letter_requested))) {
    return (
      <Badge tone="warn" pulse={latest?.status === 'running'}>
        Resume and cover letter {latest?.status === 'running' ? 'being prepared' : 'requested, pending'}
      </Badge>
    )
  }

  async function click() {
    if (!user) return
    setBusy(true)
    try {
      await createRequest(job.tracker, 'prepare-materials', user.uid, job.slug)
    } catch (err) {
      console.error('[ladder] prepare materials request failed', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={click} disabled={busy} className="btn btn--primary btn--sm">
        {busy && <ButtonSpinner />}
        {busy ? 'Requesting...' : 'Prepare Resume & Cover Letter'}
      </button>
      {latest?.status === 'failed' && <span className="field-error">Last attempt failed: {latest.error ?? 'unknown error'}</span>}
    </div>
  )
}

const VIEW_THRESHOLD_MS = 10_000

/** Marks the job viewed after its detail has been open for 10 seconds. */
export function ViewedTracker({ job }: { job: JobDoc }) {
  const { tracker, slug, viewed } = job
  useEffect(() => {
    if (viewed) return
    const timer = setTimeout(() => {
      updateJob(tracker, slug, { viewed: true }).catch((err) => console.error('[ladder] marking viewed failed', err))
    }, VIEW_THRESHOLD_MS)
    return () => clearTimeout(timer)
  }, [tracker, slug, viewed])
  return null
}
