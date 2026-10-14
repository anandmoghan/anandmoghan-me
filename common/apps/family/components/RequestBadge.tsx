'use client';

import { Badge, type Tone } from "@/common/apps/family/components/ui";
import { PROGRESS_LABEL, type Progress } from "@/common/apps/family/lib/requestStatus";

export const PROGRESS_TONE: Record<Progress, Tone> = { waiting: "gold", queued: "muted", running: "accent", done: "success", failed: "destructive" };

export default function RequestBadge({ progress, testId }: { progress: Progress; testId?: string }) {
  return <Badge tone={PROGRESS_TONE[progress]} pulse={progress === "running"} testId={testId}>{PROGRESS_LABEL[progress]}</Badge>;
}
