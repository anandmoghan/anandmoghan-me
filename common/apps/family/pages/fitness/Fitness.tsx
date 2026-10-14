'use client';

import { Navigate, useLocation, useParams, useSearchParams } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { PageTitle, Segmented } from "@/common/apps/family/components/ui";
import { BrokenNote, OfflineCard } from "@/common/apps/family/components/health/parts";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import Today from "@/common/apps/family/pages/fitness/Today";
import PlanTab from "@/common/apps/family/pages/fitness/Plan";
import Trends from "@/common/apps/family/pages/fitness/Trends";
import FoodTab from "@/common/apps/family/pages/fitness/Food";
import Tests from "@/common/apps/family/pages/fitness/Tests";
import Connect from "@/common/apps/family/pages/fitness/Connect";
import { FITNESS_TABS } from "@/common/apps/family/lib/tabs";
import { FITNESS_PEOPLE, dayKey, fmtDay, parseFitnessPerson, useFitness } from "@/common/apps/family/lib/fitness";
import { personLabel } from "@/common/apps/family/lib/format";
import { defaultPerson } from "@/common/apps/family/lib/tryon";
import type { Person } from "@/common/apps/family/types";

/** /fitness/:tab, the tab chosen from the bottom bar, the person from ?p= (Anand or Kavya). */
export default function Fitness() {
  const { tab: raw } = useParams();
  const { search } = useLocation();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const person = parseFitnessPerson(params.get("p")) ?? defaultPerson(user?.email);
  const f = useFitness(person);
  const tab = raw === "connect" ? (["connect", "Connect Apple Health"] as const) : FITNESS_TABS.find(([t]) => t === raw);
  if (!tab) return <Navigate to={`/fitness/today${search}`} replace />;
  const [key, label] = tab;

  function setPerson(p: Person) {
    const q = new URLSearchParams(params);
    q.set("p", p);
    setParams(q, { replace: true });
  }

  return (
    <div className="space-y-5 px-4 pt-5 pb-6 print:p-0">
      <div className="space-y-5 print:hidden">
        <PageTitle title={key === "today" ? "Today" : label} sub={key === "today" ? fmtDay(dayKey(), true) : undefined} />
        <Segmented label="Person" value={person} onChange={setPerson} options={FITNESS_PEOPLE.map((p) => [p, personLabel(p)] as const)} />
      </div>
      {f.status === "loading" && <ListSkeleton rows={4} />}
      {(f.status === "offline" || f.status === "error") && <OfflineCard offline={f.status === "offline"} onRetry={() => f.refresh()} />}
      {f.status === "ready" && f.data && (
        <div role="tabpanel" aria-label={label}>
          {key === "today" && <BrokenNote broken={f.data.broken} />}
          {key === "today" && <Today key={person} person={person} f={f} data={f.data} />}
          {key === "plan" && <PlanTab key={person} person={person} f={f} data={f.data} />}
          {key === "trends" && <Trends key={person} person={person} data={f.data} />}
          {key === "food" && <FoodTab key={person} person={person} f={f} data={f.data} />}
          {key === "connect" && <Connect key={person} person={person} f={f} data={f.data} />}
          {key === "tests" && <Tests key={person} person={person} f={f} data={f.data} />}
        </div>
      )}
    </div>
  );
}
