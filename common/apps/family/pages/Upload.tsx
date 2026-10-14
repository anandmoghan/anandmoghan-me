'use client';

import { useRef, useState } from "react";
import { getStorage, ref, uploadBytes } from "firebase/storage";
import { getFirebaseApp } from "@/common/firebase/client";
import { useAuth } from "@/common/firebase/AuthProvider";
import RequestBadge from "@/common/apps/family/components/RequestBadge";
import { useData } from "@/common/apps/family/hooks/useData";
import { useToast } from "@/common/apps/family/hooks/useToast";
import Spinner from "@/common/apps/family/components/Spinner";
import { newRequestId } from "@/common/apps/family/lib/mac";
import { createRequestDoc } from "@/common/apps/family/lib/writes";
import { requestProgress } from "@/common/apps/family/lib/requestStatus";
import { personLabel } from "@/common/apps/family/lib/format";
import { PageTitle, SectionTitle, Segmented, primaryBtn } from "@/common/apps/family/components/ui";

export const PHOTO_KINDS = [
  ["face", "Face"],
  ["full-body-front", "Full body, front"],
  ["full-body-side", "Full body, side"],
  ["wrist-veins", "Wrist veins"],
  ["outfit-loved", "Outfit I love"],
  ["outfit-disliked", "Outfit I dislike"],
  ["wardrobe-item", "Wardrobe item"],
  ["other", "Other"],
] as const;

const PEOPLE = ["anand", "kavya", "nila"] as const;

const EXT_TYPES: Record<string, string> = { heic: "image/heic", heif: "image/heif", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

function contentTypeFor(f: File): string {
  if (f.type) return f.type;
  return EXT_TYPES[f.name.split(".").pop()?.toLowerCase() ?? ""] ?? "image/jpeg";
}

export default function Upload() {
  const { user } = useAuth();
  const { requests, jobs, mac } = useData();
  const toast = useToast();
  const [person, setPerson] = useState<(typeof PEOPLE)[number]>("anand");
  const [kind, setKind] = useState<string>("face");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const email = user?.email ?? "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) return;
    setBusy(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      const request_id = newRequestId();
      const paths: string[] = [];
      for (const f of files) {
        const safe = f.name.replace(/[^A-Za-z0-9._-]+/g, "-");
        const path = `family/${person}/uploads/${date}/${Date.now()}-${safe}`;
        // iPhone photos (HEIC) often arrive with an empty type, which the Storage rules reject.
        await uploadBytes(ref(getStorage(getFirebaseApp()), path), f, { contentType: contentTypeFor(f) });
        paths.push(path);
      }
      void createRequestDoc(email, { request_id, type: "photo-upload", person, input: { kind, storage_paths: paths } }).catch(() => undefined);
      toast.show({ message: mac.live ? "Uploaded, queued for the Mac" : "Uploaded, waiting for Mac" });
      setFiles([]);
      if (input.current) input.current.value = "";
    } catch (err) {
      const code = (err as { code?: string }).code ?? "unknown";
      console.error("upload failed", err);
      const message =
        code === "storage/unauthorized"
          ? "Upload blocked: only photos or PDFs up to 25 MB, signed in as family"
          : code === "storage/retry-limit-exceeded" || code === "storage/canceled"
            ? "Upload failed, check your connection and try again"
            : `Upload failed (${code}), try again`;
      toast.show({ message, error: true });
    } finally {
      setBusy(false);
    }
  }

  const recent = requests.filter((r) => r.type === "photo-upload").slice(-5).reverse();
  return (
    <div className="space-y-6 px-4 pt-5 pb-6">
      <PageTitle title="Upload photos" sub="Photos go to the Mac for the stylist. They are not shown anywhere else." />
      <form onSubmit={(e) => void submit(e)} className="card space-y-5 !p-4">
        <fieldset>
          <legend className="font-bold">Who is it for</legend>
          <div className="mt-1.5">
            <Segmented label="Who is it for" value={person} onChange={setPerson} options={PEOPLE.map((p) => [p, personLabel(p)] as const)} />
          </div>
        </fieldset>
        <label className="block font-bold">
          Kind of photo
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="field mt-1.5 font-normal">
            {PHOTO_KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label className="block font-bold">
          Photos
          <input ref={input} type="file" accept="image/jpeg,image/png,image/heic,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="field mt-1.5 !min-h-11 text-sm font-normal" />
        </label>
        <button type="submit" disabled={busy || files.length === 0} className={`${primaryBtn} w-full`}>
          {busy && <Spinner />}
          {busy ? "Uploading..." : `Upload ${files.length || ""} ${files.length === 1 ? "photo" : "photos"}`.replace("  ", " ")}
        </button>
      </form>

      {recent.length > 0 && (
        <section className="space-y-2.5">
          <SectionTitle title="Recent uploads" />
          <ul className="card card--flush divide-y divide-border">
            {recent.map((r) => (
              <li key={r.id} className="flex min-h-12 items-center justify-between gap-3 px-3.5 py-2.5">
                <span>{personLabel(r.person ?? "family")}, {String(r.input?.kind ?? "photo")}</span>
                <RequestBadge progress={requestProgress(r, mac.live, jobs)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
