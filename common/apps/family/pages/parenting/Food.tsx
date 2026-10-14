'use client';

import { useState } from "react";
import { useViewTab } from "@/common/apps/family/hooks/useViewTab";
import { Badge, HubCard, SectionTitle, Segmented, outlineBtn } from "@/common/apps/family/components/ui";
import { SectionedMarkdown } from "@/common/apps/family/components/Points";
import { PointList, ResearchComing } from "@/common/apps/family/components/parenting/parts";
import { TriedBefore } from "@/common/apps/family/components/parenting/plan";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { dayKey } from "@/common/apps/family/lib/fitness";
import { HealthOfflineError, type Source } from "@/common/apps/family/lib/health";
import {
  FOOD_AMOUNTS, FOOD_SLOTS, MENU_KIND_LABEL, MILK_KINDS, POO_KINDS, ParentingHttpError, fmtYmd, foodDayFor, groupProgress, menuFor, menuLine, parentingApi, researching,
  type FoodAmount, type FoodDay, type FoodLogInput, type FoodMenuRow, type FoodMilkKind, type FoodPlan, type FoodPoo, type FoodSlot, type MenuDay, type ParentingData, type UseParenting,
} from "@/common/apps/family/lib/parenting";

type View = "today" | "plan" | "rules";
const VIEWS: readonly (readonly [View, string])[] = [["today", "Today"], ["plan", "Plan"], ["rules", "Rules"]];
const DAY_ORDER: readonly [MenuDay, string][] = [["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]];
const AMOUNT_LABEL = Object.fromEntries(FOOD_AMOUNTS) as Record<FoodAmount, string>;
const MENU_SLOTS = FOOD_SLOTS.filter(([s]) => s !== "other");
type MenuSlot = "breakfast" | "lunch" | "snack" | "dinner";

const chip = (on: boolean) =>
  ["min-h-11 w-full min-w-0 rounded-full px-1 text-sm font-semibold transition-colors disabled:opacity-60", on ? "bg-domain text-domain-foreground shadow-card" : "border border-border bg-surface text-foreground/80 hover:bg-subtle"].join(" ");

/** Saves a log row on the Mac, then reloads. Shared by every control on the Today view. */
function useFoodLog(p: UseParenting) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function save(row: FoodLogInput, done: string): Promise<boolean> {
    setBusy(true);
    let ok = false;
    try {
      await parentingApi.foodLog(p.ctx, row);
      toast.show({ message: done });
      await p.refresh();
      ok = true;
    } catch (e) {
      toast.show({ message: e instanceof ParentingHttpError && e.status === 400 && e.detail ? `Not saved: ${e.detail}` : e instanceof HealthOfflineError ? "Could not reach the Mac, try again" : "Could not save that, try again", error: true });
    }
    setBusy(false);
    return ok;
  }
  return { save, busy };
}
type FoodLog = ReturnType<typeof useFoodLog>;

/** Asks the Mac for a fresh plan; the button shows progress while the job is queued or running. */
function RefreshButton({ p, data, label }: { p: UseParenting; data: ParentingData; label: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const running = researching(data, "food");
  async function refresh() {
    setBusy(true);
    try {
      const r = await parentingApi.foodRefresh(p.ctx);
      toast.show({ message: r.duplicate ? "A new plan is already on its way" : "Asked the Mac for a new plan" });
      await p.refresh();
    } catch {
      toast.show({ message: "Could not reach the Mac, try again", error: true });
    }
    setBusy(false);
  }
  return (
    <button type="button" disabled={busy || running} onClick={() => void refresh()} className={outlineBtn}>
      {(busy || running) && <Spinner />}{running ? "Making the plan…" : busy ? "Sending..." : label}
    </button>
  );
}

/** One meal slot: what the menu says, what was logged, and one tap on an amount to log it. */
function SlotCard({ slot, title, planned, day, date, log }: { slot: FoodSlot; title: string; planned: string | null; day: FoodDay | undefined; date: string; log: FoodLog }) {
  const logged = day?.meals.find((m) => m.slot === slot);
  const [items, setItems] = useState(logged?.items ?? planned ?? "");
  return (
    <section className="card space-y-2.5 !p-4" aria-label={title} data-testid={`slot-${slot}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-extrabold">{title}</h3>
        {logged && <Badge tone={logged.amount === "none" ? "gold" : "success"}>{AMOUNT_LABEL[logged.amount]}</Badge>}
      </div>
      {/* Before logging, the input already holds the menu; afterwards the menu shows only if she had something else. */}
      {planned && logged && logged.items !== planned && <p className="text-[0.95rem] text-muted" data-testid={`planned-${slot}`}>On the menu: {planned}</p>}
      {logged && <p className="text-[0.95rem]" data-testid={`logged-${slot}`}>Logged: {logged.items}</p>}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">What she had</span>
        <input type="text" value={items} maxLength={300} onChange={(e) => setItems(e.target.value)} className="field !min-h-11" />
      </label>
      <p className="text-sm font-semibold text-muted">How much did she eat? Tap to save.</p>
      <div className="grid grid-cols-5 gap-1.5" role="group" aria-label={`How much ${title.toLowerCase()}`}>
        {FOOD_AMOUNTS.map(([amount, text]) => (
          <button
            key={amount}
            type="button"
            aria-pressed={logged?.amount === amount}
            disabled={log.busy || !items.trim()}
            onClick={() => void log.save({ date, slot, items: items.trim(), amount }, `Saved ${title.toLowerCase()}`)}
            className={chip(logged?.amount === amount)}
          >
            {text}
          </button>
        ))}
      </div>
    </section>
  );
}

function MilkCard({ day, date, log }: { day: FoodDay | undefined; date: string; log: FoodLog }) {
  const [what, setWhat] = useState<FoodMilkKind>("breast");
  const [amount, setAmount] = useState("");
  const [count, setCount] = useState("");
  const list = day?.milk ?? [];
  async function add() {
    const row: FoodDay["milk"][number] = { what };
    if (amount) row.amount_ml = Number(amount);
    if (count) row.count = Number(count);
    if (await log.save({ date, milk: [...list, row] }, "Saved milk")) {
      setAmount("");
      setCount("");
    }
  }
  const ok = (v: string, max: number) => v === "" || (/^\d+$/.test(v) && Number(v) <= max);
  return (
    <section className="card space-y-2.5 !p-4" aria-label="Milk and water">
      <h3 className="text-lg font-extrabold">Milk and water</h3>
      {list.length > 0 && (
        <ul className="text-[0.95rem]" data-testid="milk-logged">
          {list.map((m, i) => (
            <li key={`${m.what}-${i}`}>{[MILK_KINDS.find(([k]) => k === m.what)?.[1], m.count !== undefined && `${m.count} ${m.count === 1 ? "feed" : "feeds"}`, m.amount_ml !== undefined && `${m.amount_ml} ml`].filter(Boolean).join(", ")}</li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Kind of milk">
        {MILK_KINDS.map(([k, text]) => (
          <button key={k} type="button" aria-pressed={what === k} onClick={() => setWhat(k)} className={chip(what === k)}>{text}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-semibold text-muted">Feeds</span>
          <input type="text" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} className="field !min-h-11" />
        </label>
        <label className="block min-w-0">
          <span className="mb-1 block text-sm font-semibold text-muted">Amount (ml)</span>
          <input type="text" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className="field !min-h-11" />
        </label>
      </div>
      <button type="button" disabled={log.busy || (!amount && !count) || !ok(amount, 2000) || !ok(count, 30)} onClick={() => void add()} className={`${outlineBtn} w-full`}>{log.busy ? <><Spinner />Saving...</> : "Add milk"}</button>
    </section>
  );
}

function BodyCard({ day, date, log }: { day: FoodDay | undefined; date: string; log: FoodLog }) {
  const [reaction, setReaction] = useState(day?.reaction ?? "");
  return (
    <section className="card space-y-2.5 !p-4" aria-label="Poo and reactions">
      <h3 className="text-lg font-extrabold">Poo and reactions</h3>
      <p className="text-sm font-semibold text-muted">Today's poo</p>
      <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Poo">
        {POO_KINDS.map(([k, text]) => (
          <button key={k} type="button" aria-pressed={day?.poo === k} disabled={log.busy} onClick={() => void log.save({ date, poo: k as FoodPoo }, "Saved")} className={chip(day?.poo === k)}>
            {text}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-muted">Any reaction to a food? (optional)</span>
        <input type="text" value={reaction} maxLength={300} onChange={(e) => setReaction(e.target.value)} className="field !min-h-11" />
      </label>
      <button type="button" disabled={log.busy || reaction.trim() === (day?.reaction ?? "")} onClick={() => void log.save({ date, reaction: reaction.trim() }, "Saved")} className={`${outlineBtn} w-full`}>{log.busy ? <><Spinner />Saving...</> : "Save reaction"}</button>
      <p className="text-sm text-muted">For a rash, swelling, vomiting or trouble breathing after food, get medical help straight away: UK 999, India 112.</p>
    </section>
  );
}

/** Portions so far today against each group's daily target. */
function Totals({ plan, day }: { plan: FoodPlan; day: FoodDay | undefined }) {
  const rows = groupProgress(plan, day);
  if (!rows.length) return null;
  return (
    <section className="card space-y-3 !p-4" aria-label="Today against the plan">
      <div>
        <h3 className="text-lg font-extrabold">So far today</h3>
        <p className="text-sm text-muted">An estimate from what you typed and how much she ate.</p>
      </div>
      <ul className="space-y-2.5">
        {rows.map(({ group, have }) => (
          <li key={group.id} data-testid={`progress-${group.id}`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 font-semibold">{group.name}</p>
              <p className="shrink-0 text-sm font-bold text-domain">{have} of {group.per_day}</p>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-label={group.name} aria-valuemin={0} aria-valuemax={group.per_day} aria-valuenow={have}>
              <div className="h-full rounded-full bg-domain/70" style={{ width: `${Math.min(100, (have / group.per_day) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TodayView({ p, data, plan }: { p: UseParenting; data: ParentingData; plan: FoodPlan }) {
  const log = useFoodLog(p);
  const date = dayKey();
  const day = foodDayFor(data, date);
  const menu = menuFor(plan, date);
  const stamp = day?.logged_at ?? "";
  return (
    <div className="space-y-5">
      {menu && <p className="text-sm font-semibold text-muted" data-testid="menu-kind">{MENU_KIND_LABEL[menu.kind]}</p>}
      {MENU_SLOTS.map(([slot, title]) => (
        <SlotCard key={`${slot}-${stamp}`} slot={slot} title={title} planned={menuLine(menu, slot)} day={day} date={date} log={log} />
      ))}
      <MilkCard key={`milk-${stamp}`} day={day} date={date} log={log} />
      <BodyCard key={`body-${stamp}`} day={day} date={date} log={log} />
      <Totals plan={plan} day={day} />
    </div>
  );
}

function MenuCard({ row, name, today }: { row: FoodMenuRow; name: string; today: boolean }) {
  return (
    <li className={`card space-y-1 !p-3.5 ${today ? "ring-2 ring-domain/60" : ""}`} data-testid="menu-day" aria-current={today ? "date" : undefined}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-extrabold">{name}</p>
        <Badge tone="muted">{MENU_KIND_LABEL[row.kind]}</Badge>
        {today && <Badge tone="accent">Today</Badge>}
      </div>
      <dl className="space-y-0.5 text-[0.95rem]">
        {MENU_SLOTS.map(([slot, title]) => (
          <div key={slot} className="flex gap-2"><dt className="w-24 shrink-0 font-semibold text-muted">{title}</dt><dd className="min-w-0 flex-1">{row[slot as MenuSlot]}</dd></div>
        ))}
      </dl>
      {row.notes && <p className="text-sm text-muted">{row.notes}</p>}
    </li>
  );
}

export type FoodPage = "day" | "portions" | "nutrients" | "menu" | "why";
export const FOOD_PAGES: Record<FoodPage, string> = { day: "A day of eating", portions: "Food groups and portions", nutrients: "Nutrients to get", menu: "Seven day menu", why: "Why this plan" };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The Plan view: a stack of cards, each opening its own page under /nila/food/. */
function PlanView({ p, data, plan }: { p: UseParenting; data: ParentingData; plan: FoodPlan }) {
  const todayRow = menuFor(plan);
  const todayName = DAY_ORDER.find(([d]) => d === todayRow?.day)?.[1];
  const d = plan.daily;
  return (
    <div className="space-y-5">
      <ul className="space-y-2">
        {d && <li><HubCard to="/nila/food/day" testId="hub-day" title="A day of eating" lines={[`${d.meals} meals and ${d.snacks} snacks a day`]} /></li>}
        {!!plan.groups?.length && <li><HubCard to="/nila/food/portions" testId="hub-portions" title="Food groups and portions" lines={[plural(plan.groups.length, "group", "groups"), plan.groups.slice(0, 3).map((g) => g.name).join(", ")]} /></li>}
        {!!plan.nutrients?.length && <li><HubCard to="/nila/food/nutrients" testId="hub-nutrients" title="Nutrients to get" lines={[plural(plan.nutrients.length, "nutrient", "nutrients"), plan.nutrients.slice(0, 3).map((n) => n.name).join(", ")]} /></li>}
        {!!plan.menu?.length && (
          <li>
            <HubCard to="/nila/food/menu" testId="hub-menu" title="Seven day menu" lines={todayRow && todayName ? [`${todayName}: ${[todayRow.breakfast, todayRow.lunch, todayRow.dinner].join(", ")}`] : [plural(plan.menu.length, "day", "days")]} />
          </li>
        )}
        {(plan.body?.trim() || plan.history_fit || plan.age_text || plan.weight_basis) && <li><HubCard to="/nila/food/why" testId="hub-why" title="Why this plan" lines={[plan.age_text && `Made for her at ${plan.age_text}`]} /></li>}
      </ul>
      <RefreshButton p={p} data={data} label="Refresh the plan" />
    </div>
  );
}

/** /nila/food/:page: one section of the plan in full. */
export function FoodPlanPage({ data, page }: { data: ParentingData; page: FoodPage }) {
  const plan = data.food_plan;
  const todayRow = plan ? menuFor(plan) : null;
  if (!plan) return <p className="card !px-4 !py-3.5 text-muted">The food plan is not ready yet.</p>;
  return (
    <div className="space-y-5">
      {page === "day" && plan.daily && (
        <div className="card !px-3.5 !py-1">
          <PointList label="Daily pattern" items={[
            { id: "meals", text: `${plan.daily.meals} meals and ${plan.daily.snacks} snacks a day` },
            ...plan.daily.milk.map((m, i) => ({ id: `milk-${i}`, text: `${m.what}: ${m.amount}, ${m.when}` })),
          ]} />
        </div>
      )}
      {page === "portions" && !!plan.groups?.length && (
        <div className="card !px-3.5 !py-1">
          <PointList label="Food groups" items={plan.groups.map((g) => ({
            id: g.id,
            text: `${g.name}: ${g.per_day} a day, ${g.portion}`,
            detail: `Examples: ${g.examples.join(", ")}`,
            forHer: g.for_her,
            sources: g.sources,
          }))} />
        </div>
      )}
      {page === "nutrients" && !!plan.nutrients?.length && (
        <div className="card !px-3.5 !py-1">
          <PointList label="Nutrients" items={plan.nutrients.map((n) => ({ id: n.id, text: `${n.name}: ${n.target}`, detail: `Without dairy: ${n.how_dairy_free}`, sources: n.sources }))} />
        </div>
      )}
      {page === "menu" && !!plan.menu?.length && (
        <ul className="space-y-2">
          {DAY_ORDER.map(([day, name]) => {
            const row = plan.menu?.find((m) => m.day === day);
            return row ? <MenuCard key={day} row={row} name={name} today={todayRow?.day === day} /> : null;
          })}
        </ul>
      )}
      {page === "why" && (
        <div className="space-y-5">
          {(plan.age_text || plan.weight_basis) && (
            <p className="text-sm text-muted" data-testid="plan-basis">
              {[plan.age_text && `Made for her at ${plan.age_text}`, plan.weight_basis && `weight ${plan.weight_basis.value_kg} kg on ${fmtYmd(plan.weight_basis.as_of) || plan.weight_basis.as_of} (from your notes)`].filter(Boolean).join(", ")}
            </p>
          )}
          <TriedBefore fit={plan.history_fit} open />
          {plan.body?.trim() && <SectionedMarkdown text={plan.body.replace(/^>\s*Not medical advice.*$/gim, "").replace(/^#\s.*$/m, "")} cards />}
        </div>
      )}
    </div>
  );
}

interface RuleItem { id?: string; text: string; detail?: string; sources?: Source[] }

function RulesView({ plan }: { plan: FoodPlan }) {
  const empty = !plan.limits?.length && !plan.allergy_swaps?.length && !plan.choking?.length && !plan.too_much_too_little?.length;
  if (empty) return <p className="card !px-4 !py-3.5 text-muted">No rules in the plan yet.</p>;
  const block = (title: string, items: RuleItem[]) =>
    items.length > 0 && (
      <section className="space-y-2.5" aria-label={title}>
        <SectionTitle title={title} />
        <div className="card !px-3.5 !py-1"><PointList label={title} items={items} /></div>
      </section>
    );
  return (
    <div className="space-y-7">
      {block("Limits", (plan.limits ?? []).map((l) => ({ id: l.id, text: l.text, detail: l.why, sources: l.sources })))}
      {block("Allergy swaps", (plan.allergy_swaps ?? []).map((s) => ({ text: `Instead of ${s.avoid}: ${s.use_instead}`, detail: s.why, sources: s.sources })))}
      {block("Choking safety", (plan.choking ?? []).map((c) => ({ text: c.text, sources: c.sources })))}
      {block("Too much or too little", (plan.too_much_too_little ?? []).map((t) => ({ text: t.sign, detail: `${t.means}. ${t.action}` })))}
    </div>
  );
}

/** /nila/food: Today (the menu next to what was logged, a quick log), Plan and Rules. */
export default function Food({ p, data }: { p: UseParenting; data: ParentingData }) {
  const [view, setView] = useViewTab(VIEWS, "today");
  const plan = data.food_plan;
  if (!plan || !plan.groups) {
    return (
      <ResearchComing title="Your food plan is on its way" busy={researching(data, "food")}>
        <div className="flex justify-center pt-2"><RefreshButton p={p} data={data} label="Refresh" /></div>
      </ResearchComing>
    );
  }
  return (
    <div className="space-y-5">
      <Segmented center label="Food view" value={view} onChange={setView} options={VIEWS} />
      {view === "today" && <TodayView p={p} data={data} plan={plan} />}
      {view === "plan" && <PlanView p={p} data={data} plan={plan} />}
      {view === "rules" && <RulesView plan={plan} />}
    </div>
  );
}
