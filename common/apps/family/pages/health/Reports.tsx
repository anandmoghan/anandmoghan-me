'use client';

import { Link } from "@/common/apps/family/router";
import { Badge, Meta } from "@/common/apps/family/components/ui";
import { CountryBadge } from "@/common/apps/family/components/health/parts";
import { fmtDate, isAbnormal, reportsNewestFirst, type HealthData } from "@/common/apps/family/lib/health";
import type { Person } from "@/common/apps/family/types";

export default function Reports({ person, data }: { person: Person; data: HealthData }) {
  const reports = reportsNewestFirst(data.reports ?? []);
  if (!reports.length) return <p className="card !px-4 !py-6 text-center text-muted">No reports yet. Upload one and it will appear here.</p>;
  return (
    <ul className="space-y-2.5">
      {reports.map((r) => {
        const flagged = (r.results ?? []).filter((x) => isAbnormal(x) && !x.needs_repeat).length;
        return (
          <li key={r.id}>
            <Link to={`/health/${person}/reports/${r.id}`} className="tap card flex min-h-11 items-start gap-3 !p-4 hover:bg-subtle">
              <div className="min-w-0 flex-1">
                <p className="text-[1.05rem] font-extrabold leading-snug">{r.title}</p>
                <Meta parts={[r.lab, r.lab_city, fmtDate(r.collected_at ?? r.reported_at)]} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <CountryBadge country={r.country} />
                {r.completeness === "partial" && <Badge tone="gold">Partial</Badge>}
                {flagged > 0 && <Badge tone="destructive">{flagged} flagged</Badge>}
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
