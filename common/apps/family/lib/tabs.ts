// Tab lists, kept free of React so the static route files (app/apps/family/**/[tab]) can import
// them in generateStaticParams.

export const FITNESS_TABS = [
  ["today", "Today"],
  ["plan", "Plan"],
  ["trends", "Trends"],
  ["food", "Food"],
  ["tests", "Tests"],
] as const;

export const PARENTING_TABS = [
  ["today", "Today"],
  ["milestones", "Milestones"],
  ["food", "Food"],
  ["sleep", "Sleep"],
  ["help", "Help"],
] as const;

/** Every /fitness/:tab segment: the bottom tabs plus the Connect page. */
export const FITNESS_ROUTE_TABS: string[] = [...FITNESS_TABS.map(([t]) => t), "connect"];

/** Every /nila/:tab segment: the bottom tabs, the pages that open from a card (pages/parenting/Parenting.tsx)
 * and the old links that redirect (overview, ask). */
export const PARENTING_ROUTE_TABS: string[] = [
  ...PARENTING_TABS.map(([t]) => t),
  "about", "week", "jabs", "works", "focus", "research", "weeks", "questions", "overview", "ask",
];
