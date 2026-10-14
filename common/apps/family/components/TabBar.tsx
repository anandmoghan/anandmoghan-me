'use client';

import type { ReactNode } from "react";
import { familyHref, useLocation } from "@/common/apps/family/router";
import { TabBar as ShellTabBar } from "@/common/apps/shell/TabBar";
import {
  BagIcon, BellIcon, BookIcon, BowlIcon, BoxIcon, CameraIcon, ChartIcon, ChatIcon, CheckListIcon, ChildIcon, DocIcon, FlagIcon, FlaskIcon, HelpIcon, MoonIcon, StepsIcon, TargetIcon, TrendIcon, GridIcon, HeartPulseIcon, ImageIcon, LayersIcon, ListIcon, DotIcon, SparkleIcon,
} from "@/common/apps/family/components/Icons";
import { PinnedTab } from "@/common/apps/family/components/Pinned";
import { useData } from "@/common/apps/family/hooks/useData";
import { domainOf, type Domain } from "@/common/apps/family/lib/domain";
import { FITNESS_TABS, PARENTING_TABS } from "@/common/apps/family/lib/tabs";
import type { Suggestion } from "@/common/apps/family/types";

interface Tab { to: string; label: string; icon: ReactNode; active: boolean; dot?: boolean; colour?: Domain }

const url = (path: string, params: Record<string, string | null | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
};

/** The brief the shop tabs should keep: from the URL, or the brief of the product or look on screen. */
function currentBrief(pathname: string, params: URLSearchParams, suggestions: Suggestion[]): string | null {
  const fromUrl = params.get("brief");
  if (fromUrl) return fromUrl;
  const m = /^\/shop\/(?:p|looks)\/([^/]+)/.exec(pathname);
  return m ? suggestions.find((s) => s.id === decodeURIComponent(m[1]))?.brief_id ?? null : null;
}

function tabsFor(domain: Domain, pathname: string, params: URLSearchParams, suggestions: Suggestion[], unread: number): Tab[] {
  if (domain === "shopping") {
    const brief = currentBrief(pathname, params, suggestions);
    const onShop = pathname === "/shop";
    const view = onShop ? params.get("view") ?? "picks" : pathname.startsWith("/shop/looks/") ? "looks" : pathname.startsWith("/shop/p/") ? "picks" : null;
    return [
      { to: url("/shop", { brief }), label: "Picks", icon: <GridIcon />, active: view === "picks" || view === "products" },
      { to: url("/shop", { brief, view: "looks" }), label: "Looks", icon: <SparkleIcon />, active: view === "looks" },
      { to: url("/shop", { brief, view: "matches" }), label: "Matches", icon: <LayersIcon />, active: view === "matches" },
      { to: url("/shop", { brief, view: "orders" }), label: "Orders", icon: <BoxIcon />, active: view === "orders" },
    ];
  }
  if (domain === "health") {
    const report = /^\/health\/([a-z]+)\/reports\//.exec(pathname);
    const p = params.get("p") ?? report?.[1];
    const tab = report ? "reports" : params.get("tab") ?? "overview";
    return [
      { to: url("/health", { p, tab: null }), label: "Overview", icon: <HeartPulseIcon />, active: tab === "overview" },
      { to: url("/health", { p, tab: "reports" }), label: "Reports", icon: <DocIcon />, active: tab === "reports" },
      { to: url("/health", { p, tab: "results" }), label: "Results", icon: <ChartIcon />, active: tab === "results" },
      { to: url("/health", { p, tab: "questions" }), label: "Questions", icon: <ChatIcon />, active: tab === "questions" },
    ];
  }
  if (domain === "fitness") {
    const p = params.get("p");
    const tab = /^\/fitness\/([a-z]+)/.exec(pathname)?.[1] ?? "today";
    const icons: Record<string, ReactNode> = { today: <CheckListIcon />, plan: <TargetIcon />, trends: <TrendIcon />, food: <BowlIcon />, tests: <FlaskIcon /> };
    return [...FITNESS_TABS.map(([t, label]) => ({ to: url(`/fitness/${t}`, { p }), label, icon: icons[t], active: tab === t }))];
  }
  if (domain === "parenting") {
    // About Nila, a past week and the cards on Today open pages of their own, so Today stays lit there; Your questions belongs to Help.
    const raw = /^\/nila\/([a-z]+)/.exec(pathname)?.[1] ?? "today";
    const tab = ["about", "week", "overview", "jabs", "works", "focus", "research", "weeks"].includes(raw) ? "today" : raw === "questions" ? "help" : raw;
    const icons: Record<string, ReactNode> = { today: <ChildIcon />, milestones: <StepsIcon />, food: <BowlIcon />, sleep: <MoonIcon />, help: <HelpIcon /> };
    return [...PARENTING_TABS.map(([t, label]) => ({ to: `/nila/${t}`, label, icon: icons[t], active: tab === t }))];
  }
  if (domain === "style") {
    return [
      { to: "/style", label: "Guide", icon: <BookIcon />, active: pathname === "/style" },
      { to: "/tryons", label: "Try-ons", icon: <CameraIcon />, active: pathname === "/tryons" },
      { to: "/upload", label: "Photos", icon: <ImageIcon />, active: pathname === "/upload" },
    ];
  }
  if (domain === "updates") {
    const show = pathname === "/updates" ? params.get("show") ?? "all" : null;
    const p = params.get("p");
    return [
      { to: url("/updates", { p }), label: "All", icon: <ListIcon />, active: show === "all" },
      { to: url("/updates", { p, show: "unread" }), label: "Unread", icon: <DotIcon />, active: show === "unread", dot: unread > 0 },
      { to: url("/updates", { p, show: "todo" }), label: "Needs you", icon: <FlagIcon />, active: show === "todo" },
    ];
  }
  return [
    { to: "/health", label: "Health", icon: <HeartPulseIcon />, active: false, colour: "health" },
    { to: "/shop", label: "Shopping", icon: <BagIcon />, active: false, colour: "shopping" },
    { to: "/style", label: "Style", icon: <SparkleIcon />, active: false, colour: "style" },
    { to: "/updates", label: "Updates", icon: <BellIcon />, active: false, dot: unread > 0, colour: "updates" },
  ];
}

/** Bottom tabs for the area on screen (shell TabBar: a full-width bar on phones, a floating pill on wide screens).
 * The area's own sections, its main page first (family home is in the header). Links into another area are tinted in its colour. */
export default function TabBar() {
  const { feed, suggestions } = useData();
  const { pathname, search } = useLocation();
  const unread = feed.filter((f) => f.status === "unread").length;
  const domain = domainOf(pathname);
  const tabs = tabsFor(domain, pathname, new URLSearchParams(search), suggestions, unread);
  return (
    <ShellTabBar
      label="Main"
      extra={<PinnedTab />}
      tabs={tabs.map((t) => ({ href: familyHref(t.to), label: t.label, icon: t.icon, active: t.active, dot: t.dot, domain: t.colour }))}
    />
  );
}

