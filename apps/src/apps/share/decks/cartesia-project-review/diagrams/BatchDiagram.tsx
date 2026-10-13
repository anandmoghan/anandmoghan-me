import type { DiagramBlockMeta, DiagramProps } from '../../../types'
import { CommentTrigger } from '../../../components/CommentPopover'

export const BATCH_BLOCKS: DiagramBlockMeta[] = [
  { id: 'batch-before', label: 'Before', text: 'A finished row leaves a gap in the middle of the cache while others keep generating' },
  { id: 'batch-op', label: 'torch.gather', text: 'Right-align: push padding out of the middle, back to the left edge' },
  { id: 'batch-after', label: 'After', text: 'Padding sits only at the left edge; real content stays contiguous' },
]

export default function BatchDiagram({
  stage = Infinity,
  animated = false,
  commentsByBlock = {},
  onOpenComment,
  showComments = false,
}: DiagramProps) {
  const fade = (base: string) => (animated ? `${base} share-fade-in` : base)

  const Gutter = ({ id }: { id: string }) =>
    showComments && onOpenComment ? (
      <span className="sd-block-gutter">
        <CommentTrigger bulletId={id} comments={commentsByBlock[id] ?? []} onOpen={onOpenComment} />
      </span>
    ) : null

  return (
    <div className="sd-kv-wrap">
      {stage >= 1 && (
        <div className={fade('group relative w-full')}>
          <Gutter id="batch-before" />
          <div className="sd-kv-row-label">Before, chunk boundary</div>
          <div className="sd-kv-row">
            <span className="sd-kv-cell sd-kv-content" />
            <span className="sd-kv-cell sd-kv-content" />
            <span className="sd-kv-cell sd-kv-pad" />
            <span className="sd-kv-cell sd-kv-pad" />
            <span className="sd-kv-cell sd-kv-content" />
            <span className="sd-kv-cell sd-kv-content" />
          </div>
        </div>
      )}

      {stage >= 2 && (
        <div className={fade('group relative sd-kv-arrow-row')}>
          <Gutter id="batch-op" />
          <span className="sd-kv-arrow-glyph">&darr;</span>
          torch.gather, right-align
        </div>
      )}

      {stage >= 3 && (
        <div className={fade('group relative w-full')}>
          <Gutter id="batch-after" />
          <div className="sd-kv-row-label">After, padding pushed left</div>
          <div className="sd-kv-row">
            <span className="sd-kv-cell sd-kv-pad" />
            <span className="sd-kv-cell sd-kv-pad" />
            <span className="sd-kv-cell sd-kv-content" />
            <span className="sd-kv-cell sd-kv-content" />
            <span className="sd-kv-cell sd-kv-content" />
            <span className="sd-kv-cell sd-kv-content" />
          </div>
        </div>
      )}

      {stage >= 4 && <div className={fade('sd-kv-result')}>10-15x faster rollout generation</div>}
    </div>
  )
}
