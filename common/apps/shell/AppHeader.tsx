import type { ReactNode } from 'react'
import Link from 'next/link'

interface AppHeaderProps {
  /** Area or app name; omitted for chrome-free routes such as shared decks. */
  title?: string
  /** Where the title links to (the area's root). */
  href?: string
  /** Icon shown in a tile tinted with the current area colour. */
  icon?: ReactNode
  /** Link shown before the title, for example back to the apps hub. */
  parent?: { href: string; label: string }
  /** Right-hand controls: theme toggle, profile menu, sign in. */
  actions?: ReactNode
}

// Sticky top bar of every app (global app.css .app-header).
export function AppHeader({ title, href, icon, parent, actions }: AppHeaderProps) {
  const heading = (
    <>
      {icon && <span className="icon-tile" aria-hidden>{icon}</span>}
      <span className="truncate">{title}</span>
    </>
  )

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="app-header__start">
          {parent && (
            <>
              <Link href={parent.href} className="app-header__parent tap">
                {parent.label}
              </Link>
              <span className="app-header__sep" aria-hidden>/</span>
            </>
          )}
          {title &&
            (href ? (
              <Link href={href} className="app-header__title tap">
                {heading}
              </Link>
            ) : (
              <span className="app-header__title">{heading}</span>
            ))}
        </div>
        {actions && <div className="app-header__actions">{actions}</div>}
      </div>
    </header>
  )
}
