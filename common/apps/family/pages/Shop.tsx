'use client';

import { useMemo, type ReactNode } from "react";
import { Link, useSearchParams } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useData } from "@/common/apps/family/hooks/useData";
import { useShopActions } from "@/common/apps/family/hooks/useShopActions";
import { FilterChip, PageTitle, primaryBtn } from "@/common/apps/family/components/ui";
import { CloseIcon, HeartIcon, RestoreIcon } from "@/common/apps/family/components/Icons";
import Price from "@/common/apps/family/components/Price";
import ProductImage from "@/common/apps/family/components/ProductImage";
import LookCard from "@/common/apps/family/components/LookCard";
import SetCard from "@/common/apps/family/components/SetCard";
import OrdersView from "@/common/apps/family/components/OrdersView";
import SyncBadge from "@/common/apps/family/components/SyncBadge";
import FindMore from "@/common/apps/family/components/FindMore";
import { GridSkeleton } from "@/common/apps/family/components/Skeleton";
import { formatMoney, personLabel } from "@/common/apps/family/lib/format";
import {
  buildLooks, buildShortlistSets, suggestAddOns, wardrobeSummary, categoryChipLabel, effectiveStatus, lookPath, retailerLabel, fullName, shortTitle, sortCategories, sortLooks, sortPicks, byFavThenPriority, type Look,
} from "@/common/apps/family/lib/shop";
import { itemPerson, latestLookTryon } from "@/common/apps/family/lib/tryon";
import type { Brief, Category, Suggestion, SuggestionStatus } from "@/common/apps/family/types";


/** Short brief label: the person, plus the brief's own name when that person has several briefs. */
function briefLabel(b: Brief, all: Brief[]): string {
  const name = personLabel(b.person);
  if (all.filter((x) => x.person === b.person).length < 2) return name;
  const rest = b.title.replace(/^\w+: /, "");
  return `${name}, ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
}

/** Horizontal scroller with a right fade so overflow is obvious. */
function Fade({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
    </div>
  );
}

function Tile({
  s, status, priority, completes, actions,
}: {
  s: Suggestion;
  status: SuggestionStatus;
  priority: boolean;
  completes: boolean;
  actions: ReturnType<typeof useShopActions>;
}) {
  const name = fullName(s.title, s.brand);
  const dismissed = status === "dismissed";
  const round = "absolute top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-card backdrop-blur-sm hover:bg-surface";
  return (
    <li className="card card--flush relative overflow-hidden">
      <Link to={`/shop/p/${s.id}`} aria-label={name} className={["tap block pb-3", dismissed ? "opacity-60" : ""].join(" ")}>
        <ProductImage set={s.images?.[0]} fullPage={s.full_page} priority={priority} />
        <div className="px-3 pt-2.5">
          <p className="truncate text-sm font-extrabold">{s.brand ?? retailerLabel(s.retailer)}</p>
          <p className="truncate text-sm text-muted">{shortTitle(s.title, s.brand)}</p>
          <div className="mt-0.5"><Price price={s.price} mrp={s.mrp} /></div>
          {completes && <p className="mt-1 text-[0.8rem] font-bold text-domain">Completes your wardrobe</p>}
          {dismissed && s.dismiss_reason && <p className="mt-0.5 truncate text-sm text-muted">{s.dismiss_reason}</p>}
        </div>
      </Link>
      {status === "ordered" && <span className="absolute left-2 top-2 rounded-full bg-foreground/85 px-2.5 py-1 text-[0.78rem] font-bold text-background">Ordered</span>}
      {dismissed && (
        <button type="button" aria-label={`Restore ${name}`} onClick={() => actions.restore(s.id)} className={`${round} left-1.5`}>
          <RestoreIcon />
        </button>
      )}
      {(status === "new" || status === "shortlisted") && (
        <>
          <button type="button" aria-label={`Dismiss ${name}`} onClick={() => actions.dismiss(s.id)} className={`${round} left-1.5`}>
            <CloseIcon />
          </button>
          <button
            type="button"
            aria-label={status === "shortlisted" ? `Remove ${name} from shortlist` : `Shortlist ${name}`}
            aria-pressed={status === "shortlisted"}
            onClick={() => (status === "shortlisted" ? actions.unshortlist(s.id) : actions.shortlist(s.id))}
            className={`${round} right-1.5 ${status === "shortlisted" ? "text-destructive" : ""}`}
          >
            <HeartIcon filled={status === "shortlisted"} />
          </button>
        </>
      )}
    </li>
  );
}

/** For each bottom, a strip of every top that matches it. Liked bottoms and tops come first. */
function PairingsView({ looks, fav }: { looks: Look[]; fav: (s: Suggestion) => boolean }) {
  const { user } = useAuth();
  const { tryons } = useData();
  const bottoms = Array.from(new Map(looks.map((l) => [l.bottom.id, l.bottom])).values()).sort(byFavThenPriority(fav));
  return (
    <div className="mt-4 space-y-7">
      {bottoms.map((bottom) => {
        const strip = looks.filter((l) => l.bottom.id === bottom.id).sort((a, b) => byFavThenPriority(fav)(a.top, b.top));
        const person = itemPerson(bottom.person, user?.email);
        return (
          <section key={bottom.id} aria-label={`Tops for ${shortTitle(bottom.title, bottom.brand)}`}>
            <Link to={`/shop/p/${bottom.id}`} aria-label={fullName(bottom.title, bottom.brand)} className="tap flex items-center gap-3">
              <div className="w-14 shrink-0 overflow-hidden rounded-xl"><ProductImage set={bottom.images?.[0]} fullPage={bottom.full_page} /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{bottom.brand ?? retailerLabel(bottom.retailer)}</p>
                <p className="truncate text-sm text-muted">{shortTitle(bottom.title, bottom.brand)}</p>
                <Price price={bottom.price} mrp={bottom.mrp} />
              </div>
            </Link>
            <p className="mt-2 text-sm text-muted">{strip.length} {strip.length === 1 ? "top matches" : "tops match"}</p>
            <Fade>
              <ul className="scroll-hide mt-1 flex items-start gap-2 overflow-x-auto pr-8">
                {strip.map((look) => {
                  const has = !!latestLookTryon(tryons, person, look);
                  return (
                    <li key={look.top.id} className="w-28 shrink-0">
                      <Link to={`/shop/p/${look.top.id}`} aria-label={fullName(look.top.title, look.top.brand)} className="tap relative block">
                        <div className="overflow-hidden rounded-xl"><ProductImage set={look.top.images?.[0]} fullPage={look.top.full_page} /></div>
                        {has && <span className="absolute left-1.5 top-1.5 rounded-full bg-surface/90 px-2 py-0.5 text-[0.75rem] font-bold text-domain">On you</span>}
                        <p className="mt-1 truncate text-sm text-muted">{shortTitle(look.top.title, look.top.brand)}</p>
                        <Price price={look.top.price} mrp={look.top.mrp} />
                      </Link>
                      {has && (
                        <Link to={lookPath(look)} className="tap inline-flex min-h-11 items-center text-sm font-bold text-domain underline">See look</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Fade>
          </section>
        );
      })}
    </div>
  );
}

/** Outfit sets from the liked pieces, then every pairing tucked away below. */
function MatchesView({ sets, looks, fav, onPicks, summary, addOns, actions }: {
  sets: Look[]; looks: Look[]; fav: (s: Suggestion) => boolean; onPicks: () => void;
  summary: ReturnType<typeof wardrobeSummary>; addOns: ReturnType<typeof suggestAddOns>; actions: ReturnType<typeof useShopActions>;
}) {
  return (
    <div className="mt-5 px-4">
      <section aria-label="Your wardrobe" className="card !p-4">
        <h2 className="text-lg font-extrabold">Your wardrobe</h2>
        <p className="text-sm text-muted">{sets.length} outfit {sets.length === 1 ? "set" : "sets"} from what you liked</p>
        <ul className="mt-3 grid grid-cols-5 gap-1.5" data-testid="wardrobe-summary">
          {summary.map((x) => (
            <li key={x.key} className={`rounded-xl px-1 py-2 text-center ${x.full ? "bg-domain/[0.12]" : "bg-subtle"}`}>
              <p className={`text-lg font-extrabold ${x.full ? "text-domain" : ""}`}>{x.count}{x.full && <span className="sr-only"> (enough)</span>}{x.full && <span aria-hidden className="ml-0.5 text-sm">✓</span>}</p>
              <p className="truncate text-[0.75rem] text-muted">{x.label}</p>
            </li>
          ))}
        </ul>
      </section>
      {addOns.length > 0 && (
        <section aria-label="Great add-ons" className="mt-7">
          <h2 className="text-lg font-extrabold">Great add-ons</h2>
          <p className="text-sm text-muted">Not liked yet, and they would round out your wardrobe.</p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="add-ons">
            {addOns.map(({ item, reason }) => {
              const name = fullName(item.title, item.brand);
              return (
                <li key={item.id} className="card card--flush relative overflow-hidden">
                  <Link to={`/shop/p/${item.id}`} aria-label={name} className="tap block pb-3">
                    <ProductImage set={item.images?.[0]} fullPage={item.full_page} />
                    <div className="px-3 pt-2.5">
                      <p className="truncate text-sm text-muted">{shortTitle(item.title, item.brand)}</p>
                      <Price price={item.price} mrp={item.mrp} />
                      <p className="mt-1 text-[0.8rem] font-bold text-domain">{reason}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label={`Shortlist ${name}`}
                    aria-pressed={false}
                    onClick={() => actions.shortlist(item.id)}
                    className="absolute right-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 text-foreground shadow-card backdrop-blur-sm hover:bg-surface"
                  >
                    <HeartIcon filled={false} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <h2 className="mt-7 text-lg font-extrabold">Outfit sets</h2>
      {sets.length === 0 ? (
        <div className="card mt-3 !px-4 !py-6 text-center">
          <p className="text-muted">Heart a few tops, bottoms, shoes and accessories in Picks and your outfit sets show up here.</p>
          <button type="button" onClick={onPicks} className={`${primaryBtn} mt-4`}>Go to Picks</button>
        </div>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
          {sets.map((set) => <SetCard key={`${set.bottom.id}-${set.top.id}`} set={set} />)}
        </ul>
      )}
      {looks.length > 0 && (
        <details className="card mt-7 !px-4 !pb-4">
          <summary className="tap flex min-h-14 cursor-pointer items-center text-lg font-extrabold">All pairings</summary>
          <PairingsView looks={looks} fav={fav} />
        </details>
      )}
    </div>
  );
}

/** Keeps the picks in the order they were first shown in this tab, so liking an item doesn't make it jump to the
 * top under your finger, and Back returns to the same spot. New picks join at the end in priority order; a reload
 * (new tab session) sorts afresh. The order lives in sessionStorage, which may be unavailable (private mode). */
function stableOrder<T extends { s: Suggestion }>(briefId: string | undefined, sorted: T[]): T[] {
  if (!briefId) return sorted;
  const key = `pm-picks-order:${briefId}`;
  let saved: string[] = [];
  try {
    saved = JSON.parse(sessionStorage.getItem(key) ?? "[]") as string[];
  } catch {
    saved = [];
  }
  const rank = new Map(saved.map((id, i) => [id, i]));
  sorted.forEach((x, i) => { if (!rank.has(x.s.id)) rank.set(x.s.id, saved.length + i); });
  const result = sorted.slice().sort((a, b) => rank.get(a.s.id)! - rank.get(b.s.id)!);
  try {
    sessionStorage.setItem(key, JSON.stringify(result.map((x) => x.s.id)));
  } catch {
    // ordering just won't persist
  }
  return result;
}

export default function Shop() {
  const { briefs, suggestions, orders, tryons, loaded } = useData();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const actions = useShopActions(suggestions);

  const sortedBriefs = useMemo(() => briefs.slice().sort((a, b) => (a.status === b.status ? a.id.localeCompare(b.id) : a.status === "open" ? -1 : 1)), [briefs]);
  const brief = sortedBriefs.find((b) => b.id === params.get("brief")) ?? sortedBriefs[0];
  const rawView = params.get("view");
  const view = rawView === "looks" || rawView === "matches" || rawView === "orders" ? rawView : "products";
  const showDismissed = params.get("dismissed") === "1";

  const mine = useMemo(() => stableOrder(brief?.id, sortPicks(suggestions.filter((s) => s.brief_id === brief?.id).map((s) => ({ s, status: effectiveStatus(s, orders) })))), [suggestions, orders, brief]);

  if (!loaded) return <GridSkeleton />;
  if (!brief) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10 text-center">
        <p className="text-xl font-extrabold">No briefs yet</p>
        <p className="mt-1 text-muted">Start one and the Mac will find picks.</p>
        <Link to="/brief/new" className={`${primaryBtn} mt-5`}>New brief</Link>
      </div>
    );
  }

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v === null ? next.delete(k) : next.set(k, v));
    setParams(next, { replace: true });
  };

  const visible = mine.filter((x) => x.status !== "dismissed");
  const shortlisted = visible.filter((x) => x.status === "shortlisted").length;
  const ordered = visible.filter((x) => x.status === "ordered").length;
  const dismissedCount = mine.length - visible.length;
  const categories = sortCategories(Array.from(new Set(visible.map((x) => x.s.category))) as Category[]);
  const rawCat = params.get("category") ?? "all";
  const category = rawCat === "shortlisted" || categories.includes(rawCat as Category) ? rawCat : "all";
  const shown = (showDismissed ? mine : visible).filter((x) =>
    category === "all" ? true : category === "shortlisted" ? x.status === "shortlisted" : x.s.category === category,
  );
  const spend = visible.filter((x) => x.status === "shortlisted" || x.status === "ordered").reduce((sum, x) => sum + (x.s.price?.amount ?? 0), 0);
  const liked = new Set(mine.filter((x) => x.status === "shortlisted" || x.status === "ordered").map((x) => x.s.id));
  const fav = (s: Suggestion) => liked.has(s.id);
  const allLooks = buildLooks(mine.map((x) => x.s));
  const sets = buildShortlistSets(mine.map((x) => x.s), fav);
  const summary = wardrobeSummary(mine.map((x) => x.s), fav);
  const addOns = suggestAddOns(mine.map((x) => x.s), fav);
  const addOnIds = new Set(addOns.map((a) => a.item.id));
  // 2 when the look has a styled try-on (shoes or accessories included), else 0.
  const photoRank = (l: Look) => {
    const t = latestLookTryon(tryons, itemPerson(l.bottom.person, user?.email), l);
    return t ? 2 : 0;
  };
  // Looks is the curated tab (Anand, 2026-10-06): one top, one bottom, accessorised, so only looks with a styled
  // try-on, one per bottom. Everything else stays reachable on the Matches tab (hidden here, never deleted). Until
  // anything is styled, fall back to the best look per bottom.
  const seenBottoms = new Set<string>();
  const ranked = sortLooks(allLooks, fav)
    .map((l) => ({ l, r: photoRank(l) }))
    .sort((a, b) => b.r - a.r);
  const curated = ranked.some((x) => x.r === 2) ? ranked.filter((x) => x.r === 2) : ranked;
  const looks = curated.map((x) => x.l).filter((l) => !seenBottoms.has(l.bottom.id) && !!seenBottoms.add(l.bottom.id));

  const VIEW_TITLE = { products: "Picks", looks: "Looks", matches: "Matches", orders: "Orders" } as const;
  const budgetShare = brief.budget ? Math.min(1, spend / brief.budget.amount) : 0;

  return (
    <div>
      {view !== "orders" && (
        <div className="px-4 pt-4">
          <Fade>
            <div className="scroll-hide -mx-4 flex gap-2 overflow-x-auto px-4 pr-10" role="tablist" aria-label="Briefs">
              {sortedBriefs.map((b) => (
                <FilterChip key={b.id} role="tab" active={b.id === brief.id} onClick={() => set({ brief: b.id, category: null })}>
                  {briefLabel(b, sortedBriefs)}
                </FilterChip>
              ))}
              <Link to="/brief/new" className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted hover:border-foreground/40 hover:text-foreground">
                New brief
              </Link>
            </div>
          </Fade>
        </div>
      )}

      <div className="px-4 pt-4">
        {view === "orders" ? (
          <PageTitle title="Orders" sub={`${orders.length} ${orders.length === 1 ? "order" : "orders"} across every brief`} />
        ) : (
          <>
            <PageTitle
              title={VIEW_TITLE[view]}
              sub={`${visible.length} picks, ${shortlisted} liked, ${ordered} ordered`}
              action={<FindMore brief={brief} />}
            />
            <div className="card mt-3 !px-4 !py-3">
              <p className="text-[0.95rem] font-semibold leading-snug">{brief.title}</p>
              {brief.budget && (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-subtle" aria-hidden>
                    <div className={`h-full rounded-full ${spend > brief.budget.amount ? "bg-gold" : "bg-domain"}`} style={{ width: `${Math.max(2, budgetShare * 100)}%` }} />
                  </div>
                  <p className="mt-1.5 text-sm text-muted">
                    {formatMoney(spend, brief.budget.currency)} of {formatMoney(brief.budget.amount, brief.budget.currency)} budget
                  </p>
                </>
              )}
            </div>
            <SyncBadge docs={mine.map((x) => x.s)} />
          </>
        )}
      </div>

      {view === "orders" ? (
        <div className="mt-4 px-4"><OrdersView /></div>
      ) : view === "products" ? (
        <>
          <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[5] mt-2 bg-background/95 px-4 py-2.5 backdrop-blur-md">
            <Fade><div className="scroll-hide -mx-4 flex gap-2 overflow-x-auto px-4 pr-10" role="group" aria-label="Filter by category">
              <FilterChip active={category === "all"} onClick={() => set({ category: null })}>
                All {visible.length}
              </FilterChip>
              <FilterChip active={category === "shortlisted"} onClick={() => set({ category: "shortlisted" })}>
                Shortlisted {shortlisted}
              </FilterChip>
              {categories.map((c) => (
                <FilterChip key={c} active={category === c} onClick={() => set({ category: c })}>
                  {categoryChipLabel(c)} {visible.filter((x) => x.s.category === c).length}
                </FilterChip>
              ))}
            </div></Fade>
          </div>
          <div className="px-4">
            {shown.length === 0 ? (
              <p className="mt-8 text-center text-muted">{mine.length === 0 ? "No picks yet. The Mac will add some." : "Nothing here. Try another filter."}</p>
            ) : (
              <ul className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                {shown.map((x, i) => (
                  <Tile key={x.s.id} s={x.s} status={x.status} priority={i < 4} completes={addOnIds.has(x.s.id)} actions={actions} />
                ))}
              </ul>
            )}
            {(dismissedCount > 0 || showDismissed) && (
              <button type="button" onClick={() => set({ dismissed: showDismissed ? null : "1" })} className="mt-5 min-h-11 font-semibold text-domain underline">
                {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissedCount})`}
              </button>
            )}
          </div>
        </>
      ) : view === "matches" ? (
        <MatchesView sets={sets} looks={allLooks} fav={fav} onPicks={() => set({ view: null })} summary={summary} addOns={addOns} actions={actions} />
      ) : looks.length === 0 ? (
        <p className="mt-8 px-4 text-center text-muted">No looks yet. They appear once trousers have tops paired with them.</p>
      ) : (
        <ul className="mt-5 grid grid-cols-1 gap-4 px-4 md:grid-cols-2">
          {looks.map((look) => <LookCard key={`${look.bottom.id}-${look.top.id}`} look={look} />)}
        </ul>
      )}
      <div className="h-6" />
      {actions.sheet}
    </div>
  );
}

