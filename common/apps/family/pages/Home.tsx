'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import { ChevronRightIcon, DOMAIN_ICON, GearIcon, UploadIcon } from "@/common/apps/family/components/Icons";
import { collapseHealth, filterFeed, groupFeed, updateLink, viewerPerson } from "@/common/apps/family/lib/feed";
import { personLabel, toMillis } from "@/common/apps/family/lib/format";
import { effectiveStatus } from "@/common/apps/family/lib/shop";
import { defaultPerson } from "@/common/apps/family/lib/tryon";
import { dueFollowups, fmtDate, healthApi, useHealthApi, type DueFollowup } from "@/common/apps/family/lib/health";
import { feedItemDomain, greeting, type Domain } from "@/common/apps/family/lib/domain";
import { doneToday, fitnessApi } from "@/common/apps/family/lib/fitness";
import { ageLabel, currentWeek, isGuide, parentingApi } from "@/common/apps/family/lib/parenting";
import type { Person } from "@/common/apps/family/types";

const tint = (d: Domain) => ({ "--domain": `var(--${d})` }) as CSSProperties;

/** Follow-ups due soon, fetched once from the Mac when it answers; null while unknown (offline or still loading). */
function useDueFollowups(person: Person, live: boolean | null): DueFollowup[] | null {
  const ctx = useHealthApi();
  const [due, setDue] = useState<DueFollowup[] | null>(null);
  useEffect(() => {
    if (live !== true) return;
    let cancelled = false;
    healthApi.get(ctx, person).then((d) => { if (!cancelled) setDue(dueFollowups(d, Date.now())); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ctx, person, live]);
  return due;
}

/** Today's checklist progress from the Mac; null while unknown (offline, loading, or no plan yet). */
function useFitnessToday(person: Person, live: boolean | null): { done: number; total: number } | null {
  const ctx = useHealthApi();
  const [today, setToday] = useState<{ done: number; total: number } | null>(null);
  useEffect(() => {
    if (live !== true) return;
    let cancelled = false;
    fitnessApi.get(ctx, person).then((d) => { if (!cancelled) setToday(d.plan?.checklist?.length ? doneToday(d.plan, d) : null); }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ctx, person, live]);
  return today;
}

/** Nila's card line from the Mac: her age, then open problems or this week's sleep step; null while unknown. */
function useNilaLine(live: boolean | null): { line: string; highlight: boolean } | null {
  const ctx = useHealthApi();
  const [out, setOut] = useState<{ line: string; highlight: boolean } | null>(null);
  useEffect(() => {
    if (live !== true) return;
    let cancelled = false;
    parentingApi.get(ctx).then((d) => {
      if (cancelled) return;
      const age = ageLabel(d.dob) ?? d.summary?.age ?? null;
      const open = d.problems.filter((p) => p.status !== "resolved" && !isGuide(p)).length;
      const week = currentWeek(d.sleep_plan);
      const step = d.sleep_plan?.status !== "paused" ? d.sleep_plan?.steps?.find((s) => s.week === week) : undefined;
      const extra = open ? plural(open, "open problem") : step ? `Tonight: ${step.title}` : null;
      const line = [age, extra].filter(Boolean).join(", ");
      setOut(line ? { line: line.charAt(0).toUpperCase() + line.slice(1), highlight: open > 0 } : null);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ctx, live]);
  return out;
}

interface Need { key: string; to: string; title: string; sub: string; domain: Domain; rank: number }

function NeedRow({ n }: { n: Need }) {
  const Icon = DOMAIN_ICON[n.domain];
  return (
    <li style={tint(n.domain)}>
      <Link to={n.to} className="tap card flex min-h-16 items-center gap-3 !px-3.5 !py-3 hover:bg-subtle">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-domain/[0.14] text-domain" aria-hidden><Icon size={20} /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{n.title}</span>
          <span className={`block text-sm ${n.rank <= 1 ? "font-semibold text-destructive" : "text-muted"}`}>{n.sub}</span>
        </span>
        <span className="shrink-0 text-muted"><ChevronRightIcon /></span>
      </Link>
    </li>
  );
}

/** Six cards: on phones two by three squares; on wider screens three by two, a little wider than tall. */
const CARD_LAYOUT = "aspect-square md:col-span-2 md:aspect-[5/4]";

function DomainCard({ domain, to, name, line, highlight }: { domain: Domain; to: string; name: string; line: string; highlight: boolean }) {
  const Icon = DOMAIN_ICON[domain];
  return (
    <li style={tint(domain)} className={CARD_LAYOUT}>
      <Link
        to={to}
        className="tap card relative flex h-full flex-col justify-between overflow-hidden !p-4 hover:shadow-float sm:!p-5"
        style={{ backgroundImage: `linear-gradient(160deg, color-mix(in srgb, var(--${domain}) 11%, var(--surface)) 0%, var(--surface) 70%)` }}
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-domain text-domain-foreground shadow-card sm:h-16 sm:w-16" aria-hidden>
          <Icon size={30} />
        </span>
        <span className="block">
          <span className="block text-xl font-extrabold sm:text-2xl">{name}</span>
          <span className={`mt-0.5 line-clamp-2 block text-[0.95rem] leading-snug ${highlight ? "font-bold text-domain" : "text-muted"}`} data-testid={`home-${domain}-line`}>{line}</span>
        </span>
      </Link>
    </li>
  );
}

function SmallCard({ to, icon, title, hint }: { to: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <li>
      <Link to={to} className="tap card flex min-h-16 items-center gap-3 !px-3.5 !py-3 hover:bg-subtle">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-foreground/80" aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          <span className="block truncate text-sm text-muted">{hint}</span>
        </span>
      </Link>
    </li>
  );
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default function Home() {
  const { feed, suggestions, briefs, orders, people, tryons, mac, loaded } = useData();
  const { user } = useAuth();
  const email = user?.email ?? "";
  const me = viewerPerson(email, user?.displayName, people);
  const person = me && me !== "family" ? (me as Person) : defaultPerson(email);
  const due = useDueFollowups(person, mac.live);
  const fit = useFitnessToday(person, mac.live);
  const nila = useNilaLine(mac.live);
  if (!loaded) return <ListSkeleton rows={3} />;

  const name = me ? personLabel(me) : user?.displayName?.split(" ")[0] ?? "";
  const mine = filterFeed(feed, me ?? "all", "all", (i) => toMillis(i.created_at) ?? 0);
  const unread = mine.filter((i) => i.status === "unread").length;
  const { needs: feedNeeds } = groupFeed(collapseHealth(mine).items, (i) => toMillis(i.created_at) ?? 0, Date.now());

  const needs: Need[] = [
    ...feedNeeds.map((i) => {
      // The generic health and parenting update items say nothing on their own; name whose record changed instead.
      const generic = updateLink(i);
      return {
        key: i.id,
        to: generic ? generic.to : `/feed/${i.id}`,
        title: generic ? generic.title : i.title,
        sub: generic ? personLabel(i.person) : i.severity === "urgent" ? "Urgent" : "To do",
        domain: feedItemDomain(i.domain),
        rank: i.severity === "urgent" ? 0 : 2,
      };
    }),
    ...(due ?? []).map((f) => ({
      key: `f-${f.id}`,
      to: `/health?p=${person}`,
      title: f.title,
      sub: f.overdue ? `Overdue, was due ${fmtDate(f.due)}` : `Due ${fmtDate(f.due)}`,
      domain: "health" as const,
      rank: f.overdue ? 1 : 3,
    })),
  ].sort((a, b) => a.rank - b.rank).slice(0, 3);

  const openBriefs = new Set(briefs.filter((b) => b.status === "open").map((b) => b.id));
  const newPicks = suggestions.filter((s) => openBriefs.has(s.brief_id) && effectiveStatus(s, orders) === "new").length;
  const onTheWay = orders.filter((o) => o.status === "ordered").length;
  const guide = people.find((p) => p.id === person)?.style_guide;
  const doneTryons = tryons.filter((t) => t.person === person && t.status === "done").length;

  const cards: { domain: Domain; to: string; name: string; line: string; highlight: boolean }[] = [
    {
      domain: "health", to: "/health", name: "Health",
      line: due === null ? (mac.live === false ? "Mac offline, records stay there" : "Reports and follow-ups") : due.length ? `${plural(due.length, "follow-up")} due` : "Nothing due soon",
      highlight: !!due?.length,
    },
    {
      domain: "fitness", to: `/fitness/today?p=${person}`, name: "Fitness",
      line: fit ? `${fit.done} of ${fit.total} done today` : mac.live === false ? "Mac offline, records stay there" : "Plan, checklist and trends",
      highlight: !!fit && fit.done < fit.total,
    },
    {
      domain: "parenting", to: "/nila/today", name: "Nila",
      line: nila ? nila.line : mac.live === false ? "Mac offline, records stay there" : "Milestones, sleep and help",
      highlight: !!nila?.highlight,
    },
    {
      domain: "shopping", to: "/shop", name: "Shopping",
      line: newPicks ? plural(newPicks, "new pick") : onTheWay ? `${plural(onTheWay, "order")} on the way` : "Briefs and picks",
      highlight: newPicks > 0 || onTheWay > 0,
    },
    {
      domain: "style", to: "/style", name: "Style",
      line: guide?.body ? "Style guide ready" : doneTryons ? plural(doneTryons, "try-on") : "Guide and try-ons",
      highlight: !!guide?.body,
    },
    { domain: "updates", to: "/updates", name: "Updates", line: unread ? `${unread} unread` : "All caught up", highlight: unread > 0 },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-7 px-4 pt-5 pb-6">
      <h1 className="text-[1.75rem] font-extrabold leading-tight">{greeting()}{name ? `, ${name}` : ""}</h1>

      <section aria-label="Needs you" className="space-y-2.5">
        <h2 className="text-lg font-extrabold">Needs you</h2>
        {needs.length === 0 ? (
          <p className="card !px-4 !py-3.5 text-muted">Nothing needs you right now.</p>
        ) : (
          <ul className="space-y-2">{needs.map((n) => <NeedRow key={n.key} n={n} />)}</ul>
        )}
      </section>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-6" data-testid="home-cards">
        {cards.map((c) => <DomainCard key={c.domain} {...c} />)}
      </ul>

      <ul className="grid gap-2 sm:grid-cols-2">
        <SmallCard to="/upload" icon={<UploadIcon size={20} />} title="Upload photos" hint="Wardrobe items and reference photos" />
        <SmallCard to="/more" icon={<GearIcon size={20} />} title="Settings and more" hint="New brief, sign out" />
      </ul>
    </div>
  );
}
