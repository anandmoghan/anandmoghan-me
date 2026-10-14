'use client';

import type { CSSProperties } from "react";
import { Link, useSearchParams } from "@/common/apps/family/router";
import { useData } from "@/common/apps/family/hooks/useData";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import { DOMAIN_ICON, GearIcon } from "@/common/apps/family/components/Icons";
import { Points } from "@/common/apps/family/components/Points";
import { FilterChip, PageTitle, Segmented, outlineBtn } from "@/common/apps/family/components/ui";
import { FEED_PEOPLE, domainLabel, filterFeed, firstImage, collapseHealth, groupFeed, isTodo, updateLink, linkedSuggestions, viewerPerson } from "@/common/apps/family/lib/feed";
import { feedItemDomain } from "@/common/apps/family/lib/domain";
import { img } from "@/common/apps/family/lib/shop";
import { markAllRead } from "@/common/apps/family/lib/writes";
import { personLabel, timeAgo, toMillis } from "@/common/apps/family/lib/format";
import type { FeedItem, Suggestion } from "@/common/apps/family/types";

const tint = (d: string) => (d === "system" ? undefined : ({ "--domain": `var(--${feedItemDomain(d)})` }) as CSSProperties);

function DomainIcon({ domain, small = false }: { domain: string; small?: boolean }) {
  const Icon = domain === "system" ? GearIcon : DOMAIN_ICON[feedItemDomain(domain)];
  return (
    <span className={["flex shrink-0 items-center justify-center rounded-xl", small ? "h-8 w-8" : "h-11 w-11", domain === "system" ? "bg-subtle text-muted" : "bg-domain/[0.14] text-domain"].join(" ")} aria-hidden>
      <Icon size={small ? 17 : 22} />
    </span>
  );
}

function Thumbs({ items }: { items: Suggestion[] }) {
  // At most 4 tiles so the row fits a phone: 4 thumbnails, or 3 plus a "+N" tile.
  const shown = items.length > 4 ? items.slice(0, 3) : items;
  const extra = items.length - shown.length;
  return (
    <div className="mt-3 flex items-center gap-2" data-testid="feed-thumbs">
      {shown.map((s) => {
        const src = img(firstImage(s), 320);
        const cls = "h-[4.5rem] w-14 shrink-0 rounded-xl object-cover";
        return src ? <img key={s.id} src={src} alt="" loading="lazy" decoding="async" width={56} height={72} className={cls} /> : <span key={s.id} className={`${cls} bg-subtle`} aria-hidden />;
      })}
      {extra > 0 && <span className="flex h-[4.5rem] w-14 shrink-0 items-center justify-center rounded-xl bg-subtle text-sm font-bold text-muted">+{extra}</span>}
    </div>
  );
}

function Row({ item, suggestions, now, need = false, count = 1 }: { item: FeedItem; suggestions: Suggestion[]; now: number; need?: boolean; count?: number }) {
  const unread = item.status === "unread";
  const done = item.status === "done";
  const urgent = item.severity === "urgent";
  const todo = isTodo(item);
  const generic = updateLink(item);
  const to = generic ? generic.to : `/feed/${item.id}`;
  const title = generic && count > 1 ? generic.title : item.title;
  const when = timeAgo(item.created_at, now);
  // The whole card is the link (an overlay), so the Read more button inside it can stay a real button.
  const overlay = <Link to={to} aria-label={title} className="absolute inset-0 rounded-2xl" />;

  if (item.domain === "system") {
    return (
      <li id={item.id}>
        <div className={`tap card relative flex min-h-14 items-center gap-3 !px-3.5 !py-2.5 hover:bg-subtle ${done ? "opacity-60" : ""}`}>
          {overlay}
          <DomainIcon domain="system" small />
          <p className={`min-w-0 flex-1 truncate text-[0.95rem] ${unread ? "font-bold" : "text-muted"}`}>{item.title}</p>
          {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-domain" role="img" aria-label="Unread" />}
          <span className="shrink-0 text-sm text-muted">{when}</span>
        </div>
      </li>
    );
  }

  const thumbs = linkedSuggestions(item, suggestions);
  return (
    <li id={item.id} style={tint(item.domain)}>
      <div
        className={[
          "card relative !p-4 transition-colors hover:bg-subtle/60",
          need ? (urgent ? "ring-2 ring-destructive/35" : "ring-2 ring-[color-mix(in_srgb,var(--todo)_30%,transparent)]") : "",
          done ? "opacity-60" : "",
        ].join(" ")}
      >
        {overlay}
        <div className="flex items-start gap-3">
          <DomainIcon domain={item.domain} />
          <div className="min-w-0 flex-1">
            {todo && (
              <p className={["mb-1 inline-flex rounded-full px-2.5 py-0.5 text-[0.78rem] font-bold", urgent ? "bg-destructive/[0.12] text-destructive" : "bg-[color-mix(in_srgb,var(--todo)_12%,transparent)] text-[var(--todo)]"].join(" ")}>
                {urgent ? "Urgent" : "To do"}
              </p>
            )}
            <div className="flex items-start gap-2">
              <p className={`line-clamp-2 flex-1 text-[1.05rem] leading-snug ${unread ? "font-extrabold" : "font-semibold"}`}>{title}</p>
              {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-domain" role="img" aria-label="Unread" />}
            </div>
            {item.body && <Points text={item.body} max={3} clamp small className="mt-1.5" />}
            {thumbs.length > 0 && <Thumbs items={thumbs} />}
            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span>{personLabel(item.person)}</span>
              <span aria-hidden>·</span>
              <span>{domainLabel(item.domain)}</span>
              {when && (<><span aria-hidden>·</span><span>{when}</span></>)}
              {count > 1 && (<><span aria-hidden>·</span><span>{count} updates</span></>)}
              {done && (<><span aria-hidden>·</span><span>Done</span></>)}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

const SHOW_TITLE: Record<string, string> = { all: "Updates", unread: "Unread", todo: "Needs you" };

export default function Feed() {
  const { feed, suggestions, people, loaded } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  if (!loaded) return <ListSkeleton />;

  const me = viewerPerson(user?.email ?? "", user?.displayName, people);
  // Default to the signed-in person's view; ?p=all is Everyone.
  const person = params.get("p") ?? me ?? "all";
  const domain = params.get("d") ?? "all";
  const rawShow = params.get("show");
  const show = rawShow === "unread" || rawShow === "todo" ? rawShow : "all";
  const setFilter = (key: "p" | "d", value: string) => {
    const next = new URLSearchParams(params);
    if (key === "d" && value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const domains = ["all", ...Array.from(new Set(feed.map((f) => f.domain))).sort()];
  const filtered = filterFeed(feed, person, domain, (i) => toMillis(i.created_at) ?? 0);
  const items = filtered.filter((i) => (show === "unread" ? i.status === "unread" : show === "todo" ? isTodo(i) : true));
  const unread = filtered.filter((i) => i.status === "unread");
  const now = Date.now();
  const collapsed = collapseHealth(items);
  const { needs, more, moreFirstId, groups } = groupFeed(collapsed.items, (i) => toMillis(i.created_at) ?? 0, now, show === "all");
  const row = (i: FeedItem, need = false) => <Row key={i.id} item={i} suggestions={suggestions} now={now} need={need} count={collapsed.counts.get(i.id)} />;
  const filtering = person !== "all" || domain !== "all";

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-5 pb-6">
      <PageTitle
        title={SHOW_TITLE[show]}
        sub={unread.length > 0 ? `${unread.length} unread of ${filtered.length}` : `${filtered.length} ${filtered.length === 1 ? "item" : "items"}, all read`}
        action={unread.length > 0 && (
          <button type="button" onClick={() => markAllRead(user?.email ?? "", unread).catch(() => toast.show({ message: "Could not save", error: true }))} className={outlineBtn}>
            Mark all read ({unread.length})
          </button>
        )}
      />

      <div className="space-y-2.5">
        <Segmented
          label="Filter by person"
          value={person}
          onChange={(p) => setFilter("p", p)}
          options={[["all", "Everyone"], ...FEED_PEOPLE.map((p) => [p, personLabel(p)] as const)]}
        />
        {domains.length > 2 && (
          <div className="scroll-hide -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Filter by domain">
            {domains.map((d) => (
              <FilterChip key={d} active={domain === d} onClick={() => setFilter("d", d)}>
                {d === "all" ? "All areas" : domainLabel(d)}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card !px-4 !py-8 text-center text-muted">
          <p>{show === "todo" ? "Nothing needs you right now." : show === "unread" ? "You're all caught up." : `Nothing here${filtering ? " for this filter" : " yet"}.`}</p>
          {filtering && (
            <button type="button" onClick={() => setParams(show === "all" ? { p: "all" } : { p: "all", show }, { replace: true })} className="mt-2 min-h-11 font-semibold text-domain underline">Show everyone</button>
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {needs.length > 0 && (
            <section>
              <h2 className="text-lg font-extrabold">Needs you</h2>
              <ul className="mt-2.5 space-y-3">{needs.map((i) => row(i, true))}</ul>
              {more > 0 && (
                <button type="button" onClick={() => document.getElementById(moreFirstId ?? "")?.scrollIntoView({ behavior: "smooth", block: "center" })} className="mt-1 px-1 text-[0.95rem] font-bold text-[var(--todo)] underline-offset-2 hover:underline">
                  and {more} more
                </button>
              )}
            </section>
          )}
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="text-lg font-extrabold">{g.label}</h2>
              <ul className="mt-2.5 space-y-3">{g.items.map((i) => row(i))}</ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
