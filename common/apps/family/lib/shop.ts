import type { Category, ImageSet, Order, Retailer, Suggestion, SuggestionStatus } from "@/common/apps/family/types";

export const DISMISS_REASONS = [
  "Too expensive",
  "Can buy in UK",
  "Not my style",
  "Colour",
  "Fit or size",
  "Fabric",
  "Already have similar",
] as const;

const CATEGORY_ORDER: Category[] = [
  "top", "bottom", "knitwear", "outerwear", "footwear", "accessory", "innerwear", "dress", "ethnic", "activewear", "nightwear",
];
const CATEGORY_PLURALS: Record<Category, string> = {
  top: "Tops", bottom: "Bottoms", knitwear: "Knitwear", outerwear: "Outerwear", footwear: "Footwear", accessory: "Accessories",
  innerwear: "Innerwear", dress: "Dresses", ethnic: "Ethnic wear", activewear: "Activewear", nightwear: "Nightwear",
};
export const categoryChipLabel = (c: Category) => CATEGORY_PLURALS[c] ?? c;
export const sortCategories = (cs: Category[]) => cs.slice().sort((a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b));

export function discountPercent(mrp: number | undefined, price: number | undefined): number | null {
  if (!mrp || !price || mrp <= price) return null;
  return Math.round(100 - (price / mrp) * 100);
}

const RETAILER_NAMES: Record<Retailer, string> = { myntra: "Myntra", westside: "Westside", ajio: "Ajio", nykaa: "Nykaa Fashion", store: "the store", other: "" };
export function buyLabel(retailer: Retailer): string {
  const name = RETAILER_NAMES[retailer];
  return name && retailer !== "store" ? `Buy on ${name}` : "Open product page";
}
export const retailerLabel = (retailer: Retailer | undefined): string =>
  retailer ? RETAILER_NAMES[retailer] === "the store" ? "Store" : RETAILER_NAMES[retailer] || "" : "";
export function retailerName(retailer: Retailer): string {
  return RETAILER_NAMES[retailer] || "the retailer";
}

export function shortTitle(title: string, brand?: string): string {
  if (brand && title.toLowerCase().startsWith(brand.toLowerCase())) {
    const rest = title.slice(brand.length).trim();
    if (rest) return rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return title;
}
export function fullName(title: string, brand?: string | null): string {
  if (!brand || title.toLowerCase().startsWith(brand.toLowerCase())) return title;
  return `${brand} ${title}`;
}

export function img(set: ImageSet | undefined, w: 160 | 320 | 640 | 1280): string | null {
  if (!set) return null;
  const order: (keyof ImageSet)[] = w === 160 ? ["w160", "w320", "w640"] : w === 320 ? ["w320", "w640", "w160"] : w === 640 ? ["w640", "w320"] : ["w1280", "w640"];
  for (const k of order) if (set[k]) return set[k]!;
  return null;
}
export function srcSet(set: ImageSet | undefined, widths: (160 | 320 | 640 | 1280)[]): string | undefined {
  if (!set) return undefined;
  const parts = widths
    .filter((w) => set[`w${w}` as keyof ImageSet])
    .map((w) => `${set[`w${w}` as keyof ImageSet]} ${w}w`);
  return parts.length ? parts.join(", ") : undefined;
}

/** A suggestion's status once an orders doc exists for it: the order wins over the stored status. */
export function effectiveStatus(s: Suggestion, orders: Order[]): SuggestionStatus {
  return orders.some((o) => o.suggestion_id === s.id) ? "ordered" : s.status;
}

export interface Look {
  bottom: Suggestion;
  top: Suggestion;
  /** Up to 2 styling pieces: the best shoes, then one accessory or outer layer. */
  extras: Suggestion[];
}

const isTop = (s: Suggestion) => s.category === "top" || s.category === "knitwear";

/** The best pick of a category group from `pool`: liked or ordered first, then the Mac's priority. */
function bestOf(pool: Suggestion[], categories: Category[]): Suggestion | undefined {
  return sortPicks(pool.filter((s) => categories.includes(s.category)).map((s) => ({ s, status: s.status })))[0]?.s;
}

/** One look per mix: every non-dismissed bottom with each non-dismissed top that pairs with it, in either direction, styled with shoes and an accessory or layer. */
export function buildLooks(all: Suggestion[]): Look[] {
  const byId = new Map(all.map((s) => [s.id, s]));
  const live = (s: Suggestion | undefined): s is Suggestion => !!s && s.status !== "dismissed";
  return all
    .filter((s) => s.category === "bottom" && s.status !== "dismissed")
    .flatMap((bottom) => {
      const paired = (bottom.pairs_with_suggestions ?? []).map((id) => byId.get(id)).filter(live);
      const reverse = all.filter((t) => live(t) && (t.pairs_with_suggestions ?? []).includes(bottom.id));
      // A bottom's own list is the curated 3 to 4 tops; tops that name the bottom only count when it lists none.
      const own = paired.filter(isTop);
      const tops = (own.length ? own : reverse.filter(isTop)).filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
      return tops.map((top) => {
        const pool = [...paired, ...(top.pairs_with_suggestions ?? []).map((id) => byId.get(id)).filter(live), ...reverse];
        const shoes = bestOf(pool, ["footwear"]);
        const layer = bestOf(pool, ["accessory", "outerwear"]);
        return { bottom, top, extras: [shoes, layer].filter((x): x is Suggestion => !!x) };
      });
    });
}
/** The Mac's 1 to 5 ranking; unranked items sit in the middle. */
export const priorityOf = (s: Suggestion) => s.priority ?? 3;

/** Picks in priority order: ordered, then liked, then the Mac's priority (5 first). Stable otherwise. */
export function sortPicks<T extends { s: Suggestion; status: SuggestionStatus }>(items: T[]): T[] {
  const statusRank = (x: T) => (x.status === "ordered" ? 2 : x.status === "shortlisted" ? 1 : x.status === "dismissed" ? -1 : 0);
  return items.slice().sort((a, b) => statusRank(b) - statusRank(a) || priorityOf(b.s) - priorityOf(a.s));
}

/** Favourites first (both pieces liked or ordered, then one), then the pieces' combined priority. */
export function sortLooks(looks: Look[], fav: (s: Suggestion) => boolean): Look[] {
  const liked = (l: Look) => Number(fav(l.bottom)) + Number(fav(l.top));
  const prio = (l: Look) => priorityOf(l.bottom) + priorityOf(l.top);
  return looks.slice().sort((a, b) => liked(b) - liked(a) || prio(b) - prio(a));
}

/** Liked first, then priority: for the bottoms and the top strips on the Matches tab. */
export const byFavThenPriority = (fav: (s: Suggestion) => boolean) => (a: Suggestion, b: Suggestion) =>
  Number(fav(b)) - Number(fav(a)) || priorityOf(b) - priorityOf(a);
export const lookItems = (l: Look) => [l.bottom, l.top, ...l.extras];
export const lookPath = (l: Look) => `/shop/looks/${l.bottom.id}/${l.top.id}`;
export function lookTotal(items: Suggestion[]) {
  const priced = items.filter((i) => i.price);
  if (priced.length === 0) return null;
  return { amount: priced.reduce((sum, i) => sum + (i.price?.amount ?? 0), 0), currency: priced[0].price!.currency };
}
/** Like "Grey trousers + peach shirt". */
export function lookName(look: Look): string {
  const name = (s: Suggestion) => shortTitle(s.title, s.brand).split(",")[0];
  const top = name(look.top);
  return `${name(look.bottom)} + ${top.charAt(0).toLowerCase()}${top.slice(1)}`;
}

/** Outfit sets from liked pieces only: each liked bottom with every liked top it pairs with (either direction), or the
 * best liked top overall when none pairs. Shoes and one accessory or layer come from liked pieces too, paired ones first.
 * Best combined priority first. */
export function buildShortlistSets(all: Suggestion[], liked: (s: Suggestion) => boolean): Look[] {
  const likedAll = all.filter((s) => s.status !== "dismissed" && liked(s));
  const byPriority = (a: Suggestion, b: Suggestion) => priorityOf(b) - priorityOf(a);
  const bottoms = likedAll.filter((s) => s.category === "bottom");
  const tops = likedAll.filter(isTop).sort(byPriority);
  const pairs = (a: Suggestion, b: Suggestion) => (a.pairs_with_suggestions ?? []).includes(b.id) || (b.pairs_with_suggestions ?? []).includes(a.id);
  const best = (categories: Category[], bottom: Suggestion, top: Suggestion) => {
    const pool = likedAll.filter((s) => categories.includes(s.category)).sort(byPriority);
    return pool.find((s) => pairs(s, bottom) || pairs(s, top)) ?? pool[0];
  };
  const sets = bottoms.flatMap((bottom) => {
    const paired = tops.filter((t) => pairs(t, bottom));
    const chosen = paired.length > 0 ? paired : tops.slice(0, 1);
    return chosen.map((top): Look => ({
      bottom,
      top,
      extras: [best(["footwear"], bottom, top), best(["accessory", "outerwear"], bottom, top)].filter((x): x is Suggestion => !!x),
    }));
  });
  return sets.sort((a, b) => priorityOf(b.bottom) + priorityOf(b.top) - priorityOf(a.bottom) - priorityOf(a.top));
}

export interface WardrobeSlot {
  key: "tops" | "bottoms" | "layers" | "shoes" | "accessories";
  label: string;
  categories: Category[];
  target: number;
}
export const WARDROBE_SLOTS: WardrobeSlot[] = [
  { key: "tops", label: "Tops", categories: ["top", "knitwear"], target: 4 },
  { key: "bottoms", label: "Bottoms", categories: ["bottom"], target: 3 },
  { key: "layers", label: "Layers", categories: ["outerwear"], target: 1 },
  { key: "shoes", label: "Shoes", categories: ["footwear"], target: 2 },
  { key: "accessories", label: "Accessories", categories: ["accessory"], target: 2 },
];
const slotOf = (s: Suggestion) => WARDROBE_SLOTS.find((x) => x.categories.includes(s.category));

/** Liked pieces per wardrobe slot, with whether each has reached its target. */
export function wardrobeSummary(all: Suggestion[], liked: (s: Suggestion) => boolean) {
  const likedAll = all.filter((s) => s.status !== "dismissed" && liked(s));
  return WARDROBE_SLOTS.map((slot) => {
    const count = likedAll.filter((s) => slot.categories.includes(s.category)).length;
    return { ...slot, count, full: count >= slot.target };
  });
}

export interface AddOn {
  item: Suggestion;
  reason: string;
}

const NO_YET: Record<WardrobeSlot["key"], string> = {
  tops: "You have no tops yet", bottoms: "You have no bottoms yet", layers: "Adds a warm layer", shoes: "You have no shoes yet", accessories: "You have no accessories yet",
};

/** Up to `limit` unliked, live picks that complete the wardrobe best: empty or under-target slots first, then the most pairings
 * with liked pieces (either direction), then the Mac's priority. Counts update as each add-on is chosen. */
export function suggestAddOns(all: Suggestion[], liked: (s: Suggestion) => boolean, limit = 4): AddOn[] {
  const likedAll = all.filter((s) => s.status !== "dismissed" && liked(s));
  const counts = new Map(WARDROBE_SLOTS.map((slot) => [slot.key, likedAll.filter((s) => slot.categories.includes(s.category)).length]));
  const pairCount = (c: Suggestion) =>
    likedAll.filter((l) => (c.pairs_with_suggestions ?? []).includes(l.id) || (l.pairs_with_suggestions ?? []).includes(c.id)).length;
  const pool = all
    .filter((s) => s.status !== "dismissed" && !liked(s) && !!slotOf(s))
    .map((item) => ({ item, slot: slotOf(item)!, pairs: pairCount(item) }));
  const out: AddOn[] = [];
  while (out.length < limit && pool.length > 0) {
    const deficit = (x: (typeof pool)[number]) => Math.max(0, x.slot.target - (counts.get(x.slot.key) ?? 0)) / x.slot.target;
    pool.sort((a, b) => deficit(b) - deficit(a) || b.pairs - a.pairs || priorityOf(b.item) - priorityOf(a.item));
    const [pick] = pool.splice(0, 1);
    const have = counts.get(pick.slot.key) ?? 0;
    const reason = have === 0 ? NO_YET[pick.slot.key] : pick.pairs > 0 ? `Pairs with ${pick.pairs} of your liked pieces` : have < pick.slot.target ? `Adds to your ${pick.slot.label.toLowerCase()}` : "Rounds out your wardrobe";
    out.push({ item: pick.item, reason });
    counts.set(pick.slot.key, have + 1);
  }
  return out;
}
