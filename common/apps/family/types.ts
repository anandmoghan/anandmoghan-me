import type { Timestamp } from "firebase/firestore";

export type Person = "anand" | "kavya" | "nila";
export type FeedPerson = Person | "family";
export type Money = { amount: number; currency: string };
export type SuggestionStatus = "new" | "shortlisted" | "dismissed" | "ordered";
export type OrderStatus = "ordered" | "delivered" | "return_requested" | "returned" | "kept";
export type Category =
  | "top" | "bottom" | "outerwear" | "knitwear" | "dress" | "ethnic" | "footwear" | "accessory" | "innerwear" | "activewear" | "nightwear";
export type Retailer = "myntra" | "westside" | "ajio" | "nykaa" | "store" | "other";

/** Sync fields every client write sets. */
export interface SyncFields {
  pending_sync?: boolean;
  updated_by?: string;
  client_updated_at?: Timestamp | null;
}

/** One gallery image: URLs of the resized variants (Storage download URLs written by the Mac). */
export interface ImageSet {
  w160?: string;
  w320?: string;
  w640: string;
  w1280?: string;
}

export interface Brief extends SyncFields {
  id: string;
  person: Person;
  title: string;
  budget?: Money;
  needs?: string[];
  constraints?: string;
  deadline?: string;
  status: "open" | "closed";
  created_at?: string;
}

export interface Suggestion extends SyncFields {
  id: string;
  brief_id: string;
  person: Person;
  title: string;
  brand?: string;
  retailer: Retailer;
  url?: string;
  price?: Money;
  mrp?: number;
  sizes_available?: string[];
  recommended_size?: string;
  category: Category;
  images?: ImageSet[];
  full_page?: boolean;
  why?: string;
  /** The Mac's ranking, 5 = buy first, 1 = backup. Unranked items count as 3. */
  priority?: number;
  pairs_with?: string[];
  pairs_with_suggestions?: string[];
  delivery_estimate?: string;
  verified_at?: string;
  status: SuggestionStatus;
  dismiss_reason?: string | null;
  dismissed_at?: Timestamp | null;
  shortlisted_at?: Timestamp | null;
}

export interface Order extends SyncFields {
  id: string;
  suggestion_id: string;
  person?: Person;
  retailer: Retailer;
  title?: string;
  status: OrderStatus;
  size?: string;
  price?: Money;
  ordered_at?: string;
  delivered_at?: string;
  expected_at?: string;
  fit_notes?: string | null;
  rating?: number | null;
}

export interface WardrobeItem {
  id: string;
  name: string;
  brand?: string;
  images?: ImageSet[];
}

export interface FeedLink { kind: string; id: string }
export interface FeedItem extends SyncFields {
  id: string;
  person: FeedPerson;
  domain: string;
  title: string;
  body?: string;
  severity: "info" | "nudge" | "action" | "urgent";
  status: "unread" | "read" | "done";
  links?: FeedLink[];
  created_at: string;
}

export type JobState = "queued" | "running" | "done" | "failed";
export interface Job {
  id: string;
  type: string;
  person?: string;
  state: JobState;
  title?: string;
  created_at?: string;
  finished_at?: string;
  request_id?: string;
}

export type RequestType = "find-more" | "photo-upload" | "outfit" | string;
export interface RequestDoc extends SyncFields {
  id: string;
  request_id: string;
  type: RequestType;
  person?: string;
  brief_id?: string;
  input?: Record<string, unknown>;
  suggestion_ids?: string[];
  /** Mac-owned progress: absent until the bridge picks the request up. */
  status?: "queued" | "running" | "done" | "failed";
  job_id?: string;
  created_at?: Timestamp | null;
}

/** family/household/tryons/{request_id}: written only by the Mac bridge. */
export interface Tryon {
  id: string;
  person: Person;
  suggestion_ids: string[];
  status: "queued" | "running" | "done" | "failed";
  error?: string;
  images?: { w640?: string; w1280?: string };
  model?: string;
  created_at?: Timestamp | string | null;
  finished_at?: Timestamp | string | null;
}

export interface MacStatus {
  last_seen?: Timestamp | string | null;
  synced_through?: Timestamp | string | null;
  version?: string;
  worker?: { running?: number; queued?: number };
  api_url?: string;
}

export interface Household {
  members: string[];
}

/** family/household/people/{person}: name summary, optionally the sign-in emails. */
export interface PersonDoc {
  id: string; name?: string; person?: string; emails?: string[];
  /** Mac-owned: body of content/people/<person>/style-guide.md plus its updated_at. */
  style_guide?: { body: string; updated_at?: string };
}
