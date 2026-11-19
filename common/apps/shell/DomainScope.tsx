import type { ReactNode } from 'react'

// App areas with a colour in the global tokens (tokens.css) and a .domain-<name>
// class in app.css. Family areas first, then the site's own apps.
export type Domain =
  | 'home'
  | 'health'
  | 'shopping'
  | 'style'
  | 'updates'
  | 'fitness'
  | 'parenting'
  | 'wealth'
  | 'expense'
  | 'time'
  | 'share'
  | 'ladder'
  | 'materials'
  | 'planner'
  | 'admin'

interface DomainScopeProps {
  domain: Domain
  /** Also mark this element as an app root (.app: app radii, pill buttons). */
  app?: boolean
  className?: string
  children: ReactNode
}

// Points --domain and --accent at one area's colour for everything inside.
export function DomainScope({ domain, app = false, className = '', children }: DomainScopeProps) {
  const classes = [app ? 'app' : '', `domain-${domain}`, className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {children}
    </div>
  )
}
