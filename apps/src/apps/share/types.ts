import type { ComponentType } from 'react'
import type { Comment } from './hooks/useComments'

export interface DiagramProps {
  stage?: number
  animated?: boolean
  commentsByBlock?: Record<string, Comment[]>
  onOpenComment?: (blockId: string) => void
  showComments?: boolean
}

export interface Bullet {
  id: string
  label?: string
  text: string
  section?: string
  equation?: {
    formula: string
    legend: string
    citation?: string
  }
  code?: {
    lines: string[]
    legend?: string[]
    fullWidth?: boolean
  }
}

export interface DiagramBlockMeta {
  id: string
  label: string
  text: string
}

export interface Footnote {
  text: string
  href?: string
  afterBulletId?: string
}

export type SlideKind = 'title' | 'content' | 'split' | 'custom'

export interface Slide {
  id: string
  kind: SlideKind
  title?: string
  subtitle?: string
  bullets?: Bullet[]
  custom?: ComponentType<DiagramProps>
  diagramBlocks?: DiagramBlockMeta[]
  footnotes?: Footnote[]
  diagramStages?: number
  diagramRevealAt?: number
}

export interface DeckMeta {
  slug: string
  title: string
  author: string
  institute: string
}

export interface Deck {
  meta: DeckMeta
  slides: Slide[]
}
