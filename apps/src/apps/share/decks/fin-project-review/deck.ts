import type { Deck } from '../../types'
import LoraDiagram, { LORA_BLOCKS } from './diagrams/LoraDiagram'
import PipelineDiagram, { PIPELINE_BLOCKS } from './diagrams/PipelineDiagram'

const deck: Deck = {
  meta: {
    slug: 'fin-project-review',
    title: "Continual Learning for Alexa's Speech to Speech Models",
    author: 'Anand Mohan — Applied Scientist at Amazon AGI',
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
          text: '7+ years building ML models at scale for speech and language at Amazon, spanning generations of ASR models: hybrid DNN-HMM with WFSTs, CTC, all-neural RNN Transducers, large multilingual ASR, and now speech LLMs',
        },
        {
          id: 'about-education',
          label: 'Education',
          text: 'Masters in AI, Indian Institute of Science, Bangalore, thesis on Attention Based Relevance Modeling for Speaker and Language Recognition',
        },
        {
          id: 'about-today',
          label: 'Today',
          text: "on the post-training side, aligning Nova Sonic, Amazon's multi-billion-parameter speech-to-speech LLM, to Alexa+ use cases",
        },
        {
          id: 'about-continual-learning',
          label: 'Continual Learning',
          text: 'led this workstream end to end: ideation, buy-in from science, engineering, and production leadership, through peer review, experimentation, and evaluation, to production deployment',
        },
        {
          id: 'about-timeline',
          label: 'Timeline',
          text: '1 quarter at 50% bandwidth carried it from ideation through experimentation to a proper POC for engineering; worked with engineering for implementation and deployed it the following quarter',
        },
        {
          id: 'about-team',
          label: 'Team',
          text: 'started with a junior scientist modeling continual learning for ASR, grew to a senior scientist doing full-session-context DPO on new data, and now mentors another junior scientist on the ASR/TTS feedback loop; mentored both the junior scientists to onboard into AGI/Alexa infrastructure and systems',
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
          text: 'we needed a mechanism to continually update our production speech-to-speech LLM with the latest data at a bi-weekly cadence, through minimal science intervention, and iteratively improve the model',
        },
        {
          id: 'problem-scope',
          label: 'Scope of this deck',
          text: "the ASR continual learning loop, built on LoRA adapters, is what's in production; a TTS feedback loop and an online RL investment are the active extensions",
        },
        {
          id: 'problem-data',
          label: 'Data',
          text: 'domain teams needed a mechanism to ingest data for new features and production issues directly, plus newly transcribed data coming in continuously',
        },
        {
          id: 'problem-model',
          label: 'Model',
          text: 'a sub-10B parameter S2S multimodal Llama-style transformer, handling text and speech together, supporting streaming and non-streaming ASR and TTS',
        },
        {
          id: 'problem-constraints',
          label: 'Constraints',
          text: 'no regression on the standing regression suite, and no latency regression at inference time',
        },
        {
          id: 'problem-evaluation',
          label: 'Evaluation & gating',
          text: 'offline evaluations, then online benchmarking through the production stack for accurate latency numbers, A/B testing with increasing dial-up, and gating against the current production model before full dial up',
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
          text: 'fine-tune the model directly on new data, but each fine-tune still needed full resources for a training run, packaging, and extensive testing and releases will stay slow',
        },
        {
          id: 'naive-why-broke',
          label: 'Why it broke at scale',
          text: 'simulating 6 continual releases stacked on the last checkpoint (the normal gap before a full retrain) produced severe distribution shift and hallucinations',
        },
        {
          id: 'naive-trade',
          label: 'The trade',
          text: 'fine-tuning was easier for engineering to support, but the recurring distribution shift forced frequent full retrains just to recover',
        },
        {
          id: 'naive-direction',
          label: 'The direction',
          text: 'moved to LoRA adapters instead, trading more design work up front for far less compute per update and per-locale/use-case configurability',
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
          text: 'freeze the base weights and train a small pair of rank-16 low-rank matrices on the attention query and value projections only, a fraction of the trainable parameters',
        },
        {
          id: 'adapters-latency-trick',
          label: 'Latency trick',
          text: "adapters fuse into the base model's weights at load time, the same zero-overhead merge property from the original LoRA paper, so inference carries no added parameters or latency",
        },
        {
          id: 'adapters-flexible',
          label: 'Flexible per locale, easy rollback',
          text: 'adapters differ per locale or use case, e.g. Alexa for BMW vs. regular Alexa, and a bad update reverts by swapping the adapter back instead of a full retrain',
        },
        {
          id: 'adapters-resists-drift',
          label: 'Resists compounding drift',
          text: 'updates touch only a small low-rank delta with the base frozen, avoiding the drift and hallucinations from stacking 6 naive fine-tunes',
        },
      ],
      custom: LoraDiagram,
      diagramBlocks: LORA_BLOCKS,
      footnote: {
        text: '1. Hu et al., 2021: LoRA: Low-Rank Adaptation of Large Language Models, arXiv:2106.09685',
        href: 'https://arxiv.org/abs/2106.09685',
      },
      footnoteAfterBulletId: 'adapters-lora-adapters',
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
          text: 'ran 6 continual learning cycles, each seeded from the previous checkpoint',
        },
        {
          id: 'experimentation-compared',
          label: 'Compared approaches',
          text: 'ran the same 6-cycle loop for both full fine-tuning and LoRA adapters',
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
          text: 'also tested adapters on initial-only layers, end-only layers, and the full model; full layers won',
        },
        {
          id: 'experimentation-data-replay',
          label: 'Data replay',
          text: 'mixing in past data during replay was the game changer for avoiding catastrophic forgetting across the iterative cycles',
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
          text: "background speech, people talking near the device after invoking it but not to it, shouldn't be transcribed, but the continual learning data mix pushed its transcription upward, which causes regressions downstream",
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
          text: 'engineering was reluctant without headcount upfront; escalated to leadership and delivered a proof of concept before they committed, resulting in the standing Airflow release pipeline',
        },
        {
          id: 'challenges-coordination',
          section: 'Engineering Buy-In',
          label: 'Coordination',
          text: 'aligned Runtime Engineering, the inference engine team, the personalization team, and the deployment team, plus TPMs across five top Alexa domains',
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
          text: 'cut from about a month of manual science and engineering effort to a fully automated pipeline that only needs scientist involvement if gating fails',
        },
        {
          id: 'results-data-regression',
          label: 'Data & regression',
          text: '~40–50% relative WERR improvement from newly ingested data, near-zero regression on the standing suite, and no regression in preference or A/B testing at the full-system level',
        },
        {
          id: 'results-top-domain-lift',
          label: 'Top-domain lift',
          text: 'A/B testing showed a measurable end-to-end customer metric improvement for top-traffic domains like Music and Communications, the same domains that made up the bulk of domain team data ingestion',
        },
        {
          id: 'results-poc-to-scale',
          label: 'From PoC to scale',
          text: 'delivered the working proof of concept for en-US, then onboarded and led 6 scientists from Alexa Auto team who extended it further for various locales and use cases',
        },
        {
          id: 'results-critical-auto',
          label: 'Critical for Auto launch',
          text: 'expanding beyond en-US was critical in meeting Alexa Auto launch bars for the de-DE locale; onboarded the full Auto science team to the recipe, giving them their own adapters tuned to Auto use cases like Places of Interest and Navigation',
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
          label: 'TTS feedback loop',
          text: 'mining production drift in volume, voice, and personality, then resynthesizing and feeding it into DPO',
        },
        {
          id: 'ongoing-online-rl',
          label: 'Online RL infrastructure',
          text: 'batched the streaming ASR/TTS HuggingFace interface with a novel right-aligned KV-cache mechanism to generate rollouts for training',
        },
        {
          id: 'ongoing-grpo',
          label: 'GRPO as alternative to min-WER training¹',
          text: 'GRPO is the natural LLM-era equivalent of legacy minimum-WER training for ASR systems, this proof-of-concept was to negotiate with the leadership to invest further into online RL infrastructure',
        },
        {
          id: 'ongoing-wer-penalty',
          label: 'WER deletion penalty',
          text: 'added an explicit deletion-penalty term to the WER reward, carrying the background-speech fix from plain adapter recipe to online RL side',
        },
        {
          id: 'ongoing-result-so-far',
          label: 'Result so far',
          text: '~7% further improvement on top of the continual learning gains on regular datasets',
        },
        {
          id: 'ongoing-where-headed',
          label: "Where it's headed",
          text: 'reward modeling for TTS and full conversational AI stack',
        },
      ],
      footnote: {
        text: '1. Shao et al., 2024: DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models, arXiv:2402.03300 (introduces GRPO)',
        href: 'https://arxiv.org/abs/2402.03300',
      },
      footnoteAfterBulletId: 'ongoing-grpo',
    },
  ],
}

export default deck
