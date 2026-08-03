import { Fragment } from 'react'
import type { Slide, DeckMeta } from '../types'
import type { Comment } from '../hooks/useComments'
import { CommentTrigger } from './CommentPopover'

interface SlideViewProps {
  slide: Slide
  deckMeta: DeckMeta
  revealedCount: number
  commentsByBullet: Record<string, Comment[]>
  onOpenComment: (bulletId: string) => void
  animated: boolean
  showComments: boolean
  fullscreen: boolean
}

const PHASE_TITLES = [
  'About',
  'Problem Statement',
  'Technical Approach and Experimentation',
  'Challenges',
  'Results & Evaluation',
  'Ongoing Work',
]

function Meter({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="sd-meter">
      {PHASE_TITLES.map((t, i) => (
        <div key={t} className={`sd-meter-seg${i === activeIndex ? ' active' : ''}`} title={t} />
      ))}
    </div>
  )
}

function EyebrowHeader({ slide, phaseIndex }: { slide: Slide; phaseIndex: number }) {
  return (
    <div className="sd-eyebrow-row">
      <div className="sd-eyebrow">{slide.subtitle ?? slide.title}</div>
      <Meter activeIndex={phaseIndex} />
    </div>
  )
}

function Footnote({ footnote }: { footnote: Slide['footnote'] }) {
  if (!footnote) return null
  return (
    <div className="sd-footnote">
      {footnote.href ? (
        <a href={footnote.href} target="_blank" rel="noopener noreferrer">
          {footnote.text}
        </a>
      ) : (
        footnote.text
      )}
    </div>
  )
}

function BulletList({
  bullets,
  commentsByBullet,
  onOpenComment,
  animated,
  showComments,
}: {
  bullets: NonNullable<Slide['bullets']>
  commentsByBullet: Record<string, Comment[]>
  onOpenComment: (bulletId: string) => void
  animated: boolean
  showComments: boolean
}) {
  let lastSection: string | undefined
  return (
    <ul className="sd-points">
      {bullets.map((bullet) => {
        const comments = commentsByBullet[bullet.id] ?? []
        const showSectionHeading = !!bullet.section && bullet.section !== lastSection
        lastSection = bullet.section
        return (
          <Fragment key={bullet.id}>
            {showSectionHeading && <li className="sd-section-heading">{bullet.section}</li>}
            <li className={`group${animated ? ' share-fade-in' : ''}`}>
              {showComments && (
                <span className="sd-point-gutter">
                  <CommentTrigger bulletId={bullet.id} comments={comments} onOpen={onOpenComment} />
                </span>
              )}
              <span className="sd-point-text">
                {bullet.label && <span className="sd-lead">{bullet.label}</span>}
                {bullet.text}
              </span>
            </li>
          </Fragment>
        )
      })}
    </ul>
  )
}

export function SlideView({
  slide,
  deckMeta,
  revealedCount,
  commentsByBullet,
  onOpenComment,
  animated,
  showComments,
  fullscreen,
}: SlideViewProps) {
  const bulletCount = slide.bullets?.length ?? 0
  const revealedBullets = slide.bullets?.slice(0, revealedCount) ?? []
  const diagramStage =
    slide.kind === 'split' ? (revealedCount > 0 ? Infinity : 0) : Math.max(0, revealedCount - bulletCount)
  const phaseIndex = PHASE_TITLES.indexOf(slide.title ?? '')
  const footnoteVisible =
    !slide.footnote || !slide.footnoteAfterBulletId || revealedBullets.some((b) => b.id === slide.footnoteAfterBulletId)

  if (slide.kind === 'title') {
    const [authorName, authorRole] = deckMeta.author.split(' — ')
    return (
      <div className="sd-root flex h-full w-full flex-col overflow-auto">
        <div className="flex flex-1 flex-col items-start justify-center px-8 py-10 sm:px-16">
          <div className="sd-cover-title-band">
            <h1>{deckMeta.title}</h1>
          </div>
          <div className="sd-cover-byline">
            {authorName}
            {authorRole && (
              <>
                <br />
                <span className="sd-role">{authorRole}</span>
              </>
            )}
          </div>
          <div className="sd-cover-rule" />
          <div className="sd-cover-institute">{deckMeta.institute}</div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`sd-root flex h-full w-full flex-col overflow-hidden px-8 pb-20 sm:px-16 ${fullscreen ? 'pt-16' : 'pt-8'}`}
    >
      <EyebrowHeader slide={slide} phaseIndex={phaseIndex} />
      <h1 className="sd-headline">{slide.title}</h1>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {slide.kind === 'content' && (
          <BulletList
            bullets={revealedBullets}
            commentsByBullet={commentsByBullet}
            onOpenComment={onOpenComment}
            animated={animated}
            showComments={showComments}
          />
        )}

        {slide.kind === 'split' && (
          <div className="sd-split-row h-full">
            <div className="sd-col-text">
              <BulletList
                bullets={revealedBullets}
                commentsByBullet={commentsByBullet}
                onOpenComment={onOpenComment}
                animated={animated}
                showComments={showComments}
              />
            </div>
            <div className="sd-col-diagram">
              {slide.custom && (
                <slide.custom
                  stage={diagramStage}
                  animated={animated}
                  commentsByBlock={commentsByBullet}
                  onOpenComment={onOpenComment}
                  showComments={showComments}
                />
              )}
            </div>
          </div>
        )}

        {slide.kind === 'custom' && (
          <div className="flex h-full items-center justify-center">
            {slide.custom && (
              <slide.custom
                stage={diagramStage}
                animated={animated}
                commentsByBlock={commentsByBullet}
                onOpenComment={onOpenComment}
                showComments={showComments}
              />
            )}
          </div>
        )}
      </div>

      {footnoteVisible && <Footnote footnote={slide.footnote} />}
    </div>
  )
}
