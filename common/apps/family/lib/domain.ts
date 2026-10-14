// The app's top-level areas. Each one gets its own accent colour, header name and bottom tabs.

export type Domain = "home" | "health" | "fitness" | "parenting" | "shopping" | "style" | "updates";

export function domainOf(pathname: string): Domain {
  if (/^\/health(\/|$)/.test(pathname)) return "health";
  if (/^\/fitness(\/|$)/.test(pathname)) return "fitness";
  if (/^\/nila(\/|$)/.test(pathname)) return "parenting";
  if (/^\/(shop|brief)(\/|$)/.test(pathname)) return "shopping";
  if (/^\/(style|tryons|upload)(\/|$)/.test(pathname)) return "style";
  if (/^\/(updates|feed)(\/|$)/.test(pathname)) return "updates";
  return "home";
}

export const DOMAIN_LABEL: Record<Domain, string> = { home: "Family", health: "Health", fitness: "Fitness", parenting: "Nila", shopping: "Shopping", style: "Style", updates: "Updates" };
export const DOMAIN_ROOT: Record<Domain, string> = { home: "/", health: "/health", fitness: "/fitness/today", parenting: "/nila/today", shopping: "/shop", style: "/style", updates: "/updates" };

/** Which area a feed item belongs to, from its `domain` field. */
export function feedItemDomain(d: string): Domain {
  if (d === "health") return "health";
  if (d === "fitness") return "fitness";
  if (d === "parenting") return "parenting";
  if (d === "shopping") return "shopping";
  if (d === "style" || d === "wardrobe") return "style";
  return "updates";
}

/** "Good morning" before noon, "Good afternoon" until 6pm, then "Good evening" (local time). */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
