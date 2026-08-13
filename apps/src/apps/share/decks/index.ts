import type { Deck } from '../types'

export const deckRegistry: Record<string, () => Promise<{ default: Deck }>> = {
  'fin-project-review': () => import('./fin-project-review/deck'),
  'cartesia-project-review': () => import('./cartesia-project-review/deck'),
}
