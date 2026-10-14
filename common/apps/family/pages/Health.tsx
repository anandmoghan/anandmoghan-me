'use client';

import { Link, useSearchParams } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { PageTitle, Segmented, primaryBtn } from "@/common/apps/family/components/ui";
import { UploadIcon } from "@/common/apps/family/components/Icons";
import { BrokenNote, HealthNotice, OfflineCard } from "@/common/apps/family/components/health/parts";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import Overview from "@/common/apps/family/pages/health/Overview";
import Reports from "@/common/apps/family/pages/health/Reports";
import Results from "@/common/apps/family/pages/health/Results";
import Questions from "@/common/apps/family/pages/health/Questions";
import UploadTab from "@/common/apps/family/pages/health/UploadTab";
import { HEALTH_PEOPLE, parseHealthPerson, useHealth } from "@/common/apps/family/lib/health";
import { personLabel } from "@/common/apps/family/lib/format";
import { defaultPerson } from "@/common/apps/family/lib/tryon";
import type { Person } from "@/common/apps/family/types";

/** Sections, switched from the bottom tabs (Upload from the button beside the title). */
const TABS = [
  ["overview", "Overview"],
  ["reports", "Reports"],
  ["results", "Results"],
  ["questions", "Questions"],
  ["upload", "Upload"],
] as const;
type Tab = (typeof TABS)[number][0];

export default function Health() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const person = parseHealthPerson(params.get("p")) ?? defaultPerson(user?.email);
  const tab: Tab = TABS.find(([t]) => t === params.get("tab"))?.[0] ?? "overview";
  const label = TABS.find(([t]) => t === tab)?.[1] ?? "Overview";
  const h = useHealth(person);
  // Questions and uploads are working details that live on the Mac; the rest shows from the Firestore copy.
  const needsMac = h.live === false && (tab === "questions" || tab === "upload");

  function setPerson(p: Person) {
    const q = new URLSearchParams(params);
    q.set("p", p);
    setParams(q, { replace: true });
  }

  return (
    <div className="space-y-5 px-4 pt-5 pb-6">
      <PageTitle
        title={label}
        action={tab !== "upload" && (
          <Link to={`/health?p=${person}&tab=upload`} className={`${primaryBtn} min-h-11 px-4 text-[0.95rem]`}>
            <UploadIcon size={18} />Upload
          </Link>
        )}
      />
      <Segmented label="Person" value={person} onChange={setPerson} options={HEALTH_PEOPLE.map((p) => [p, personLabel(p)] as const)} />

      {h.status === "loading" && <ListSkeleton rows={4} />}
      {(h.status === "offline" || h.status === "error") && <OfflineCard offline={h.status === "offline"} onRetry={() => h.refresh()} />}
      {h.status === "ready" && h.data && needsMac && <OfflineCard offline onRetry={() => h.refresh()} />}
      {h.status === "ready" && h.data && !needsMac && (
        <div role="tabpanel" aria-label={label}>
          {tab === "overview" && <BrokenNote broken={h.data.broken} />}
          {tab === "overview" && <Overview key={person} person={person} h={h} data={h.data} />}
          {tab === "reports" && <Reports person={person} data={h.data} />}
          {tab === "results" && <Results person={person} data={h.data} />}
          {tab === "questions" && <Questions key={person} person={person} h={h} data={h.data} />}
          {tab === "upload" && <UploadTab key={person} person={person} h={h} data={h.data} />}
        </div>
      )}
      <HealthNotice />
    </div>
  );
}
