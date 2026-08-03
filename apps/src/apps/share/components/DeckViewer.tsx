import { useEffect, useMemo, useRef, useState } from 'react'
import type { Deck } from '../types'
import { useComments } from '../hooks/useComments'
import { useAuth } from '../../../hooks/useAuth'
import { SlideView } from './SlideView'
import { ActivityPane } from './ActivityPane'
import { CommentDialog } from './CommentDialog'
import '../deck-theme.css'

interface DeckViewerProps {
  deck: Deck
  slug: string
}

interface Pos {
  slideIndex: number
  revealed: number
}

function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function IconFullscreen({ active }: { active: boolean }) {
  return active ? (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
    </svg>
  )
}

function IconContents() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DeckViewer({ deck, slug }: DeckViewerProps) {
  const { commentsByBullet, addComment, deleteComment } = useComments(slug)
  const { user } = useAuth()
  const currentUid = user?.uid ?? null

  const [pos, setPos] = useState<Pos>({ slideIndex: 0, revealed: 0 })
  const [fullscreen, setFullscreen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  const [activityOpen, setActivityOpen] = useState(() => isDesktop)
  const [contentsOpen, setContentsOpen] = useState(false)
  const [activeBulletId, setActiveBulletId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastKeyRef = useRef<{ key: string; time: number } | null>(null)
  const contentsRef = useRef<HTMLDivElement>(null)

  const { slideIndex, revealed } = pos
  const slide = deck.slides[slideIndex]

  const totalSteps = (s: (typeof deck.slides)[number]) => (s.bullets?.length ?? 0) + (s.diagramStages ?? 0)

  const advance = () => {
    setPos((prev) => {
      const currentSlide = deck.slides[prev.slideIndex]
      const steps = totalSteps(currentSlide)
      const canReveal =
        (currentSlide.kind === 'content' || currentSlide.kind === 'split' || currentSlide.kind === 'custom') &&
        prev.revealed < steps
      if (canReveal) return { slideIndex: prev.slideIndex, revealed: prev.revealed + 1 }
      if (prev.slideIndex >= deck.slides.length - 1) return prev
      return { slideIndex: prev.slideIndex + 1, revealed: 0 }
    })
  }

  const back = () => {
    setPos((prev) => {
      if (prev.revealed > 0) return { slideIndex: prev.slideIndex, revealed: prev.revealed - 1 }
      const prevIndex = Math.max(prev.slideIndex - 1, 0)
      const prevSlide = deck.slides[prevIndex]
      return { slideIndex: prevIndex, revealed: totalSteps(prevSlide) }
    })
  }

  const skipToSlide = (direction: 1 | -1) => {
    setPos((prev) => {
      const targetIndex = Math.max(0, Math.min(prev.slideIndex + direction, deck.slides.length - 1))
      const targetSlide = deck.slides[targetIndex]
      return { slideIndex: targetIndex, revealed: totalSteps(targetSlide) }
    })
  }

  const jumpToSlide = (targetSlideIndex: number) => {
    const targetSlide = deck.slides[targetSlideIndex]
    setPos({ slideIndex: targetSlideIndex, revealed: totalSteps(targetSlide) })
    setContentsOpen(false)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return
      }
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (e.key === ' ') e.preventDefault()
        if (e.key === 'ArrowRight') {
          const now = Date.now()
          const isDoublePress = lastKeyRef.current?.key === 'ArrowRight' && now - lastKeyRef.current.time < 400
          lastKeyRef.current = { key: 'ArrowRight', time: now }
          if (isDoublePress) {
            lastKeyRef.current = null
            skipToSlide(1)
            return
          }
        }
        advance()
      } else if (e.key === 'ArrowLeft') {
        const now = Date.now()
        const isDoublePress = lastKeyRef.current?.key === 'ArrowLeft' && now - lastKeyRef.current.time < 400
        lastKeyRef.current = { key: 'ArrowLeft', time: now }
        if (isDoublePress) {
          lastKeyRef.current = null
          skipToSlide(-1)
          return
        }
        back()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deck])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handleChange = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!contentsOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (contentsRef.current && !contentsRef.current.contains(e.target as Node)) {
        setContentsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contentsOpen])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      containerRef.current?.requestFullscreen()
      setActivityOpen(false)
    }
  }

  const bulletMeta = useMemo(() => {
    const map: Record<string, { slideIndex: number; label?: string; text: string }> = {}
    deck.slides.forEach((s, i) => {
      s.bullets?.forEach((b) => {
        map[b.id] = { slideIndex: i, label: b.label, text: b.text }
      })
      s.diagramBlocks?.forEach((b) => {
        map[b.id] = { slideIndex: i, label: b.label, text: b.text }
      })
    })
    return map
  }, [deck])

  return (
    <div
      ref={containerRef}
      className={
        fullscreen
          ? 'sd-root relative h-screen w-screen overflow-hidden'
          : 'sd-root relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] w-full overflow-hidden'
      }
    >
      <div className="sd-interactive-only absolute inset-0 flex">
        <div className="relative h-full min-w-0 flex-1">
          <div className="h-full w-full">
            <SlideView
              slide={slide}
              deckMeta={deck.meta}
              revealedCount={revealed}
              commentsByBullet={commentsByBullet}
              onOpenComment={setActiveBulletId}
              animated={false}
              showComments={!fullscreen}
              fullscreen={fullscreen}
            />
          </div>

          {!fullscreen && !isDesktop && (
            <div className="absolute right-3 top-3 z-30">
              <button
                onClick={() => setActivityOpen((v) => !v)}
                className="sd-pill-labeled"
                aria-label={activityOpen ? 'Close activity' : 'Open activity'}
              >
                <IconActivity />
                <span>Activity</span>
              </button>
            </div>
          )}
        </div>

        <div ref={contentsRef} className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2">
          <div className="sd-float-bar">
            <button onClick={() => setContentsOpen((v) => !v)} className="sd-icon-btn" aria-label="Contents">
              <IconContents />
            </button>
            <button onClick={back} className="sd-icon-btn" aria-label="Previous">
              <IconChevronLeft />
            </button>
            <span className="sd-float-page">
              {slideIndex + 1} / {deck.slides.length}
            </span>
            <button onClick={advance} className="sd-icon-btn" aria-label="Next">
              <IconChevronRight />
            </button>
            <span className="sd-float-divider" />
            <button
              onClick={toggleFullscreen}
              className="sd-icon-btn"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <IconFullscreen active={fullscreen} />
            </button>
            <a href={`/decks/${slug}.pdf`} download className="sd-icon-btn" aria-label="Download as PDF">
              <IconDownload />
            </a>
          </div>

          {contentsOpen && (
            <div className="sd-contents-menu absolute bottom-full left-1/2 mb-2 max-h-80 w-72 -translate-x-1/2 overflow-y-auto rounded-lg border p-2">
              {deck.slides.map((s, i) => (
                <button key={s.id} onClick={() => jumpToSlide(i)} className="sd-contents-item">
                  <span className="sd-contents-index">{i + 1}</span>
                  <span>{s.kind === 'title' ? deck.meta.title : s.subtitle ?? s.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!fullscreen && (isDesktop || activityOpen) && (
          <ActivityPane
            commentsByBullet={commentsByBullet}
            bulletMeta={bulletMeta}
            onSelect={(targetSlideIndex, bulletId) => {
              jumpToSlide(targetSlideIndex)
              if (bulletId) setActiveBulletId(bulletId)
            }}
            onClose={() => setActivityOpen(false)}
            showClose={!isDesktop}
          />
        )}

        {activeBulletId && (
          <CommentDialog
            bulletId={activeBulletId}
            bulletLabel={bulletMeta[activeBulletId]?.label}
            bulletText={bulletMeta[activeBulletId]?.text}
            comments={commentsByBullet[activeBulletId] ?? []}
            currentUid={currentUid}
            onAdd={addComment}
            onDelete={deleteComment}
            onClose={() => setActiveBulletId(null)}
          />
        )}
      </div>

      <div className="sd-print-only">
        {deck.slides.map((s) => (
          <div key={s.id} className="sd-print-slide">
            <SlideView
              slide={s}
              deckMeta={deck.meta}
              revealedCount={totalSteps(s)}
              commentsByBullet={{}}
              onOpenComment={() => {}}
              animated={false}
              showComments={false}
              fullscreen={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
