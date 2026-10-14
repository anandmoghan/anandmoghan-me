import type { ReactNode } from 'react'
import { Card } from '../shell/Card'

// Titled card of settings rows (global app.css "Settings rows").
export function SettingsCard({ title, danger = false, children }: { title: string; danger?: boolean; children: ReactNode }) {
  return (
    <section>
      <h2 className={`settings-card-title${danger ? ' text-destructive' : ''}`}>{title}</h2>
      <Card className="settings-rows">{children}</Card>
    </section>
  )
}

interface RowProps {
  label: string
  description?: ReactNode
  /** Icon or avatar shown before the label, for rows that stand for an item. */
  leading?: ReactNode
  children?: ReactNode
}

// Label and one-line description on the left, the control on the right; stacked on phones.
export function SettingsRow({ label, description, leading, children }: RowProps) {
  const text = (
    <div className="min-w-0">
      <p className="font-semibold break-words">{label}</p>
      {description && <p className="text-sm text-muted break-words">{description}</p>}
    </div>
  )
  return (
    <div className="settings-row">
      {leading ? (
        <div className="flex min-w-0 items-center gap-3">
          <span className="settings-row__leading" aria-hidden>
            {leading}
          </span>
          {text}
        </div>
      ) : (
        text
      )}
      {children && <div className="settings-row__control">{children}</div>}
    </div>
  )
}

// Compact add form as the last row of a list card: fields grow, the button stays beside them.
export function SettingsFormRow({ children, ...props }: { children: ReactNode; onSubmit?: (e: React.FormEvent) => void }) {
  return (
    <form className="settings-row settings-row--form" {...props}>
      {children}
    </form>
  )
}
