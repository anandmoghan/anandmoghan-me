import type { DiagramBlockMeta, DiagramProps } from '../../../types'
import { CommentTrigger } from '../../../components/CommentPopover'

export const TRAINING_LOOP_BLOCKS: DiagramBlockMeta[] = [
  { id: 'loop-mining', label: 'On-the-fly mining', text: 'Curriculum-gated, WER-thresholded candidate selection' },
  { id: 'loop-rollouts', label: 'Rollout generation', text: 'G=8 rollouts per prompt, grounded with ground truth + greedy decode' },
  { id: 'loop-reward', label: 'Reward scoring', text: 'WER weighted per error mode, higher deletion penalty' },
  { id: 'loop-advantage', label: 'Advantage & KL', text: 'Group-relative advantage, clipped policy loss + KL vs. frozen reference' },
  { id: 'loop-optimizer', label: 'Optimizer step', text: 'Drains the prefetched batch cache, then the cycle repeats' },
]

export default function TrainingLoopDiagram({
  stage = Infinity,
  animated = false,
  commentsByBlock = {},
  onOpenComment,
  showComments = false,
}: DiagramProps) {
  const fade = (base: string) => (animated ? `${base} share-fade-in` : base)

  const Block = ({ id, className = 'sd-p5-box' }: { id: string; className?: string }) => {
    const meta = TRAINING_LOOP_BLOCKS.find((b) => b.id === id)!
    return (
      <div className={`${className} group relative`}>
        <div className="sd-t">{meta.label}</div>
        <div className="sd-d">{meta.text}</div>
        {showComments && onOpenComment && (
          <span className="sd-block-gutter">
            <CommentTrigger bulletId={id} comments={commentsByBlock[id] ?? []} onOpen={onOpenComment} />
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="sd-pipeline5">
      {stage >= 1 && (
        <div className={fade('sd-p5-col sd-single')}>
          <Block id="loop-mining" />
        </div>
      )}

      {stage >= 2 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="loop-rollouts" className="sd-p5-box sd-accent" />
          </div>
        </>
      )}

      {stage >= 3 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="loop-reward" />
          </div>
        </>
      )}

      {stage >= 4 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="loop-advantage" className="sd-p5-box sd-accent" />
          </div>
        </>
      )}

      {stage >= 5 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="loop-optimizer" className="sd-p5-box sd-out" />
          </div>
        </>
      )}
    </div>
  )
}
