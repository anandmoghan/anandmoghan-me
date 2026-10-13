import type { Deck } from '../../types'
import BatchDiagram, { BATCH_BLOCKS } from './diagrams/BatchDiagram'
import TrainingLoopDiagram, { TRAINING_LOOP_BLOCKS } from './diagrams/TrainingLoopDiagram'

const deck: Deck = {
  meta: {
    slug: 'mistral-online-rl-s2s-review',
    title: 'Online RL for Speech-to-Speech Systems',
    author: 'Anand Mohan, Applied Scientist at Amazon AGI',
    institute: 'Mistral - Project Review',
  },
  slides: [
    {
      id: 'title',
      kind: 'title',
    },
    {
      id: 'problem',
      kind: 'content',
      title: 'Problem Statement',
      bullets: [
        {
          id: 'problem-unify',
          label: 'S2S systems',
          text: 'interleaved audio and text in one autoregressive model unifies listening and speaking',
        },
        {
          id: 'problem-model',
          label: 'Model',
          text: 'sub-10B parameter Llama-style S2S transformer, trained for both streaming and non-streaming speech recognition and generation',
        },
        {
          id: 'problem-baseline',
          label: 'Baseline',
          text: 'seeded from an SFT checkpoint on production far-field voice-assistant data; the baseline is plain SFT on the same data mix',
        },
        {
          id: 'problem-gap',
          label: 'The gap',
          text: 'deployment success is measured by WER, intelligibility, speaker consistency, and naturalness; SFT only imitates transcripts and reference speech, a proxy for those objectives',
        },
        {
          id: 'problem-mwer-motivation',
          label: 'Precedent',
          text: 'Minimum WER training¹ already did this for RNN-Transducers: generate N-best hypotheses, minimize their expected WER directly instead of just maximizing likelihood',
        },
        {
          id: 'problem-rl-bridge',
          label: 'How RL bridges it',
          text: 'generate rollouts, score them directly against the target metric, and shift probability mass toward higher-scoring outcomes',
        },
      ],
      footnotes: [
        {
          text: '1. Prabhavalkar et al., 2018: Minimum Word Error Rate Training for Attention-Based Sequence-to-Sequence Models, ICASSP 2018, arXiv:1712.01818',
          href: 'https://arxiv.org/abs/1712.01818',
          afterBulletId: 'problem-mwer-motivation',
        },
      ],
    },
    {
      id: 'batched-rollouts',
      kind: 'split',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Batched streaming rollouts',
      bullets: [
        {
          id: 'batch-bottleneck',
          label: 'The bottleneck',
          text: 'unbatched rollout generation was too slow to make online RL practical at all',
        },
        {
          id: 'batch-challenge',
          label: 'The challenge',
          text: 'chunk lengths and generated text lengths vary across rows in a batch',
        },
        {
          id: 'batch-fix',
          label: 'The fix',
          text: 'right-align the KV cache at every chunk boundary via torch.gather; position ids come from a running non-pad count so RoPE stays valid without re-rotation',
        },
        {
          id: 'batch-result',
          label: 'Result',
          text: '10-15x faster rollout generation, the single biggest lever on making this project tractable',
        },
      ],
      custom: BatchDiagram,
      diagramBlocks: BATCH_BLOCKS,
    },
    {
      id: 'training-loop',
      kind: 'custom',
      title: 'Technical Approach and Experimentation',
      subtitle: 'GRPO² training loop',
      custom: TrainingLoopDiagram,
      diagramBlocks: TRAINING_LOOP_BLOCKS,
      diagramStages: 5,
      footnotes: [
        {
          text: '2. Shao et al., 2024: DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models, arXiv:2402.03300 (introduces GRPO)',
          href: 'https://arxiv.org/abs/2402.03300',
        },
      ],
    },
    {
      id: 'results',
      kind: 'content',
      title: 'Results and Key Takeaways',
      bullets: [
        {
          id: 'results-headline',
          section: 'Results',
          label: 'Headline',
          text: '~8% relative WER reduction on gating test sets vs. the SFT baseline, converging in under 3K steps (~10 hours)',
        },
        {
          id: 'results-error-breakdown',
          section: 'Results',
          label: 'Error breakdown',
          text: 'deletions were the main failure mode — penalized for transcribing background speech, so it learned to delete it; an explicit deletion penalty reined it back in',
        },
        {
          id: 'takeaways-kl-loss',
          section: 'Key Takeaways',
          label: 'KL is load-bearing',
          text: 'too low a KL penalty and the policy collapses within hundreds of steps',
        },
        {
          id: 'takeaways-curriculum',
          section: 'Key Takeaways',
          label: 'Curriculum & grounding',
          text: 'a gradual difficulty curriculum, plus grounding rollouts with ground truth and greedy output, kept training stable',
        },
      ],
    },
    {
      id: 'ongoing-work',
      kind: 'content',
      title: 'Ongoing Work',
      subtitle: 'Beyond ASR: toward the full conversational pipeline',
      bullets: [
        {
          id: 'beyond-asr-target',
          label: 'The target',
          text: 'extend this same reward-driven RL loop from streaming ASR to the full speech-to-speech conversational pipeline',
        },
        {
          id: 'beyond-asr-tts',
          label: 'Speech generation',
          text: 'reward heads for quality, naturalness, and speaker consistency with objective metrics',
        },
        {
          id: 'beyond-asr-conv-reward',
          label: 'Conversational pipeline',
          text: 'optimize against a downstream conversation-quality metric scored by an ensemble of LLM judges',
        },
      ],
    },
  ],
}

export default deck
