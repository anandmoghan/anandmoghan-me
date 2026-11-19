'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import { useAuth } from '@/common/firebase/AuthProvider'
import { Badge } from '../../shell/Badge'
import { Card } from '../../shell/Card'
import { Field } from '../../shell/Field'
import { PageSkeleton, ButtonSpinner } from '../../shell/Skeleton'
import { FileLink } from '../components/JobActions'
import { createRequest, saveProfile, subscribeProfile, subscribeProfileHistory } from '../data'
import { useLadder } from '../LadderProvider'
import {
  CONTRACT_TYPE,
  LABELS,
  MAX_ABOUT,
  MAX_RESUME_TEX,
  MAX_WORK_AUTHORISATION,
  ROLE_TYPE,
  SALARY_PERIOD,
  SENIORITY,
  WORK_MODE,
  emptyProfile,
  normaliseProfile,
  sameProfile,
  validateProfile,
  type ListField,
  type ProfileErrors,
  type ProfileFields,
  type ProfileHistoryEntry,
  type SalaryPeriod,
  type TargetRole,
} from '../profile'
import type { RequestDoc, Tracker } from '../types'

// The tracker profile (ladder/{tracker}/profile/current): the resume LaTeX source and what the
// candidate is looking for. The worker's agents read it for every scrape, fit score and tailored
// resume. Edits stay local until Save writes the whole document; a changed resume also adds a
// history version. Build PDF queues a build-resume request, which compiles the saved resumeTex.

interface SalaryDraft {
  amount: string
  currency: string
  period: SalaryPeriod
}

type FormState = Omit<ProfileFields, 'salaryFloor'> & { salary: SalaryDraft }

function toForm({ salaryFloor, ...rest }: ProfileFields): FormState {
  return {
    ...rest,
    salary: salaryFloor
      ? { amount: String(salaryFloor.amount), currency: salaryFloor.currency, period: salaryFloor.period }
      : { amount: '', currency: 'GBP', period: 'year' },
  }
}

/** The normalised profile; an empty salary amount means no floor. */
function fromForm({ salary, ...rest }: FormState): ProfileFields {
  const amount = salary.amount.trim()
  return normaliseProfile({
    ...rest,
    salaryFloor: amount === '' ? null : { amount: Number(amount), currency: salary.currency, period: salary.period },
  })
}

const isPending = (r?: RequestDoc) => r?.status === 'queued' || r?.status === 'running'

function formatWhen(date: Date | null | undefined): string {
  return date ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'just now'
}

export function ProfilePage() {
  const { tracker, config } = useLadder()
  const [saved, setSaved] = useState<ProfileFields | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tracker) return
    setSaved(undefined)
    setError(null)
    return subscribeProfile(tracker, setSaved, (err) => {
      console.error('[ladder] profile snapshot failed', err)
      setError(err.message)
    })
  }, [tracker])

  return (
    <div className="site-container site-container--wide space-y-6 pb-6 pt-3">
      <header>
        <h1 className="text-[1.65rem] font-extrabold leading-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted">
          {config ? `${config.label}'s` : 'The'} resume and job search preferences. The agents that search, score
          and tailor applications read this, so keep it current.
        </p>
      </header>
      {error && <p className="field-error">Could not load the profile: {error}</p>}
      {tracker && saved !== undefined ? (
        <ProfileEditor key={tracker} tracker={tracker} saved={saved} />
      ) : (
        !error && <PageSkeleton />
      )}
    </div>
  )
}

function ProfileEditor({ tracker, saved }: { tracker: Tracker; saved: ProfileFields | null }) {
  const { user } = useAuth()
  const stored = saved ?? emptyProfile()
  // base is the stored profile the form started from; a newer stored one replaces the form only
  // while there are no local edits.
  const [base, setBase] = useState<ProfileFields>(stored)
  const [form, setForm] = useState<FormState>(() => toForm(stored))
  const [errors, setErrors] = useState<ProfileErrors>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const current = fromForm(form)
  const dirty = !sameProfile(current, base)
  const changedElsewhere = dirty && !sameProfile(stored, base)

  // A new snapshot replaces the form only while there are no local edits (adjusted during render,
  // so the form never shows a stale profile for a frame).
  const [seen, setSeen] = useState<ProfileFields>(stored)
  if (!sameProfile(stored, seen)) {
    setSeen(stored)
    if (!dirty) {
      setBase(stored)
      setForm(toForm(stored))
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  async function save() {
    if (!user) return
    const next = fromForm(form)
    const found = validateProfile(next)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      setMessage({ ok: false, text: 'Fix the highlighted fields first.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      await saveProfile(tracker, user.uid, next, next.resumeTex !== (saved?.resumeTex ?? ''))
      setBase(next)
      setForm(toForm(next))
      setMessage({ ok: true, text: 'Saved' })
      setTimeout(() => setMessage(null), 2000)
    } catch (err) {
      console.error('[ladder] saving profile failed', err)
      setMessage({ ok: false, text: 'Could not save.' })
    } finally {
      setSaving(false)
    }
  }

  const saveBar = (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={save} disabled={saving || !dirty} className="btn btn--primary btn--sm">
        {saving && <ButtonSpinner />}
        {saving ? 'Saving...' : 'Save profile'}
      </button>
      {dirty && !message && <span className="text-sm text-muted">Unsaved changes</span>}
      {message && <span className={message.ok ? 'text-sm text-success' : 'field-error mt-0'}>{message.text}</span>}
      {changedElsewhere && (
        <span className="text-sm text-muted">Someone saved this profile since you started editing; saving replaces it.</span>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {saveBar}
      {saved === null && (
        <Card>
          <p className="text-sm">
            No profile yet. The worker refuses every request for this tracker until one is saved.
          </p>
        </Card>
      )}

      <ResumeSection
        tracker={tracker}
        value={form.resumeTex}
        onChange={(v) => set('resumeTex', v)}
        error={errors.resumeTex}
        savedTex={saved?.resumeTex ?? ''}
        resumeDirty={form.resumeTex !== stored.resumeTex}
      />

      <Section title="About" description="Who you are, in a few sentences an agent can match against a posting.">
        <TextArea
          label="About"
          value={form.about}
          onChange={(v) => set('about', v)}
          max={MAX_ABOUT}
          rows={5}
          error={errors.about}
        />
        <ListArea field="highlights" label="Highlights" hint="Achievements worth leading with." form={form} set={set} errors={errors} />
        <ListArea field="skills" label="Skills" form={form} set={set} errors={errors} />
      </Section>

      <Section title="What you are looking for">
        <TargetRolesEditor roles={form.targetRoles} onChange={(v) => set('targetRoles', v)} error={errors.targetRoles} />
        <div className="grid gap-4 md:grid-cols-2">
          <ListArea field="industries" label="Industries" form={form} set={set} errors={errors} />
          <ListArea field="locations" label="Locations" hint="Cities, regions or countries." form={form} set={set} errors={errors} />
          <ListArea field="companiesPrefer" label="Companies to prefer" form={form} set={set} errors={errors} />
          <ListArea field="companiesAvoid" label="Companies to avoid" form={form} set={set} errors={errors} />
        </div>
        <ChipSet
          label="Work mode"
          options={WORK_MODE}
          value={form.workMode}
          onChange={(v) => set('workMode', v)}
          error={errors.workMode}
        />
        <ChipSet
          label="Contract types"
          options={CONTRACT_TYPE}
          value={form.contractTypes}
          onChange={(v) => set('contractTypes', v)}
          error={errors.contractTypes}
        />
        <SalaryFloorEditor value={form.salary} onChange={(v) => set('salary', v)} error={errors.salaryFloor} />
        <TextArea
          label="Work authorisation"
          hint="Citizenships, visas and whether you need sponsorship."
          value={form.workAuthorisation}
          onChange={(v) => set('workAuthorisation', v)}
          max={MAX_WORK_AUTHORISATION}
          rows={3}
          error={errors.workAuthorisation}
        />
        <ListArea
          field="dealBreakers"
          label="Deal-breakers"
          hint="Anything that rules a job out."
          form={form}
          set={set}
          errors={errors}
        />
      </Section>

      <Section title="Search" description="Where the scout looks and what it searches for.">
        <div className="grid gap-4 md:grid-cols-2">
          <ListArea field="searchSources" label="Search sources" hint="Job boards, career pages, newsletters." form={form} set={set} errors={errors} />
          <ListArea field="keywords" label="Keywords" form={form} set={set} errors={errors} />
        </div>
      </Section>

      {saveBar}
    </div>
  )
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-extrabold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </header>
        {children}
      </section>
    </Card>
  )
}

function Note({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (!error && !hint) return null
  return (
    <p id={id} className={error ? 'field-error' : 'field-hint'}>
      {error ?? hint}
    </p>
  )
}

function TextArea({
  label,
  hint,
  value,
  onChange,
  max,
  rows,
  error,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  max: number
  rows: number
  error?: string
}) {
  const id = useId()
  const counter = `${value.length.toLocaleString()} / ${max.toLocaleString()}`
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea
        id={id}
        className="field"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-note`}
      />
      <Note id={`${id}-note`} error={error} hint={hint ? `${hint} ${counter}` : counter} />
    </div>
  )
}

// A string list edited as one item per line; blank lines are dropped on save.
function ListArea({
  field,
  label,
  hint,
  form,
  set,
  errors,
}: {
  field: ListField
  label: string
  hint?: string
  form: FormState
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  errors: ProfileErrors
}) {
  const id = useId()
  const lines = form[field]
  const count = lines.filter((s) => s.trim()).length
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <textarea
        id={id}
        className="field"
        rows={Math.min(Math.max(lines.length + 1, 3), 10)}
        value={lines.join('\n')}
        onChange={(e) => set(field, e.target.value.split('\n'))}
        aria-invalid={errors[field] ? true : undefined}
        aria-describedby={`${id}-note`}
      />
      <Note id={`${id}-note`} error={errors[field]} hint={`${hint ? `${hint} ` : ''}One per line, ${count} so far.`} />
    </div>
  )
}

function ChipSet<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  options: readonly T[]
  value: T[]
  onChange: (value: T[]) => void
  error?: string
}) {
  const id = useId()
  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className="field-label">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option)
          return (
            <button
              key={option}
              type="button"
              className="chip"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== option) : options.filter((o) => o === option || value.includes(o)))}
            >
              {LABELS[option as keyof typeof LABELS]}
            </button>
          )
        })}
      </div>
      <Note id={`${id}-note`} error={error} />
    </div>
  )
}

function TargetRolesEditor({
  roles,
  onChange,
  error,
}: {
  roles: TargetRole[]
  onChange: (roles: TargetRole[]) => void
  error?: string
}) {
  const update = (index: number, patch: Partial<TargetRole>) =>
    onChange(roles.map((role, i) => (i === index ? { ...role, ...patch } : role)))

  return (
    <div role="group" aria-label="Target roles">
      <p className="field-label">Target roles</p>
      {roles.length === 0 && <p className="text-sm italic text-muted">No target roles yet.</p>}
      <ul className="space-y-2">
        {roles.map((role, index) => (
          <li key={index} className="grid items-center gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field
              aria-label={`Role ${index + 1} title`}
              placeholder="Title, for example Research Engineer"
              value={role.title}
              onChange={(e) => update(index, { title: e.target.value })}
            />
            <select
              aria-label={`Role ${index + 1} seniority`}
              className="field"
              value={role.seniority}
              onChange={(e) => update(index, { seniority: e.target.value as TargetRole['seniority'] })}
            >
              {SENIORITY.map((s) => (
                <option key={s} value={s}>
                  {LABELS[s]}
                </option>
              ))}
            </select>
            <select
              aria-label={`Role ${index + 1} role type`}
              className="field"
              value={role.roleType}
              onChange={(e) => update(index, { roleType: e.target.value as TargetRole['roleType'] })}
            >
              {ROLE_TYPE.map((t) => (
                <option key={t} value={t}>
                  {LABELS[t]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onChange(roles.filter((_, i) => i !== index))}
              aria-label={`Remove role ${index + 1}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="field-error">{error}</p>}
      <button
        type="button"
        className="btn btn--outline btn--sm mt-2"
        onClick={() => onChange([...roles, { title: '', seniority: 'senior', roleType: 'individual_contributor' }])}
      >
        Add role
      </button>
    </div>
  )
}

function SalaryFloorEditor({
  value,
  onChange,
  error,
}: {
  value: SalaryDraft
  onChange: (value: SalaryDraft) => void
  error?: string
}) {
  return (
    <div role="group" aria-label="Salary floor">
      <p className="field-label">Salary floor</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field
          aria-label="Amount"
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="Amount, empty for none"
          value={value.amount}
          onChange={(e) => onChange({ ...value, amount: e.target.value })}
        />
        <Field
          aria-label="Currency"
          placeholder="GBP"
          maxLength={3}
          value={value.currency}
          onChange={(e) => onChange({ ...value, currency: e.target.value.toUpperCase() })}
        />
        <select
          aria-label="Period"
          className="field"
          value={value.period}
          onChange={(e) => onChange({ ...value, period: e.target.value as SalaryPeriod })}
        >
          {SALARY_PERIOD.map((p) => (
            <option key={p} value={p}>
              {LABELS[p]}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="field-error">{error}</p> : <p className="field-hint">Leave the amount empty for no floor.</p>}
    </div>
  )
}

function ResumeSection({
  tracker,
  value,
  onChange,
  error,
  savedTex,
  resumeDirty,
}: {
  tracker: Tracker
  value: string
  onChange: (value: string) => void
  error?: string
  savedTex: string
  resumeDirty: boolean
}) {
  const id = useId()
  const [history, setHistory] = useState<ProfileHistoryEntry[]>([])
  const [historyError, setHistoryError] = useState<string | null>(null)

  useEffect(
    () =>
      subscribeProfileHistory(tracker, setHistory, (err) => {
        console.error('[ladder] resume history snapshot failed', err)
        setHistoryError(err.message)
      }),
    [tracker],
  )

  return (
    <Section
      title="Resume"
      description="The LaTeX source the tailoring agents start from. Saving a changed resume keeps the previous text as a version."
    >
      <div>
        <label htmlFor={id} className="field-label">
          LaTeX source
        </label>
        <textarea
          id={id}
          className="field font-mono text-sm leading-relaxed"
          rows={24}
          wrap="off"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-note`}
        />
        <Note
          id={`${id}-note`}
          error={error}
          hint={`${value.length.toLocaleString()} / ${MAX_RESUME_TEX.toLocaleString()} characters.`}
        />
      </div>

      <BuildPdf tracker={tracker} savedTex={savedTex} resumeDirty={resumeDirty} />

      <details>
        <summary className="cursor-pointer text-sm font-bold">Versions ({history.length})</summary>
        {historyError && <p className="field-error">Could not load versions: {historyError}</p>}
        {history.length === 0 ? (
          <p className="mt-2 text-sm italic text-muted">No saved versions yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-2">
                <span className="text-sm">
                  {formatWhen(entry.savedAt)}
                  <span className="text-muted"> · {entry.resumeTex.length.toLocaleString()} characters</span>
                  {entry.resumeTex === savedTex && <Badge tone="success">Current</Badge>}
                </span>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  disabled={entry.resumeTex === value}
                  onClick={() => onChange(entry.resumeTex)}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="field-hint">Restore puts that text in the editor; save to keep it.</p>
      </details>
    </Section>
  )
}

// Queues a build-resume request and shows the latest build's PDF or error.
function BuildPdf({ tracker, savedTex, resumeDirty }: { tracker: Tracker; savedTex: string; resumeDirty: boolean }) {
  const { user } = useAuth()
  const { requests } = useLadder()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const latest = requests.find((r) => r.type === 'build-resume')
  const pending = isPending(latest)

  async function click() {
    if (!user) return
    setBusy(true)
    setFailed(false)
    try {
      await createRequest(tracker, 'build-resume', user.uid)
    } catch (err) {
      console.error('[ladder] build resume request failed', err)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const blocked = savedTex.trim() === '' ? 'Save a resume first.' : resumeDirty ? 'Save your changes to build them.' : null

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={click} disabled={busy || pending || blocked !== null} className="btn btn--outline btn--sm">
        {busy && <ButtonSpinner />}
        {busy ? 'Requesting...' : 'Build PDF'}
      </button>
      {blocked && <span className="text-sm text-muted">{blocked}</span>}
      {failed && <span className="field-error mt-0">Could not queue the build.</span>}
      {pending && (
        <Badge tone="warn" pulse={latest?.status === 'running'}>
          {latest?.status === 'running' ? 'Building' : 'Build queued'}
        </Badge>
      )}
      {latest?.status === 'failed' && (
        <span className="field-error mt-0">Last build failed: {latest.error ?? 'unknown error'}</span>
      )}
      {latest?.status === 'done' && latest.pdf && (
        <span className="flex flex-wrap items-center gap-2">
          <FileLink path={latest.pdf} label="View PDF" primary />
          <span className="text-sm text-muted">Built {formatWhen(latest.finishedAt)}</span>
        </span>
      )}
    </div>
  )
}
