import type { Deck } from '../../types'
import BatchDiagram, { BATCH_BLOCKS } from './diagrams/BatchDiagram'

const deck: Deck = {
  meta: {
    slug: 'cartesia-project-review',
    title: 'Online RL for Speech-to-Speech Systems',
    author: 'Anand Mohan, Applied Scientist at Amazon AGI',
    institute: 'Cartesia Project Review',
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
          label: 'Background',
          text: 'Masters Thesis on "Attention Based Relevance Modeling for Speaker and Language Recognition"',
        },
        {
          id: 'about-today',
          label: 'This project',
          text: 'took online RL for streaming ASR from proof-of-concept to a working GRPO recipe, pushing toward reward-driven RL across the full speech-to-speech pipeline',
        },
        {
          id: 'about-timeline',
          label: 'Timeline',
          text: '~2 months at 50% bandwidth; most of it went into optimised batched-rollout infra that made online RL tractable at all',
        },
      ],
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
          label: 'What we are targeting',
          text: 'apply this to streaming ASR within the S2S architecture first, then generalize to speech generation and the full conversational AI pipeline',
        },
      ],
    },
    {
      id: 'mwer-training',
      kind: 'content',
      title: 'Prior Work',
      subtitle: 'Minimum WER training for RNN Transducers',
      bullets: [
        {
          id: 'mwer-training-context',
          label: 'Why the standard RNN-T loss is not enough',
          text: 'it maximizes likelihood of the reference alignment lattice, it never directly targets WER',
        },
        {
          id: 'mwer-training-idea',
          label: 'The idea',
          text: 'generate N-best hypotheses, then directly minimize their expected word error rate against the reference',
        },
        {
          id: 'mwer-training-loss',
          label: 'The loss',
          text: 'expected word error over the N-best list, summed with a variance-reducing baseline',
          equation: {
            formula: 'L = \\sum_i p(y_i)\\,\\big[\\mathrm{WER}(y_i) - \\overline{\\mathrm{WER}}\\big]',
            legend:
              '$p(y_i)$ the model probability of hypothesis $y_i$ in the N-best list; $\\overline{\\mathrm{WER}}$ the mean WER across the list, a variance-reducing baseline',
            citation: 'as formulated in Prabhavalkar et al., 2018¹',
          },
        },
      ],
      footnotes: [
        {
          text: '1. Prabhavalkar et al., 2018: Minimum Word Error Rate Training for Attention-Based Sequence-to-Sequence Models, ICASSP 2018, arXiv:1712.01818',
          href: 'https://arxiv.org/abs/1712.01818',
          afterBulletId: 'mwer-training-loss',
        },
      ],
    },
    {
      id: 'grpo-details',
      kind: 'content',
      title: 'Prior Work',
      subtitle: 'GRPO: The LLM Alternative to MWER',
      bullets: [
        {
          id: 'grpo-core',
          label: 'GRPO²',
          text: 'sample multiple rollouts per prompt, score each against a reward, and reinforce the better ones relative to their own group; no differentiable loss or critic model required',
        },
        {
          id: 'grpo-eq-advantage',
          label: 'Advantage',
          text: 'group-relative advantage: reward normalized against its own group',
          equation: {
            formula: 'A_i = \\dfrac{r_i - \\mathrm{mean}(r)}{\\mathrm{std}(r)}',
            legend: '$r_i$ the reward for rollout $i$, normalized by the mean and std of the reward across its group of $G$ rollouts',
          },
        },
        {
          id: 'grpo-eq-loss',
          label: 'Policy loss',
          text: 'clipped importance-weighted surrogate per token, plus a KL penalty',
          equation: {
            formula:
              'L = -\\dfrac{1}{G}\\sum_{i=1}^{G}\\dfrac{1}{|o_i|}\\sum_{t=1}^{|o_i|} \\min\\!\\Big(\\rho_{i,t} A_i,\\ \\mathrm{clip}(\\rho_{i,t},\\,1-\\epsilon,\\,1+\\epsilon)\\,A_i\\Big) + \\beta \\cdot \\mathrm{KL}\\big(\\pi_\\theta \\,\\|\\, \\pi_{\\mathrm{ref}}\\big)',
            legend:
              '$\\rho_{i,t}=\\pi_\\theta(o_{i,t})/\\pi_{\\theta_{old}}(o_{i,t})$ the per-token importance ratio, $A_i$ the group-relative advantage from above; clipped to $[1-\\epsilon, 1+\\epsilon]$, plus a KL penalty weighted by $\\beta$ against the frozen reference',
          },
        },
      ],
      footnotes: [
        {
          text: '2. Shao et al., 2024: DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models, arXiv:2402.03300 (introduces GRPO)',
          href: 'https://arxiv.org/abs/2402.03300',
          afterBulletId: 'grpo-core',
        },
      ],
    },
    {
      id: 'grpo-equations',
      kind: 'content',
      title: 'Prior Work',
      subtitle: 'GRPO: The LLM Alternative to MWER',
      bullets: [
        {
          id: 'grpo-dr-grpo-intro',
          label: 'Dr. GRPO³',
          text: 'removes the std(r) normalization and the per-response length normalization that let incorrect responses drift longer unpunished',
        },
        {
          id: 'grpo-eq-dr-grpo-advantage',
          label: 'Dr. GRPO³: advantage',
          text: 'drops the std(r) division from the advantage',
          equation: {
            formula: 'A_i = r_i - \\mathrm{mean}(r)',
            legend: 'no std(r) division, avoids inflating gradients on low-variance groups',
          },
        },
        {
          id: 'grpo-eq-dr-grpo-loss',
          label: 'Dr. GRPO³: loss normalization',
          text: 'normalizes by the batch\'s longest sequence instead of each response\'s own length',
          equation: {
            formula:
              'L = -\\dfrac{1}{G \\cdot N_{\\max}}\\sum_{i=1}^{G}\\sum_{t=1}^{|o_i|} \\min\\!\\Big(\\rho_{i,t} A_i,\\ \\mathrm{clip}(\\rho_{i,t},\\,1-\\epsilon,\\,1+\\epsilon)\\,A_i\\Big) + \\beta \\cdot \\mathrm{KL}\\big(\\pi_\\theta \\,\\|\\, \\pi_{\\mathrm{ref}}\\big)',
            legend: '$N_{\\max}$ the current batch\'s longest sequence, replaces per-response length, removes the bias that let incorrect responses drift longer unpunished',
          },
        },
        {
          id: 'grpo-equivalence',
          label: 'Why it is MWER for LLMs',
          text: 'the same shape as MWER: rollouts, reward, and advantage play the roles of N-best list, WER, and baseline correction',
        },
        {
          id: 'grpo-mwer-recap',
          label: 'MWER loss (recap)',
          text: 'expected word error over the N-best list, with the same variance-reducing baseline',
          equation: {
            formula: 'L = \\sum_i p(y_i)\\,\\big[\\mathrm{WER}(y_i) - \\overline{\\mathrm{WER}}\\big]',
            legend: 'same terms as before: $\\overline{\\mathrm{WER}}$ is the baseline that $A_i$ plays the role of in GRPO',
          },
        },
      ],
      footnotes: [
        {
          text: '3. Liu et al., 2025: Understanding R1-Zero-Like Training: A Critical Perspective, arXiv:2503.20783 (introduces Dr. GRPO)',
          href: 'https://arxiv.org/abs/2503.20783',
          afterBulletId: 'grpo-eq-dr-grpo-advantage',
        },
      ],
    },
    {
      id: 'shivakumar',
      kind: 'content',
      title: 'Prior Work',
      subtitle: 'GRPO for Speech Recognition',
      bullets: [
        {
          id: 'shivakumar-scope',
          label: 'Scope',
          text: 'non-streaming ASR on S2S systems, using public data',
        },
        {
          id: 'shivakumar-what',
          label: 'What they did⁴',
          text: 'applied GRPO to non-streaming ASR with rule-based reward functions targeting WER and hallucinations',
        },
        {
          id: 'shivakumar-results',
          label: 'What it delivered',
          text: 'up to 18.4% relative WER improvement, fewer hallucinations, and better robustness on out-of-domain data and domain adaptation',
        },
      ],
      footnotes: [
        {
          text: '4. Shivakumar et al., 2025: Group Relative Policy Optimization for Speech Recognition, arXiv:2509.01939',
          href: 'https://arxiv.org/abs/2509.01939',
          afterBulletId: 'shivakumar-what',
        },
      ],
    },
    {
      id: 'data-model',
      kind: 'content',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Data & model',
      bullets: [
        {
          id: 'data-model-model',
          label: 'Model',
          text: 'sub-10B parameter Llama-style transformer, trained on both streaming and non-streaming speech recognition and generation modes',
        },
        {
          id: 'data-model-seed',
          label: 'Seed',
          text: 'SFT checkpoint trained on production far-field voice-assistant data',
        },
        {
          id: 'data-model-rollout-data',
          label: 'Data',
          text: '100K streams of unseen production traffic, mixed with data replay to guard against catastrophic forgetting',
        },
        {
          id: 'data-model-baseline',
          label: 'Baseline',
          text: 'same data mix, trained with plain SFT on top of the seed checkpoint',
        },
      ],
    },
    {
      id: 'batched-inference',
      kind: 'split',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Batched streaming rollouts',
      bullets: [
        {
          id: 'batched-sequence',
          label: 'The sequence',
          text: 'a streaming turn is one interleaved token stream, audio and text chunks in turn:',
          code: {
            lines: [
              '[SYS] [BOT] <system_prompt>',
              '[BOU] [BOS] <audio_chunk_1> [BOA] [BOT] <text_1> [EOG]',
              '[BOU] [BOS] <audio_chunk_2> [BOA] [BOT] <text_2> [EOG]',
              '...',
              '[BOU] [BOS] <audio_chunk_N> [ETT] [BOA] [BOT] <text_N> [TT]',
            ],
            legend: [
              '[SYS] [BOU] [BOA] - begin a system / user / agent turn',
              '[BOS] [BOT] - begin a speech / text segment',
              '[EOG] - end of generation',
              '[ETT] - external turn-taking trigger',
              '[TT] - turn-taking handoff into interleaved text and audio',
            ],
            fullWidth: true,
          },
        },
        {
          id: 'batched-bottleneck',
          label: 'The bottleneck',
          text: 'unbatched rollout generation was too slow to make online RL practical at all',
        },
        {
          id: 'batched-challenge',
          label: 'The challenge',
          text: 'chunk lengths and generated text lengths vary across rows in a batch',
        },
        {
          id: 'batched-fix',
          label: 'The fix',
          text: 'right-align the KV cache at every chunk boundary via torch.gather; position ids come from a running non-pad count so RoPE stays valid without re-rotation',
        },
        {
          id: 'batched-result',
          label: 'Result',
          text: '10-15x faster rollout generation, the single biggest lever on making this project tractable',
        },
      ],
      custom: BatchDiagram,
      diagramBlocks: BATCH_BLOCKS,
      diagramRevealAt: 3,
    },
    {
      id: 'training-loop-pipeline-1',
      kind: 'content',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Training pipeline',
      bullets: [
        {
          id: 'training-loop-hard-mine',
          section: 'On-the-fly Data Mining',
          label: 'Pull & sort',
          text: 'sort candidates by length, leak back 25% already-solved prompts',
        },
        {
          id: 'training-loop-otf-how',
          section: 'On-the-fly Data Mining',
          label: 'How it works',
          text: 'greedy-decode + score live with WER during prefetch',
        },
        {
          id: 'training-loop-otf-threshold',
          section: 'On-the-fly Data Mining',
          label: 'Threshold band',
          text: 'keep samples in [0.05, 0.7] WER range, discard noisy and very easy samples with some easy sample leak for data replay',
        },
        {
          id: 'training-loop-otf-curriculum',
          section: 'On-the-fly Data Mining',
          label: 'Curriculum',
          text: 'starts on easier samples, gradually opens up to harder ones',
        },
        {
          id: 'training-loop-rollout-sampling',
          section: 'Rollout Generation',
          label: 'Sampling',
          text: 'G=8 rollouts per surviving prompt with temperature 1.0',
        },
        {
          id: 'training-loop-rollout-anchors',
          section: 'Rollout Generation',
          label: 'Grounding anchors',
          text: 'ground truth + greedy decode (already available from filtering) fill the 2 weakest slots',
        },
        {
          id: 'training-loop-prefetch-why',
          section: 'Prefetching',
          label: 'Why prefetch',
          text: 'evens out rollout-gen time across batches of differing max seq length, keeps GPU utilization steady',
        },
        {
          id: 'training-loop-prefetch-cache',
          section: 'Prefetching',
          label: 'K-batch cache',
          text: 'K batches cached in CPU memory, optimizer drains it one by one',
        },
      ],
    },
    {
      id: 'training-loop-pipeline-2',
      kind: 'content',
      title: 'Technical Approach and Experimentation',
      subtitle: 'Training pipeline (Contd.)',
      bullets: [
        {
          id: 'training-loop-reward-wer',
          section: 'Reward Modeling',
          label: 'WER reward',
          text: 'WER weighted per error mode, higher deletion penalty is what worked',
        },
        {
          id: 'training-loop-reward-density',
          section: 'Reward Modeling',
          label: 'Word density',
          text: 'audio/transcript length ratio - gamed by balancing insertions against deletions',
        },
        {
          id: 'training-loop-reward-exact',
          section: 'Reward Modeling',
          label: 'Exact match',
          text: "binary hit on an exact transcript - didn't help with deletions",
        },
        {
          id: 'training-loop-reward-ranking',
          section: 'Reward Modeling',
          label: 'Rank reward',
          text: 'rank based on WER - didn\'t work as well as regular WER',
        },
        {
          id: 'training-loop-score-global-batch',
          section: 'Score & Optimize',
          label: 'Global Batch',
          text: '128 prompts x G=8 rollouts = 1024 sequences per step',
        },
        {
          id: 'training-loop-score-advantage',
          section: 'Score & Optimize',
          label: 'Advantage & loss',
          text: 'group-relative advantage (Dr. GRPO), clipped policy loss + KL',
        },
        {
          id: 'training-loop-score-kl',
          section: 'Score & Optimize',
          label: 'KL penalty',
          text: 'against a frozen reference model, keeps the policy from drifting too far',
        },
        {
          id: 'training-loop-score-optimizer',
          section: 'Score & Optimize',
          label: 'Optimizer step x K',
          text: 'K steps drain the cache, then the cycle repeats',
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
          text: '~8% relative WER reduction in gating test sets vs. SFT baseline',
        },
        {
          id: 'results-convergence',
          section: 'Results',
          label: 'Convergence',
          text: 'convergence in under 3K steps (~10 hours of training)',
        },
        {
          id: 'results-error-breakdown',
          section: 'Results',
          label: 'Error breakdown',
          text: 'deletions were the main failure mode due to background speech data',
        },
        {
          id: 'takeaways-deletions-what-broke',
          section: 'Key Takeaways',
          label: 'Background-speech deletions',
          text: 'penalized for transcribing background speech, so it learns to delete it - an explicit deletion penalty reins it back in',
        },
        {
          id: 'takeaways-coverage-mask',
          section: 'Key Takeaways',
          label: 'Coverage masking did not help',
          text: 'masking low word/audio-length streams from the loss - did not fix the root cause',
        },
        {
          id: 'takeaways-kl-loss',
          section: 'Key Takeaways',
          label: 'KL loss is load-bearing',
          text: 'too low a KL penalty and the policy collapses within hundreds of steps',
        },
        {
          id: 'takeaways-curriculum',
          section: 'Key Takeaways',
          label: 'Curriculum',
          text: 'smoother curriculum introduced harder samples gradually which stabilized the training',
        },
        {
          id: 'takeaways-grounding-rollouts',
          section: 'Key Takeaways',
          label: 'Grounded anchors',
          text: 'grounding rollouts with ground truth and greedy output was also crucial when curriculum gates opened',
        },
      ],
    },
    {
      id: 'beyond-asr',
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
          label: 'Speech Generation',
          text: 'reward heads for quality, naturalness, and speaker consistency with objective metrics',
        },
        {
          id: 'beyond-asr-conv-reward',
          label: 'Conversational Pipeline',
          text: 'optimize against a downstream conversation-quality metric scored by an ensemble of LLM judges',
        },
      ],
    },
  ],
}

export default deck
