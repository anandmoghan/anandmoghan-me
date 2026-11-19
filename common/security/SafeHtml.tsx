'use client'

import { useMemo } from 'react'
import { sanitizeUntrustedHtml } from './sanitizeHtml'

/**
 * Renders HTML that a person or an agent produced, through the strict allowlist in sanitizeHtml.ts.
 * The static prerender has no DOM to sanitise with, so it renders the empty container and the
 * browser fills it in.
 */
export default function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(() => (typeof window === 'undefined' ? '' : sanitizeUntrustedHtml(html, window)), [html])
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />
}
