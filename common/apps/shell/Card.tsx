import type { HTMLAttributes, ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from './icons'
import type { Domain } from './DomainScope'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** No padding, clipped corners: for images, lists and tables. */
  flush?: boolean
  /** List-row padding. */
  compact?: boolean
}

// Raised surface (global ui.css .card). Pass layout classes only; padding comes from
// the card itself, flush or compact.
export function Card({ flush = false, compact = false, className = '', ...props }: CardProps) {
  const classes = ['card', flush ? 'card--flush' : '', compact ? 'card--compact' : '', className]
    .filter(Boolean)
    .join(' ')
  return <div className={classes} {...props} />
}

interface HubCardProps {
  href: string
  title: string
  icon?: ReactNode
  badge?: ReactNode
  /** One or two summary lines: the key number, today's item, a count. */
  lines?: (string | false | null | undefined)[]
  /** Colours the icon tile with another area's accent. */
  domain?: Domain
}

// A condensed card that links to its own page: icon tile, title with an optional
// badge, up to two summary lines and a chevron.
export function HubCard({ href, title, icon, badge, lines = [], domain }: HubCardProps) {
  const shown = lines.filter((line): line is string => Boolean(line)).slice(0, 2)
  const classes = ['card card--compact tap block h-full w-full', domain ? `domain-${domain}` : '']
    .filter(Boolean)
    .join(' ')

  return (
    <Link href={href} className={classes}>
      <span className="flex h-full min-h-10 w-full items-center gap-3">
        {icon && (
          <span className="icon-tile icon-tile--lg" aria-hidden>
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold leading-snug">{title}</span>
            {badge}
          </span>
          {shown.map((line) => (
            <span key={line} className="line-clamp-2 block text-sm text-muted">
              {line}
            </span>
          ))}
        </span>
        <span className="shrink-0 text-muted" aria-hidden>
          <ChevronRightIcon />
        </span>
      </span>
    </Link>
  )
}
