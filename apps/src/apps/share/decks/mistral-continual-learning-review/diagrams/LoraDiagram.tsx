import type { DiagramBlockMeta, DiagramProps } from '../../../types'
import { CommentTrigger } from '../../../components/CommentPopover'

export const LORA_BLOCKS: DiagramBlockMeta[] = [
  { id: 'lora-input', label: 'x (input)', text: 'Input activations entering the LoRA-adapted layer' },
  { id: 'lora-w-pretrained', label: 'W, pretrained', text: 'Frozen base weight matrix, no gradient' },
  { id: 'lora-a', label: 'A (d x r)', text: 'Trainable low-rank down-projection, rank 16' },
  { id: 'lora-b', label: 'B (r x d)', text: 'Trainable low-rank up-projection, rank 16' },
  { id: 'lora-sum', label: 'Sum', text: 'Base output plus the low-rank adapter delta' },
  { id: 'lora-output', label: 'h (output)', text: 'h = Wx + BAx' },
]

const BLOCK_POS: Record<string, { x: number; y: number }> = {
  'lora-input': { x: 172, y: 3 },
  'lora-w-pretrained': { x: 90, y: 61 },
  'lora-a': { x: 260, y: 61 },
  'lora-b': { x: 260, y: 113 },
  'lora-sum': { x: 142, y: 189 },
  'lora-output': { x: 172, y: 235 },
}

export default function LoraDiagram({
  stage = Infinity,
  commentsByBlock = {},
  onOpenComment,
  showComments = false,
}: DiagramProps) {
  const stageOfBlock: Record<string, number> = {
    'lora-input': 1,
    'lora-w-pretrained': 1,
    'lora-a': 1,
    'lora-b': 2,
    'lora-sum': 3,
    'lora-output': 4,
  }

  return (
    <div className="sd-lora-wrap relative">
      <svg className="sd-lora-svg" viewBox="0 0 260 262" width="100%">
        {stage >= 1 && (
          <g>
            <rect x="88" y="0" width="84" height="26" rx="3" className="sd-lb-box" />
            <text x="130" y="17" textAnchor="middle" className="sd-lb-text">
              x (input)
            </text>

            <path d="M108,26 L45,58" className="sd-lb-line" />
            <path d="M152,26 L218,58" className="sd-lb-line sd-accent" />

            <rect x="0" y="58" width="90" height="42" rx="3" className="sd-lb-box sd-frozen" />
            <text x="45" y="77" textAnchor="middle" className="sd-lb-text">
              W, pretrained
            </text>
            <text x="45" y="91" textAnchor="middle" className="sd-lb-caption">
              frozen, no gradient
            </text>

            <rect x="178" y="58" width="82" height="32" rx="3" className="sd-lb-box sd-accent" />
            <text x="219" y="78" textAnchor="middle" className="sd-lb-text sd-accent">
              A (d &#215; r)
            </text>
          </g>
        )}

        {stage >= 2 && (
          <g>
            <path d="M219,90 L219,110" className="sd-lb-line sd-accent" />
            <rect x="178" y="110" width="82" height="32" rx="3" className="sd-lb-box sd-accent" />
            <text x="219" y="130" textAnchor="middle" className="sd-lb-text sd-accent">
              B (r &#215; d)
            </text>
            <text x="208" y="156" textAnchor="end" className="sd-lb-caption">
              rank 16
            </text>
          </g>
        )}

        {stage >= 3 && (
          <g>
            <path d="M45,100 L45,196 L118,196" className="sd-lb-line" />
            <path d="M219,142 L219,196 L142,196" className="sd-lb-line sd-accent" />
            <circle cx="130" cy="196" r="12" className="sd-lb-plus" />
            <text x="130" y="200" textAnchor="middle" className="sd-lb-text">
              +
            </text>
          </g>
        )}

        {stage >= 4 && (
          <g>
            <path d="M130,208 L130,232" className="sd-lb-line" />

            <rect x="88" y="232" width="84" height="26" rx="3" className="sd-lb-box sd-out" />
            <text x="130" y="249" textAnchor="middle" className="sd-lb-text sd-out">
              h (output)
            </text>
          </g>
        )}
      </svg>

      {showComments && onOpenComment && (
        <div className="sd-lora-overlay">
          {LORA_BLOCKS.filter((b) => stage >= stageOfBlock[b.id]).map((b) => {
            const pos = BLOCK_POS[b.id]
            return (
              <span
                key={b.id}
                className="sd-lora-trigger group"
                style={{ left: `${(pos.x / 260) * 100}%`, top: `${(pos.y / 262) * 100}%` }}
              >
                <CommentTrigger bulletId={b.id} comments={commentsByBlock[b.id] ?? []} onOpen={onOpenComment} />
              </span>
            )
          })}
        </div>
      )}

      {stage >= 4 && (
        <div className="sd-lora-caption">
          h = Wx + BAx, simplified from Hu et al. 2021,{' '}
          <span style={{ whiteSpace: 'nowrap' }}>
            Fig. 1<sup>1</sup>
          </span>
        </div>
      )}
    </div>
  )
}
