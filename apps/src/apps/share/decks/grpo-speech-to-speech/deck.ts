import type { Deck } from '../../types'

const deck: Deck = {
  meta: {
    slug: 'grpo-speech-to-speech',
    title: 'GRPO for Speech to Speech Systems',
    author: 'Anand Mohan, Applied Scientist at Amazon AGI',
    institute: 'Cartesia Project Review',
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
          id: 'problem-gap',
          label: 'The gap',
          text: 'deployment success is measured by WER, intelligibility, speaker consistency, and naturalness; SFT only imitates transcripts and reference speech, a proxy for those objectives',
        },
        {
          id: 'problem-rl-bridge',
          label: 'How RL bridges it',
          text: 'generate rollouts, score them directly against the target metric, and shift probability mass toward higher-scoring outcomes',
        },
        {
          id: 'problem-target',
          label: 'What we targeted',
          text: 'streaming ASR within the S2S architecture first, as the proving ground for reward-driven RL',
        },
      ],
    },
    {
      id: 'grpo-core',
      kind: 'content',
      title: 'GRPO: The Core Idea',
      bullets: [
        {
          id: 'grpo-core-idea',
          label: 'GRPO',
          text: 'sample multiple rollouts per prompt, score each against a reward, and reinforce the better ones relative to their own group; no differentiable loss or critic model required',
        },
        {
          id: 'grpo-core-advantage',
          label: 'Advantage',
          text: 'reward minus the mean reward within its own group of rollouts is the training signal',
          equation: {
            formula: 'A_i = r_i - \\mathrm{mean}(r)',
            legend: '$r_i$ the reward for rollout $i$; the group itself supplies the baseline, no separate critic network',
          },
        },
        {
          id: 'grpo-core-surrogate',
          label: 'Policy update',
          text: 'importance-weighted, clipped, plus a KL penalty against a frozen reference, so the policy moves toward high-advantage rollouts without drifting too far per step',
        },
        {
          id: 'grpo-core-equivalence',
          label: 'Why it fits ASR',
          text: 'same shape as classical Minimum WER training: rollouts, reward, and advantage play the roles of the N-best list, WER, and its baseline correction',
        },
      ],
    },
    {
      id: 'technical-approach',
      kind: 'content',
      title: 'Technical Approach',
      bullets: [
        {
          id: 'technical-model',
          label: 'Model',
          text: 'sub-10B parameter Llama-style transformer for streaming and non-streaming speech recognition and generation, seeded from an SFT checkpoint',
        },
        {
          id: 'technical-reward',
          label: 'Reward',
          text: 'WER weighted per error mode, with a higher deletion penalty; G=8 rollouts per prompt, grounded with the ground truth and a greedy decode',
        },
        {
          id: 'technical-bottleneck',
          label: 'The real bottleneck',
          text: 'unbatched rollout generation was too slow to make online RL practical at all',
        },
        {
          id: 'technical-fix',
          label: 'The fix',
          text: 'batched streaming rollout inference, right-aligning the KV cache at every chunk boundary; 10-15x faster generation, the single biggest lever on making this project tractable',
        },
      ],
    },
    {
      id: 'results-takeaways',
      kind: 'content',
      title: 'Results and Key Takeaways',
      bullets: [
        {
          id: 'results-headline',
          section: 'Results',
          label: 'Headline',
          text: '~8% relative WER reduction on gating test sets vs. the SFT baseline, converging in under 3K steps',
        },
        {
          id: 'results-error-breakdown',
          section: 'Results',
          label: 'Main failure mode',
          text: 'deletions, from background speech being penalized as transcription error; an explicit deletion penalty reined it back in',
        },
        {
          id: 'takeaways-kl',
          section: 'Key Takeaways',
          label: 'KL is load-bearing',
          text: 'too low a KL penalty and the policy collapses within hundreds of steps',
        },
        {
          id: 'takeaways-curriculum',
          section: 'Key Takeaways',
          label: 'Curriculum and grounding',
          text: 'a gradual difficulty curriculum, plus grounding rollouts with ground truth and greedy output, kept training stable',
        },
      ],
    },
    {
      id: 'beyond-asr',
      kind: 'content',
      title: 'Beyond ASR',
      subtitle: 'Toward the full conversational pipeline',
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
