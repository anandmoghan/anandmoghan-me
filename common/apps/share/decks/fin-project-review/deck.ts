import type { Deck } from '../../types'
import LoraDiagram, { LORA_BLOCKS } from './diagrams/LoraDiagram'
import PipelineDiagram, { PIPELINE_BLOCKS } from './diagrams/PipelineDiagram'

const deck: Deck = {
  meta: {
    slug: 'fin-project-review',
    title: "Continual Learning for Alexa's Speech to Speech Models",
    author: 'Anand Mohan, Applied Scientist at Amazon AGI',
    institute: 'Fin - Project Review',
  },
  slides: [
    {
      id: 'title',
      kind: 'title',
    },
    {
      id: 'about',
      kind: 'content',
      title: 'About',
      bullets: [
        {
          id: 'about-experience',
          label: 'Experience',
          text: '7+ years building ML models at scale for speech and language at Amazon',
        },
        {
          id: 'about-education',
          label: 'Education',
          text: 'Masters Thesis on "Attention Based Relevance Modeling for Speaker and Language Recognition"',
        },
        {
          id: 'about-today',
          label: 'Today',
          text: "post-training Nova Sonic, Amazon's multi-billion-parameter speech-to-speech LLM, to Alexa+ use cases",
        },
        {
          id: 'about-continual-learning',
          label: 'Continual Learning',
          text: 'led this workstream end to end: ideation, buy-in from science, engineering, and production leadership, through peer review, experimentation, and evaluation, to production deployment',
        },
        {
          id: 'about-timeline',
          label: 'Timeline',
          text: '2 quarters at 50% bandwidth for science, engineering and deployment'
        },
        {
          id: 'about-team',
          label: 'Team',
          text: 'Onboarded two junior scientists into AGI/Alexa infrastructure and systems + Senior Scientist',
        },
      ],
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
          id: 'problem-scope',
          label: 'Scope of this deck',
          text: "the ASR continual learning loop, built on LoRA adapters, Active Extensions: Full production feedback loop and online RL track",
        },
        {
          id: 'problem-data',
          label: 'Data',
          text: 'domain/product teams + New transcribed data',
        },
        {
          id: 'problem-model',
          label: 'Model',
          text: 'a sub-10B parameter S2S speech + text multimodal Llama-style transformer with streaming and non-streaming modes',
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
      id: 'naive-finetuning',
      kind: 'content',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Naive approach: fine-tuning',
      bullets: [
        {
          id: 'naive-naive-path',
          label: 'Naive path',
          text: 'fine-tuning the seed model',
        },
        {
          id: 'naive-why-broke',
          label: 'Why it broke at scale',
          text: 'continual learning simulations produced drifts and hallucinations',
        },
        {
          id: 'naive-trade',
          label: 'The trade',
          text: 'minimal engineering investment vs stable flexible recipe',
        },
        {
          id: 'naive-direction',
          label: 'The direction',
          text: 'LoRA Adapters',
        },
      ],
    },
    {
      id: 'adapters-vs-finetuning',
      kind: 'split',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Fine-tuning vs. adapters',
      bullets: [
        {
          id: 'adapters-lora-adapters',
          label: 'LoRA adapters¹',
          text: 'freeze the base weights and train a small pair of low-rank matrices; a fraction of the trainable parameters',
        },
        {
          id: 'adapters-latency-trick',
          label: 'Latency trick',
          text: "adapters fuse into the base model's weights at load time; no latency overhead",
        },
        {
          id: 'adapters-flexible',
          label: 'Flexible per locale, easy rollback',
          text: 'model became very configurable',
        },
        {
          id: 'adapters-resists-drift',
          label: 'Resists compounding drift',
          text: 'updates touch only a small low-rank delta; survived simulations',
        },
      ],
      custom: LoraDiagram,
      diagramBlocks: LORA_BLOCKS,
      footnotes: [
        {
          text: '1. Hu et al., 2021: LoRA: Low-Rank Adaptation of Large Language Models, arXiv:2106.09685',
          href: 'https://arxiv.org/abs/2106.09685',
          afterBulletId: 'adapters-lora-adapters',
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
      id: 'experimentation',
      kind: 'content',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Experimentation',
      bullets: [
        {
          id: 'experimentation-iterative',
          label: 'Iterative setup',
          text: 'continual learning simulations, each seeded from the previous checkpoint',
        },
        {
          id: 'experimentation-compared',
          label: 'Compared approaches',
          text: 'fine-tuning and adapter variants',
        },
        {
          id: 'experimentation-adapter-matrix',
          label: 'Adapter matrix search',
          text: 'tested LoRA on the K, Q, V, and feed-forward matrices',
        },
        {
          id: 'experimentation-empirical-choice',
          label: 'Empirical choice',
          text: 'Q and V alone matched the broader configurations on performance, with lower hallucinations',
        },
        {
          id: 'experimentation-layer-coverage',
          label: 'Layer coverage',
          text: 'adapters on different locations in the model architecture - initial layers too important',
        },
        {
          id: 'experimentation-data-replay',
          label: 'Data replay',
          text: 'game changer for catastrophic forgetting',
        },
      ],
    },
    {
      id: 'challenges',
      kind: 'content',
      title: 'Challenges',
      bullets: [
        {
          id: 'challenges-what-broke',
          section: 'Background Speech Regression',
          label: 'What broke',
          text: "increased with simulations, bad customer experience and regressions downstream",
        },
        {
          id: 'challenges-fix',
          section: 'Background Speech Regression',
          label: 'Fix',
          text: 'adjusted the data mix and technique so the model learned to mute it instead',
        },
        {
          id: 'challenges-buyin',
          section: 'Engineering Buy-In',
          label: 'Buy-in',
          text: 'reluctant to invest due to complexity, initial proof-of-concept, escalations and scoped the work out with them',
        },
        {
          id: 'challenges-coordination',
          section: 'Engineering Buy-In',
          label: 'Coordination',
          text: 'aligned runtime, inference engine, personalization and deployment engineering teams, plus TPMs across five top Alexa domains',
        },
      ],
    },
    {
      id: 'results',
      kind: 'content',
      title: 'Results & Evaluation',
      bullets: [
        {
          id: 'results-effort',
          label: 'Effort',
          text: 'cut from about a month of manual science and engineering effort to a fully automated pipeline; scientist involved if gating fails',
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
          id: 'ongoing-online-rl',
          label: 'Online RL infrastructure',
          text: 'batched generation for custom HF interface with a novel right-aligned KV cache technique, GRPO orchestration',
        },
        {
          id: 'ongoing-grpo',
          label: 'GRPO as alternative to min-WER training¹',
          text: 'negotiated with the leadership to invest further into online RL infrastructure',
        },
        {
          id: 'ongoing-wer-penalty',
          label: 'WER deletion penalty',
          text: 'explicit deletion-penalty to the WER reward on background speech data helped with hallucinations',
        },
        {
          id: 'ongoing-result-so-far',
          label: 'Result so far',
          text: '~7% further improvement on top of the continual learning gains on standard suite',
        },
        {
          id: 'ongoing-where-headed',
          label: "Where it's headed",
          text: 'reward modeling for TTS and full conversational AI stack',
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
