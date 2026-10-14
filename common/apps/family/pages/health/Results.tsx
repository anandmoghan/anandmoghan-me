'use client';

import { useState } from "react";
import { Link } from "@/common/apps/family/router";
import { FlagBadge, Sparkline } from "@/common/apps/family/components/health/parts";
import { fmtDate, groupResults, numericOf, type HealthData } from "@/common/apps/family/lib/health";
import type { Person } from "@/common/apps/family/types";

export default function Results({ person, data }: { person: Person; data: HealthData }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const series = groupResults(data.reports ?? []).filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  if (!(data.reports ?? []).some((r) => r.results?.length)) return <p className="card !px-4 !py-6 text-center text-muted">No results yet.</p>;
  return (
    <div className="space-y-3">
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter tests" aria-label="Filter tests" className="field !min-h-11 rounded-full px-4" />
      {!series.length && <p className="py-4 text-center text-muted">No test matches that.</p>}
      <ul className="card card--flush divide-y divide-border overflow-hidden">
        {series.map((s) => {
          const latest = s.points[s.points.length - 1];
          const nums = s.points.map((p) => numericOf(p.result)).filter((n): n is number => n !== null);
          const expanded = open === s.key;
          return (
            <li key={s.key}>
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : s.key)} className="flex min-h-11 w-full items-center gap-3 p-3.5 text-left hover:bg-subtle">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold leading-snug">{s.name}</span>
                  <span className="block text-sm text-muted">{latest.result.value} {s.unit ?? ""} {latest.date ? `on ${fmtDate(latest.date)}` : ""}</span>
                </span>
                <span className="flex w-[72px] shrink-0 justify-center">{nums.length >= 2 && <Sparkline values={nums} />}</span>
                <span className="flex w-20 shrink-0 justify-end"><FlagBadge flag={latest.result.flag} needsRepeat={latest.result.needs_repeat} note={latest.result.note} /></span>
              </button>
              {expanded && (
                <div className="overflow-x-auto border-t border-border" data-testid="history">
                  <table className="w-full min-w-[26rem] text-left text-sm">
                    <thead className="bg-subtle"><tr><th className="p-2">Date</th><th className="p-2">Value</th><th className="p-2">Range</th><th className="p-2">Flag</th><th className="p-2">Report</th></tr></thead>
                    <tbody>
                      {[...s.points].reverse().map((p, i) => (
                        <tr key={`${p.reportId}-${i}`} className="border-t border-border">
                          <td className="p-2 whitespace-nowrap">{fmtDate(p.date)}</td>
                          <td className="p-2 whitespace-nowrap">{p.result.value} {p.result.unit ?? ""}</td>
                          <td className="p-2 whitespace-nowrap">{p.result.ref_range ?? ""}</td>
                          <td className="p-2"><FlagBadge flag={p.result.flag} needsRepeat={p.result.needs_repeat} note={p.result.note} /></td>
                          <td className="p-2"><Link to={`/health/${person}/reports/${p.reportId}`} className="inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-domain underline">Open</Link></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
