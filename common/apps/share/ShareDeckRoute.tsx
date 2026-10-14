'use client'

import { Suspense, useEffect, useState } from 'react'
import { Spinner } from '@/common/apps/components/Spinner'
import type { Deck } from './types'
import { deckRegistry } from './decks'
import { DeckViewer } from './components/DeckViewer'

export function ShareDeckRoute({ slug }: { slug: string }) {
  const [deck, setDeck] = useState<Deck | null>(null)

  useEffect(() => {
    let cancelled = false
    setDeck(null)
    deckRegistry[slug]().then((mod) => {
      if (!cancelled) setDeck(mod.default)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (!deck) return <Spinner text="Loading" />

  return (
    <Suspense fallback={<Spinner text="Loading" />}>
      <DeckViewer deck={deck} slug={slug} />
    </Suspense>
  )
}
