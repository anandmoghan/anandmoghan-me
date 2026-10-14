'use client';

import { useRef, useState } from "react";
import { Badge, SectionTitle, primaryBtn, type Tone } from "@/common/apps/family/components/ui";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, fmtDate, healthApi, jobIsActive, type HealthData, type UseHealth, type UploadMeta } from "@/common/apps/family/lib/health";
import { toMillis } from "@/common/apps/family/lib/format";
import type { Person } from "@/common/apps/family/types";

type FileState = "ready" | "uploading" | "uploaded" | "failed";
const STATE_LABEL: Record<FileState, string> = { ready: "Ready", uploading: "Uploading", uploaded: "Uploaded", failed: "Failed" };

const size = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function uploadState(u: UploadMeta, data: HealthData): { label: string; tone: Tone } {
  if (u.processed) return { label: "Processed", tone: "success" };
  const ingest = (data.jobs ?? []).filter((j) => !j.task || j.task === "ingest");
  if (ingest.some(jobIsActive)) return { label: "Processing", tone: "accent" };
  const at = toMillis(u.uploaded_at) ?? 0;
  if (ingest.some((j) => j.state === "failed" && (toMillis(j.created_at) ?? 0) >= at)) return { label: "Failed", tone: "destructive" };
  return { label: "Waiting", tone: "muted" };
}

export default function UploadTab({ person, h, data }: { person: Person; h: UseHealth; data: HealthData }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [states, setStates] = useState<Record<number, FileState>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(list: FileList | null) {
    const chosen = Array.from(list ?? []);
    const tooBig = chosen.filter((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) toast.show({ message: `${tooBig[0].name} is over 25 MB`, error: true });
    setFiles(chosen.filter((f) => f.size <= MAX_UPLOAD_BYTES));
    setStates({});
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!files.length) return;
    setBusy(true);
    const ids: string[] = [];
    let failed = false;
    for (const [i, f] of files.entries()) {
      setStates((s) => ({ ...s, [i]: "uploading" }));
      try {
        ids.push((await healthApi.upload(h.ctx, person, f)).upload_id);
        setStates((s) => ({ ...s, [i]: "uploaded" }));
      } catch {
        failed = true;
        setStates((s) => ({ ...s, [i]: "failed" }));
      }
    }
    try {
      if (ids.length) {
        await healthApi.process(h.ctx, person, ids, note.trim() || undefined);
        toast.show({ message: failed ? "Some files failed. The rest are being read" : "Uploaded, the Mac is reading your files" });
      } else {
        toast.show({ message: "Upload failed, check the Mac is on and try again", error: true });
      }
      if (!failed) {
        setFiles([]);
        setNote("");
        if (input.current) input.current.value = "";
      }
      await h.refresh();
    } catch {
      toast.show({ message: "Files are saved but could not be started, try again", error: true });
    } finally {
      setBusy(false);
    }
  }

  const recent = [...(data.uploads ?? [])].sort((a, b) => (toMillis(b.uploaded_at) ?? 0) - (toMillis(a.uploaded_at) ?? 0)).slice(0, 10);
  return (
    <div className="space-y-8">
      <form onSubmit={(e) => void submit(e)} className="card space-y-4 !p-4">
        <label className="block font-bold">
          Reports, PDFs or photos
          <input ref={input} type="file" multiple accept={ACCEPTED_TYPES.join(",")} onChange={(e) => pick(e.target.files)} className="field mt-1.5 !min-h-11 text-sm font-normal" />
        </label>
        {files.length > 0 && (
          <ul className="divide-y divide-border rounded-2xl bg-subtle" aria-label="Chosen files">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex min-h-11 items-center justify-between gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 break-words font-semibold">{f.name}<span className="block text-sm font-normal text-muted">{size(f.size)}</span></span>
                <span className="shrink-0 text-sm text-muted">{STATE_LABEL[states[i] ?? "ready"]}</span>
              </li>
            ))}
          </ul>
        )}
        <label className="block font-bold">
          Note (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="For example: pages 1 and 2, the rest will follow" className="field mt-1.5 font-normal" />
        </label>
        <button type="submit" disabled={busy || files.length === 0} aria-busy={busy} className={`${primaryBtn} w-full`}>
          {busy ? <><Spinner />Uploading...</> : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
        </button>
      </form>

      {recent.length > 0 && (
        <section className="space-y-2.5" aria-label="Recent uploads">
          <SectionTitle title="Recent uploads" />
          <ul className="card card--flush divide-y divide-border">
            {recent.map((u) => {
              const st = uploadState(u, data);
              return (
                <li key={u.id} className="flex min-h-11 items-center justify-between gap-3 p-3.5">
                  <span className="min-w-0 flex-1 break-words font-semibold">{u.original_name}<span className="block text-sm font-normal text-muted">{fmtDate(u.uploaded_at)}{u.note ? `, ${u.note}` : ""}</span></span>
                  <Badge tone={st.tone} pulse={st.label === "Processing"}>{st.label}</Badge>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
