import type { JobStatus, ProgressStage } from '../types'

const STEPS: { stage: ProgressStage; label: string }[] = [
  { stage: 'applied', label: 'Applied' },
  { stage: 'online_assessment', label: 'Online Assessment' },
  { stage: 'phone_screen', label: 'Phone Screen' },
  { stage: 'onsite', label: 'Onsite' },
  { stage: 'offer', label: 'Offer' },
]

const EMPTY_CAPTIONS: Partial<Record<JobStatus, string>> = {
  new: 'Not yet applied',
  saved: 'Saved for later, not yet applied',
  archived: 'Archived',
}

function Steps({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => (
        <div key={step.stage} className="flex flex-1 items-center last:flex-none">
          <span
            className={
              i <= current
                ? 'h-2.5 w-2.5 rounded-full bg-success'
                : 'h-2.5 w-2.5 rounded-full border border-border bg-surface'
            }
          />
          {i < STEPS.length - 1 && <span className={i < current ? 'h-px flex-1 bg-success' : 'h-px flex-1 bg-border'} />}
        </div>
      ))}
    </div>
  )
}

// Application progress: applied, assessment, screens, onsite, offer.
export function ProgressBar({ status, stage }: { status: JobStatus; stage?: ProgressStage }) {
  if (status === 'declined' || stage === 'declined') {
    return (
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
        <span className="text-sm font-bold text-destructive">Declined</span>
      </div>
    )
  }

  if (status === 'new' || status === 'saved' || status === 'archived') {
    return (
      <div>
        <Steps current={-1} />
        <p className="mt-1 text-sm text-muted">{EMPTY_CAPTIONS[status]}</p>
      </div>
    )
  }

  const current = stage ? STEPS.findIndex((s) => s.stage === stage) : -1
  return (
    <div>
      <Steps current={current} />
      <div className="mt-1 flex justify-between gap-1 text-xs">
        {STEPS.map((step, i) => (
          <span key={step.stage} className={i <= current ? 'text-foreground' : 'text-muted'}>
            {step.label}
          </span>
        ))}
      </div>
    </div>
  )
}
