import type { Deck } from '../types'

export const deckRegistry: Record<string, () => Promise<{ default: Deck }>> = {
  'fin-project-review': () => import('./fin-project-review/deck'),
  'cartesia-project-review': () => import('./cartesia-project-review/deck'),
  'grpo-speech-to-speech': () => import('./grpo-speech-to-speech/deck'),
  'mistral-continual-learning-review': () => import('./mistral-continual-learning-review/deck'),
  'mistral-online-rl-s2s-review': () => import('./mistral-online-rl-s2s-review/deck'),
}
