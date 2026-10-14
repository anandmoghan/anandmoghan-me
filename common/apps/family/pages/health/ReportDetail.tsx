'use client';

import { useCallback, useEffect, useState } from "react";
import Spinner from "@/common/apps/family/components/Spinner";
import { useParams } from "@/common/apps/family/router";
import { Badge, Meta, SectionTitle, outlineBtn } from "@/common/apps/family/components/ui";
import { CountryBadge, FlagBadge, HealthNotice, OfflineCard } from "@/common/apps/family/components/health/parts";
import { Points, SectionedMarkdown } from "@/common/apps/family/components/Points";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { BackLink } from "@/common/apps/family/pages/Product";
import {
  HealthOfflineError, fmtDate, healthApi, isAbnormal, openOriginal, parseHealthPerson, useHealthApi, type ReportDetail as Detail,
} from "@/common/apps/family/lib/health";

export default function ReportDetail() {
  const { person: personParam, id = "" } = useParams();
  const person = parseHealthPerson(personParam ?? null);
  const ctx = useHealthApi();
  const toast = useToast();
  const [report, setReport] = useState<Detail | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [opening, setOpening] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");

  const load = useCallback(async () => {
    if (!person) return;
    setStatus("loading");
    try {
      const rep = await healthApi.report(ctx, person, id);
      setReport(rep);
      setStatus("ready");
      // Names for the original-file buttons; the buttons fall back to "Original n" without them.
      healthApi.get(ctx, person).then((d) => setNames(Object.fromEntries((d.uploads ?? []).map((u) => [u.id, u.original_name])))).catch(() => undefined);
    } catch (e) {
      setStatus(e instanceof HealthOfflineError ? "offline" : "error");
    }
  }, [ctx, person, id]);
  useEffect(() => { void load(); }, [load]);

  if (!person) return <div className="mx-auto max-w-2xl px-4 pt-6"><p className="text-muted">Unknown person.</p></div>;
  const flagged = (report?.results ?? []).filter(isAbnormal);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-2 pb-6">
      <BackLink fallback={`/health?p=${person}&tab=reports`} label="Reports" />
      {status === "loading" && <ListSkeleton rows={4} />}
      {(status === "offline" || status === "error") && <OfflineCard offline={status === "offline"} onRetry={() => load()} />}
      {report && status === "ready" && (
        <>
          <header className="space-y-2">
            <h1 className="text-[1.5rem] font-extrabold leading-snug">{report.title}</h1>
            <Meta parts={[report.lab, report.lab_city, report.collected_at && `Collected ${fmtDate(report.collected_at)}`, report.reported_at && `Reported ${fmtDate(report.reported_at)}`, report.referred_by && `Referred by ${report.referred_by}`, report.sample_id && `Sample ${report.sample_id}`]} />
            <div className="flex flex-wrap gap-1.5">
              <CountryBadge country={report.country} />
              {report.completeness === "partial" && <Badge tone="gold">Partial, more pages to come</Badge>}
            </div>
            {report.summary && <div className="card mt-3 !p-4"><Points text={report.summary} max={3} /></div>}
          </header>

          {flagged.length > 0 && (
            <section className="space-y-2.5" aria-label="Flagged results">
              <SectionTitle title="Flagged results" />
              <ul className="card card--flush divide-y divide-border">
                {flagged.map((r, i) => (
                  <li key={`${r.test}-${i}`} className="flex items-center justify-between gap-3 p-3.5">
                    <span className="min-w-0 flex-1 break-words font-bold">{r.test}<span className="block text-sm font-normal text-muted">{r.ref_range ? `Range ${r.ref_range}` : ""}</span></span>
                    <span className="shrink-0 font-semibold">{r.value} {r.unit}</span>
                    <FlagBadge flag={r.flag} needsRepeat={r.needs_repeat} note={r.note} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!!report.uploads?.length && (
            <section className="space-y-2.5" aria-label="Original files">
              <SectionTitle title="Original files" />
              <div className="flex flex-wrap gap-2">
                {report.uploads.map((u, i) => (
                  <button key={u} type="button" title={u} disabled={opening !== null} aria-busy={opening === u} onClick={() => { setOpening(u); void openOriginal(ctx, person, u).catch(() => toast.show({ message: "Could not open the file", error: true })).finally(() => setOpening(null)); }} className={outlineBtn}>
                    {opening === u ? <><Spinner />Opening...</> : names[u] ?? `Original ${i + 1}`}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="card !p-4 sm:!p-5">
            <SectionedMarkdown text={report.body} max={4} />
          </div>
        </>
      )}
      <HealthNotice />
    </div>
  );
}
