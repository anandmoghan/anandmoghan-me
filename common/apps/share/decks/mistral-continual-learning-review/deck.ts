import type { Deck } from '../../types'
import LoraDiagram, { LORA_BLOCKS } from './diagrams/LoraDiagram'
import PipelineDiagram, { PIPELINE_BLOCKS } from './diagrams/PipelineDiagram'

const deck: Deck = {
  meta: {
    slug: 'mistral-continual-learning-review',
    title: "Continual Learning for Alexa's Speech to Speech Models",
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
          id: 'problem-problem',
          label: 'Problem',
          text: 'Update our production model with latest data at a bi-weekly cadence, through minimal science intervention',
        },
        {
          id: 'problem-model',
          label: 'Model',
          text: 'a sub-10B parameter S2S speech + text multimodal Llama-style transformer with streaming and non-streaming modes',
        },
        {
          id: 'problem-scope',
          label: 'Scope of this deck',
          text: 'the ASR continual learning loop, built on LoRA adapters',
        },
        {
          id: 'problem-constraints',
          label: 'Constraints',
          text: 'no regression on the standard suite and latency',
        },
        {
          id: 'problem-evaluation',
          label: 'Evaluation & gating',
          text: 'offline evaluations, online benchmarking on prod stack, A/B test, dial-up',
        },
      ],
    },
    {
      id: 'approach-challenges',
      kind: 'split',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Approach & challenges: naive fine-tuning to LoRA adapters',
      bullets: [
        {
          id: 'approach-naive',
          label: 'Naive approach',
          text: 'fine-tuning the seed model; broke at scale, continual learning simulations produced drift and hallucinations',
        },
        {
          id: 'approach-lora',
          label: 'LoRA adapters¹',
          text: 'freeze the base weights, train a small low-rank delta; fuses into the base model at load time with no latency overhead',
        },
        {
          id: 'approach-buyin',
          label: 'Engineering buy-in',
          text: 'reluctant to invest due to complexity; proof-of-concept plus coordination across runtime, inference, personalization, and deployment teams, and TPMs, across five Alexa domains',
        },
        {
          id: 'approach-regression',
          label: 'Background speech regression',
          text: 'increased with simulations; fixed by adjusting the data mix so the model learned to mute it instead',
        },
      ],
      custom: LoraDiagram,
      diagramBlocks: LORA_BLOCKS,
      footnotes: [
        {
          text: '1. Hu et al., 2021: LoRA: Low-Rank Adaptation of Large Language Models, arXiv:2106.09685',
          href: 'https://arxiv.org/abs/2106.09685',
          afterBulletId: 'approach-lora',
        },
      ],
    },
    {
      id: 'data-pipeline',
      kind: 'custom',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Data & release pipeline',
      custom: PipelineDiagram,
      diagramBlocks: PIPELINE_BLOCKS,
      diagramStages: 5,
    },
    {
      id: 'results',
      kind: 'content',
      title: 'Results & Evaluation',
      bullets: [
        {
          id: 'results-data-replay',
          label: 'Data replay',
          text: 'game changer for catastrophic forgetting',
        },
        {
          id: 'results-data-regression',
          label: 'Data & regression',
          text: '~40–50% WERR on new data, near-zero regression on the standard suite; positive preference and A/B test',
        },
        {
          id: 'results-top-domain-lift',
          label: 'Top-domain lift',
          text: 'improvement in end-to-end customer metrics for top domains',
        },
        {
          id: 'results-poc-to-scale',
          label: 'From PoC to scale',
          text: 'proof of concept for en-US, onboarded team of 6 Alexa Auto scientists to extend it further',
        },
      ],
    },
    {
      id: 'ongoing-work',
      kind: 'content',
      title: 'Ongoing Work',
      bullets: [
        {
          id: 'ongoing-tts-feedback',
          label: 'Feedback loop',
          text: 'mining production drift in volume, voice, and personality, regenerate and improve the model; data flywheel',
        },
        {
          id: 'ongoing-grpo',
          label: 'GRPO¹ as alternative to min-WER training',
          text: 'batched generation for custom HF interface with a novel right-aligned KV cache technique, GRPO orchestration',
        },
        {
          id: 'ongoing-result-so-far',
          label: 'Result so far',
          text: '~8% further improvement on top of the continual learning gains on standard suite',
        },
      ],
      footnotes: [
        {
          text: '1. Shao et al., 2024: DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models, arXiv:2402.03300 (introduces GRPO)',
          href: 'https://arxiv.org/abs/2402.03300',
          afterBulletId: 'ongoing-grpo',
        },
      ],
    },
  ],
}

export default deck
