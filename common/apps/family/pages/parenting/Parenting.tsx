'use client';

import { useState } from "react";
import { Navigate, useParams } from "@/common/apps/family/router";
import { BackLink, PageTitle, softBtn } from "@/common/apps/family/components/ui";
import { BrokenNote } from "@/common/apps/family/components/health/parts";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import { ParentingNotice, ParentingOffline } from "@/common/apps/family/components/parenting/parts";
import Today from "@/common/apps/family/pages/parenting/Today";
import Food, { FOOD_PAGES, FoodPlanPage, type FoodPage } from "@/common/apps/family/pages/parenting/Food";
import About from "@/common/apps/family/pages/parenting/About";
import Milestones from "@/common/apps/family/pages/parenting/Milestones";
import Sleep from "@/common/apps/family/pages/parenting/Sleep";
import Help from "@/common/apps/family/pages/parenting/Help";
import { PastAsks } from "@/common/apps/family/pages/parenting/Ask";
import { FocusPage, JabsPage, ResearchPage, WeeksPage, WorksPage } from "@/common/apps/family/pages/parenting/TodayPages";
import Week from "@/common/apps/family/pages/parenting/Week";
import ProblemPage from "@/common/apps/family/pages/parenting/Problem";
import { ageLabel, isGuide, isStepPlan, useParenting } from "@/common/apps/family/lib/parenting";
import { PARENTING_TABS } from "@/common/apps/family/lib/tabs";

/** Pages that open from a card: Today's cards, and Help's "Your questions". */
const EXTRA_PAGES: Record<string, string> = {
  jabs: "Checks and jabs", works: "What works for Nila", focus: "Focus areas", research: "More from the research", weeks: "Past weeks", questions: "Your questions",
};

/** /nila/:tab, the tab chosen from the bottom bar; /nila/about and /nila/week/:id open from Today, /nila/help/:id
 * from Help. */
export default function Parenting() {
  const { tab: raw, id } = useParams();
  const p = useParenting();
  const [aboutEditing, setAboutEditing] = useState(false);
  const foodPage = raw === "food" && id !== undefined && id in FOOD_PAGES ? (id as FoodPage) : undefined;
  const tab = id !== undefined
    ? raw === "week" ? (["week", "Week summary"] as const) : raw === "help" ? (["problem", "Help"] as const) : foodPage ? (["foodpage", FOOD_PAGES[foodPage]] as const) : undefined
    : raw && raw in EXTRA_PAGES ? ([raw, EXTRA_PAGES[raw]] as const) : raw === "about" ? (["about", "About Nila"] as const) : PARENTING_TABS.find(([t]) => t === raw);
  if (raw === "overview" && id === undefined) return <Navigate to="/nila/today" replace />;
  // Ask moved into Help; old links and pushes still land on the ask box.
  if (raw === "ask" && id === undefined) return <Navigate to="/nila/help#ask" replace />;
  if (!tab) return <Navigate to="/nila/today" replace />;
  const [key, tabLabel] = tab;
  // A problem's page is titled with the problem itself.
  const label = key === "problem" ? p.data?.problems.find((x) => x.id === id)?.title ?? tabLabel : tabLabel;
  // Logs and questions are working details that live on the Mac; the rest shows from the Firestore copy.
  const needsMac = p.live === false && (key === "sleep" || key === "food" || key === "questions");
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const age = p.data ? ageLabel(p.data.dob, undefined, true) ?? p.data.summary?.age : null;

  // A problem's page goes back to the Help tab its kind lives in.
  const problem = raw === "help" ? p.data?.problems.find((x) => x.id === id) : undefined;
  const helpView = problem && isStepPlan(problem) ? "plans" : problem && isGuide(problem) ? "habits" : "problems";

  // Pages that open from a card go back to where the card is, shown above the title.
  const backTo = raw === "week" || raw === "about" || (id === undefined && raw !== undefined && raw in EXTRA_PAGES && raw !== "questions") ? (["/nila/today", "Today"] as const)
    : raw === "questions" ? (["/nila/help", "Help"] as const)
    : raw === "help" && id !== undefined ? ([`/nila/help?view=${helpView}`, "Help"] as const)
    : foodPage ? (["/nila/food?view=plan", "Food plan"] as const)
    : null;

  return (
    <div className="space-y-5 px-4 pt-5 pb-6">
      {backTo && <div className="-mb-3"><BackLink to={backTo[0]} label={backTo[1]} /></div>}
      <PageTitle title={label} action={key === "about" && p.status === "ready" && !aboutEditing ? <button type="button" onClick={() => setAboutEditing(true)} className={softBtn}>Edit text</button> : undefined} sub={key === "today" ? <span data-testid="nila-age">{[todayLabel, age && `${age} old`].filter(Boolean).join(" · ")}</span> : undefined} />
      {p.status === "loading" && <ListSkeleton rows={4} />}
      {(p.status === "offline" || p.status === "error") && <ParentingOffline offline={p.status === "offline"} onRetry={() => p.refresh()} />}
      {p.status === "ready" && p.data && needsMac && <ParentingOffline offline onRetry={() => p.refresh()} />}
      {p.status === "ready" && p.data && !needsMac && (
        <div role="tabpanel" aria-label={label}>
          {key === "today" && <BrokenNote broken={p.data.broken} />}
          {key === "today" && <Today p={p} data={p.data} />}
          {key === "about" && <About p={p} editing={aboutEditing} setEditing={setAboutEditing} />}
          {key === "week" && id !== undefined && <Week p={p} id={id} />}
          {key === "problem" && id !== undefined && <ProblemPage p={p} data={p.data} id={id} />}
          {key === "jabs" && <JabsPage data={p.data} />}
          {key === "works" && <WorksPage data={p.data} />}
          {key === "focus" && <FocusPage data={p.data} />}
          {key === "research" && <ResearchPage data={p.data} />}
          {key === "weeks" && <WeeksPage data={p.data} />}
          {key === "questions" && <PastAsks data={p.data} />}
          {key === "foodpage" && foodPage && <FoodPlanPage data={p.data} page={foodPage} />}
          {key === "milestones" && <Milestones p={p} data={p.data} />}
          {key === "food" && <Food p={p} data={p.data} />}
          {key === "sleep" && <Sleep p={p} data={p.data} />}
          {key === "help" && <Help p={p} data={p.data} />}
        </div>
      )}
      <ParentingNotice />
    </div>
  );
}
