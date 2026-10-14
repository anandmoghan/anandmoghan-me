import type { ReactNode } from 'react'

export type BadgeTone = 'success' | 'destructive' | 'accent' | 'gold' | 'warn' | 'muted' | 'fg' | 'domain'

// Soft tinted status pill (global ui.css .badge, tones in ui.css and app.css).
export function Badge({ tone = 'muted', pulse = false, children }: { tone?: BadgeTone; pulse?: boolean; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      {pulse && <span className="badge__dot" aria-hidden />}
      {children}
    </span>
  )
}
