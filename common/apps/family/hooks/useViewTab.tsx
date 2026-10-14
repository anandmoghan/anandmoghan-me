"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "@/common/apps/family/router";

interface SubLabel { label: string | null; setLabel: (label: string | null) => void }

const SubLabelContext = createContext<SubLabel>({ label: null, setLabel: () => {} });

/** Holds the label of the sub-tab on screen, so the pin button can name it. */
export function SubLabelProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  return <SubLabelContext.Provider value={{ label, setLabel }}>{children}</SubLabelContext.Provider>;
}

/** The label of the page's current sub-tab, or null when the page has none. */
export function useSubLabel(): string | null {
  return useContext(SubLabelContext).label;
}

/**
 * A page's view tabs, kept in the URL as ?view=<key> so a tab can be linked and pinned. The fallback
 * view is the one without a param. Switching replaces the history entry and keeps the other params.
 * While a ?view= is set, its label is published for the pin button.
 */
export function useViewTab<T extends string>(views: readonly (readonly [T, string])[], fallback: T): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams();
  const { setLabel } = useContext(SubLabelContext);
  const asked = views.find(([key]) => key === params.get("view"));
  const view = asked ? asked[0] : fallback;
  const label = asked ? asked[1] : null;

  useEffect(() => {
    setLabel(label);
    return () => setLabel(null);
  }, [label, setLabel]);

  function setView(next: T) {
    const query = new URLSearchParams(params);
    if (next === fallback) query.delete("view");
    else query.set("view", next);
    setParams(query, { replace: true });
  }
  return [view, setView];
}

/** The slug used as a view key for free-text headings. */
export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
