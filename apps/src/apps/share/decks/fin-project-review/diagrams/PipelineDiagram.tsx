import type { DiagramBlockMeta, DiagramProps } from '../../../types'
import { CommentTrigger } from '../../../components/CommentPopover'

export const PIPELINE_BLOCKS: DiagramBlockMeta[] = [
  { id: 'pipeline-domain-ingestion', label: 'Domain ingestion portal', text: 'Product/domain teams upload data, TTS synthesized' },
  { id: 'pipeline-human-transcribed', label: 'Human-transcribed data', text: 'Standard annotation pipeline, novelty filtered' },
  { id: 'pipeline-data-replay', label: 'Data replay', text: 'Past data weighted at 0.9' },
  { id: 'pipeline-cl-training', label: 'CL training', text: 'Continual update step' },
  { id: 'pipeline-offline-evals', label: 'Offline evals', text: 'Across ASR and TTS' },
  { id: 'pipeline-online-benchmarking', label: 'Online benchmarking', text: 'Through the production stack' },
  { id: 'pipeline-gate', label: 'Gate', text: 'vs. current production model' },
  {
    id: 'pipeline-ab-dialup',
    label: 'A/B dial-up',
    text: 'A/B testing + gradual dial-up to full traffic',
  },
]

export default function PipelineDiagram({
  stage = Infinity,
  animated = false,
  commentsByBlock = {},
  onOpenComment,
  showComments = false,
}: DiagramProps) {
  const fade = (base: string) => (animated ? `${base} share-fade-in` : base)

  const Block = ({ id, className = 'sd-p5-box' }: { id: string; className?: string }) => {
    const meta = PIPELINE_BLOCKS.find((b) => b.id === id)!
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
        <div className={fade('sd-p5-col')}>
          <Block id="pipeline-domain-ingestion" />
          <Block id="pipeline-human-transcribed" />
          <Block id="pipeline-data-replay" />
        </div>
      )}

      {stage >= 2 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="pipeline-cl-training" className="sd-p5-box sd-accent" />
          </div>
        </>
      )}

      {stage >= 3 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col')}>
            <Block id="pipeline-offline-evals" className="sd-p5-box sd-accent" />
            <Block id="pipeline-online-benchmarking" />
          </div>
        </>
      )}

      {stage >= 4 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="pipeline-gate" className="sd-p5-box sd-accent" />
          </div>
        </>
      )}

      {stage >= 5 && (
        <>
          <div className={fade('sd-p5-arrow')}>&rarr;</div>

          <div className={fade('sd-p5-col sd-single')}>
            <Block id="pipeline-ab-dialup" className="sd-p5-box sd-out" />
          </div>
        </>
      )}
    </div>
  )
}
