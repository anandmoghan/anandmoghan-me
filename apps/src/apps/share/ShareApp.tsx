import { useEffect, useState } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import type { Deck } from './types'
import { deckRegistry } from './decks'
import { DeckViewer } from './components/DeckViewer'
import { NicknameGate } from './components/NicknameGate'
import { Spinner } from '../../components/Spinner'

function IndexPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted">Nothing to see here.</p>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted">Not found.</p>
    </div>
  )
}

function DeckRoute() {
  const { slug } = useParams<{ slug: string }>()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [loading, setLoading] = useState(true)

  const loader = slug ? deckRegistry[slug] : undefined

  useEffect(() => {
    if (!loader) {
      setLoading(false)
      return
    }
    setLoading(true)
    setDeck(null)
    loader().then((mod) => setDeck(mod.default)).finally(() => setLoading(false))
  }, [loader])

  if (!loader) return <NotFoundPage />
  if (loading || !deck) return <Spinner text="Loading" />

  return (
    <NicknameGate>
      <DeckViewer deck={deck} slug={slug as string} />
    </NicknameGate>
  )
}

export default function ShareApp() {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  return (
    <Routes>
      <Route index element={<IndexPage />} />
      <Route path=":slug" element={<DeckRoute />} />
    </Routes>
  )
}
