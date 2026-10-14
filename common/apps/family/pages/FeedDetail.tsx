'use client';

import { useEffect, useRef } from "react";
import { Link, useParams } from "@/common/apps/family/router";
import { useData } from "@/common/apps/family/hooks/useData";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { ListSkeleton } from "@/common/apps/family/components/Skeleton";
import Thumbs from "@/common/apps/family/components/Thumbs";
import { SectionedMarkdown } from "@/common/apps/family/components/Points";
import { Meta, outlineBtn, primaryBtn } from "@/common/apps/family/components/ui";
import { ChevronRightIcon } from "@/common/apps/family/components/Icons";
import { BackLink } from "@/common/apps/family/pages/Product";
import { domainLabel, linkedSuggestions } from "@/common/apps/family/lib/feed";
import { setFeedStatus } from "@/common/apps/family/lib/writes";
import { personLabel, timeAgo } from "@/common/apps/family/lib/format";

export default function FeedDetail() {
  const { id = "" } = useParams();
  const { feed, suggestions, loaded } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const email = user?.email ?? "";
  const item = feed.find((f) => f.id === id);
  const opened = useRef<string | null>(null);

  // Opening an unread item marks it read, once per visit.
  useEffect(() => {
    if (!item || item.status !== "unread" || opened.current === item.id) return;
    opened.current = item.id;
    setFeedStatus(email, item.id, "read").catch(() => toast.show({ message: "Could not save", error: true }));
  }, [item, email, toast]);

  if (!loaded) return <ListSkeleton rows={3} />;
  if (!item) return <div className="px-4 pt-8 text-center text-muted">This item is not here any more. <Link to="/updates" className="font-semibold text-domain underline">Back to updates</Link></div>;

  const linked = linkedSuggestions(item, suggestions);
  const briefs = (item.links ?? []).filter((l) => l.kind === "brief");
  const set = (s: "read" | "done") => setFeedStatus(email, item.id, s).catch(() => toast.show({ message: "Could not save", error: true }));

  return (
    <article className="mx-auto max-w-2xl px-4 pt-3 pb-6">
      <BackLink fallback="/updates" label="Back to updates" />
      <h1 className="mt-3 text-[1.6rem] font-extrabold leading-tight">{item.title}</h1>
      <Meta className="mt-2" parts={[personLabel(item.person), domainLabel(item.domain), timeAgo(item.created_at), item.status === "done" && "Done"]} />
      {item.body && (
        <div className="card mt-5 !p-4 sm:!p-5">
          <SectionedMarkdown text={item.body} max={5} />
        </div>
      )}
      {(linked.length > 0 || briefs.length > 0) && (
        <section className="mt-7">
          <h2 className="text-lg font-extrabold">Linked</h2>
          {linked.length > 0 && (
            <ul className="mt-2.5 space-y-2">
              {linked.slice(0, 12).map((s) => (
                <li key={s.id}>
                  <Link to={`/shop/p/${s.id}`} className="tap card flex items-center gap-3 !p-3 hover:bg-subtle">
                    <Thumbs items={[s]} />
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.title}</span>
                    <span className="shrink-0 text-muted"><ChevronRightIcon /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {briefs.map((b) => (
            <Link key={b.id} to={`/shop?brief=${b.id}`} className={`${outlineBtn} mt-3`}>Open brief</Link>
          ))}
        </section>
      )}
      {item.status !== "done" && (
        <div className="mt-7 flex gap-2">
          {item.status === "unread" && <button type="button" onClick={() => set("read")} className={`${outlineBtn} flex-1`}>Mark read</button>}
          <button type="button" onClick={() => set("done")} className={`${primaryBtn} flex-1`}>Mark done</button>
        </div>
      )}
    </article>
  );
}
