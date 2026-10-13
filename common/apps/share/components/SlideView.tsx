'use client'

import { Fragment } from 'react'
import type { Slide, DeckMeta } from '../types'
import type { Comment } from '../hooks/useComments'
import { CommentTrigger } from './CommentPopover'
import { MathBlock, MathInline } from './Math'

interface SlideViewProps {
  slide: Slide
  deckMeta: DeckMeta
  phaseTitles: string[]
  revealedCount: number
  commentsByBullet: Record<string, Comment[]>
  onOpenComment: (bulletId: string) => void
  animated: boolean
  showComments: boolean
  fullscreen: boolean
}

function Meter({ phaseTitles, activeIndex }: { phaseTitles: string[]; activeIndex: number }) {
  return (
    <div className="sd-meter">
      {phaseTitles.map((t, i) => (
        <div key={t} className={`sd-meter-seg${i === activeIndex ? ' active' : ''}`} title={t} />
      ))}
    </div>
  )
}

function EyebrowHeader({ slide, phaseTitles, phaseIndex }: { slide: Slide; phaseTitles: string[]; phaseIndex: number }) {
  return (
    <div className="sd-eyebrow-row">
      <div className="sd-eyebrow">{slide.title}</div>
      <Meter phaseTitles={phaseTitles} activeIndex={phaseIndex} />
    </div>
  )
}

function FootnoteList({ footnotes, revealedBullets }: { footnotes: Slide['footnotes']; revealedBullets: NonNullable<Slide['bullets']> }) {
  if (!footnotes || footnotes.length === 0) return null
  const visible = footnotes.filter((fn) => !fn.afterBulletId || revealedBullets.some((b) => b.id === fn.afterBulletId))
  if (visible.length === 0) return null
  return (
    <div className="sd-footnote-list">
      {visible.map((fn, i) => (
        <div key={i} className="sd-footnote">
          {fn.href ? (
            <a href={fn.href} target="_blank" rel="noopener noreferrer">
              {fn.text}
            </a>
          ) : (
            fn.text
          )}
        </div>
      ))}
    </div>
  )
}

function BulletList({
  bullets,
  commentsByBullet,
  onOpenComment,
  animated,
  showComments,
  className,
}: {
  bullets: NonNullable<Slide['bullets']>
  commentsByBullet: Record<string, Comment[]>
  onOpenComment: (bulletId: string) => void
  animated: boolean
  showComments: boolean
  className?: string
}) {
  let lastSection: string | undefined
  return (
    <ul className={`sd-points${className ? ` ${className}` : ''}`}>
      {bullets.map((bullet) => {
        const comments = commentsByBullet[bullet.id] ?? []
        const showSectionHeading = !!bullet.section && bullet.section !== lastSection
        lastSection = bullet.section
        if (bullet.code) {
          const { lines, legend } = bullet.code
          return (
            <Fragment key={bullet.id}>
              {showSectionHeading && <li className="sd-section-heading">{bullet.section}</li>}
              <li className={`group sd-point-code${animated ? ' share-fade-in' : ''}`}>
                {showComments && (
                  <span className="sd-point-gutter">
                    <CommentTrigger bulletId={bullet.id} comments={comments} onOpen={onOpenComment} />
                  </span>
                )}
                {bullet.label && (
                  <div className="sd-eq-label">
                    <MathInline text={bullet.label} />
                  </div>
                )}
                {bullet.text && (
                  <div className="sd-point-code-intro">
                    <MathInline text={bullet.text} />
                  </div>
                )}
                <pre className="sd-code-block">{lines.join('\n')}</pre>
                {legend && legend.length > 0 && (
                  <div className="sd-code-legend">
                    {legend.map((item, i) => {
                      const [tag, ...rest] = item.split(' - ')
                      const desc = rest.join(' - ')
                      return (
                        <div key={i} className="sd-code-legend-row">
                          <span className="sd-code-legend-tag">
                            <MathInline text={tag} />
                          </span>
                          <span className="sd-code-legend-desc">
                            <MathInline text={desc} />
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </li>
            </Fragment>
          )
        }
        if (bullet.equation) {
          const { formula, legend, citation } = bullet.equation
          return (
            <Fragment key={bullet.id}>
              {showSectionHeading && <li className="sd-section-heading">{bullet.section}</li>}
              <li className={`group sd-point-equation${animated ? ' share-fade-in' : ''}`}>
                {showComments && (
                  <span className="sd-point-gutter">
                    <CommentTrigger bulletId={bullet.id} comments={comments} onOpen={onOpenComment} />
                  </span>
                )}
                {bullet.label && (
                  <div className="sd-eq-label">
                    <MathInline text={bullet.label} />
                  </div>
                )}
                <div className="sd-eq-formula">
                  <MathBlock latex={formula} />
                </div>
                <div className="sd-eq-legend">
                  <MathInline text={legend} />
                </div>
                {citation && (
                  <div className="sd-eq-citation">
                    <MathInline text={citation} />
                  </div>
                )}
              </li>
            </Fragment>
          )
        }
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
                {bullet.label && (
                  <span className="sd-lead">
                    <MathInline text={bullet.label} />
                  </span>
                )}
                <MathInline text={bullet.text} />
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
  phaseTitles,
  revealedCount,
  commentsByBullet,
  onOpenComment,
  animated,
  showComments,
  fullscreen,
}: SlideViewProps) {
  const bulletCount = slide.bullets?.length ?? 0
  const revealedBullets = slide.bullets?.slice(0, revealedCount) ?? []
  const topBullets = revealedBullets.filter((b) => b.code?.fullWidth)
  const colBullets = revealedBullets.filter((b) => !b.code?.fullWidth)
  const diagramStage =
    slide.kind === 'split'
      ? revealedCount >= (slide.diagramRevealAt ?? 1)
        ? Infinity
        : 0
      : Math.max(0, revealedCount - bulletCount)
  const phaseIndex = phaseTitles.indexOf(slide.title ?? '')

  if (slide.kind === 'title') {
    const [authorName, authorRole] = deckMeta.author.split(', ')
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
      <EyebrowHeader slide={slide} phaseTitles={phaseTitles} phaseIndex={phaseIndex} />
      <h1 className="sd-headline">{slide.subtitle ?? slide.title}</h1>

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
          <div className="flex h-full min-h-0 flex-col gap-4">
            {topBullets.length > 0 && (
              <BulletList
                bullets={topBullets}
                commentsByBullet={commentsByBullet}
                onOpenComment={onOpenComment}
                animated={animated}
                showComments={showComments}
                className="sd-points-top"
              />
            )}
            <div className="sd-split-row min-h-0 flex-1">
              <div className="sd-col-text">
                <BulletList
                  bullets={colBullets}
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

      <FootnoteList footnotes={slide.footnotes} revealedBullets={revealedBullets} />
    </div>
  )
}
