# Time — Build Plan

A personal time-tracking "chess clock" app. One activity active at a time, dynamic user-defined categories, per-category budgets (time and/or count), and rollups for fast weekly/monthly/lifetime reads. Lives inside the existing `apps/` React SPA alongside the Dashboard.

---

## 1. Placement in existing app

- **App name:** Time
- **Icon:** ⏱️
- **Route:** `/time` (nested routes `/time`, `/time/stats`, `/time/settings`)
- **Location:** `apps/src/apps/time/`
- **Registration:** add to the `apps` array in [App.tsx](../../App.tsx) and add the `<Route>` block. Follow the exact pattern used for Dashboard.
- **Auth:** uses existing `useAuth()` from `apps/src/hooks/useAuth.ts`. Data scoped under `users/{user.uid}`.
- **Firestore client:** reuse the singleton `db` from `apps/src/firebase.ts`. Do not initialise a second app.
- **Styling:** Tailwind with the existing CSS vars (`bg-background`, `text-foreground`, `text-muted`, `border-border`, `text-accent`, `text-destructive`, `text-success`). Light/dark already handled by `ThemeProvider`.
- **Routing library:** `react-router-dom` v7 (already in use — `<BrowserRouter>` + `<Routes>`).

---

## 2. Data model (Firestore)

All fields use short wire names for compactness. A single adapter at the Firestore boundary converts to/from readable domain types — application code never deals with short keys directly.

### 2.1 Categories

```
users/{uid}/categories/{cid}
  n:    string                          # name, e.g. 'Work'
  i:    string                          # icon (emoji)
  b:    Budget[]                        # 0+ budgets; see below
  m:    number | undefined              # optional min session duration in seconds
  a:    boolean                         # archived (soft delete)
  o:    number                          # sort order
```

`cid` values are `c1`, `c2`, `c3`, … assigned via a counter doc:

```
users/{uid}/categories/_meta
  next: number                          # next cid integer (starts at 1)
```

Create-category flow must be a `runTransaction`: read `_meta.next`, write `categories/c{next}` with the new fields, write `_meta.next = next + 1`.

**Budget** shape:

```
{
  k: 't' | 'c',                         # time or count
  v: number,                            # hours (if 't') or occurrences (if 'c')
  w: 'd' | 'w' | 'm'                    # window: day / ISO week / month
}
```

`b` is an array. Empty array = no budget (track freely). Multiple budgets allowed (e.g. Gym: 4h/week + 3x/week). Each budget is evaluated independently against the same rollup data.

### 2.2 Sessions

```
users/{uid}/sessions/{sessionId}        # auto-ID
  c:    string                          # cid reference, e.g. 'c3'
  s:    Timestamp                       # startedAt
  e:    Timestamp | null                # endedAt; null = this is the active session
  dk:   number                          # local-tz dayKey, e.g. 20260417
```

Invariant: at most one session per user has `e == null` at any time.

`durationSeconds` is **derived**: `duration(session) = session.endedAt ? (endedAt.seconds - startedAt.seconds) : (now - startedAt.seconds)`. Not stored.

`weekKey` / `monthKey` are **derived** from `dk` during rollup writes. Not stored.

### 2.3 Rollups

Rollups exist only for **sealed (past) days** — days earlier than today in the user's current tz. Today is always computed live.

```
users/{uid}/rollups/lifetime
  c1: { t: number, n: number }          # seconds, session count
  c2: { t: number, n: number }
  ...
  since: Timestamp                      # first rollup write

users/{uid}/rollups/weeks/{YYYY-Www}    # doc ID string, e.g. '2026-W16'
  c1: { t, n }
  c2: { t, n }

users/{uid}/rollups/months/{YYYYMM}     # doc ID string, e.g. '202604'
  c1: { t, n }
  c2: { t, n }

users/{uid}/rollups/state
  lr: number                            # lastRolledUpDayKey; sessions with dk <= lr are in rollups
```

Missing `{t, n}` entries mean zero — never write zeros.

### 2.4 Settings

```
users/{uid}/settings/prefs
  tz: string                            # IANA timezone, e.g. 'Europe/London'
  theme: ...                            # (already exists; don't touch)
```

---

## 3. Firestore rules — additions

The existing rules in [apps/firestore.rules](../../../firestore.rules) only allow writes under `users/{uid}/settings/{setting}`. New paths to allow (owner-only read/write):

```
match /users/{uid}/categories/{doc=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /users/{uid}/sessions/{doc=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
match /users/{uid}/rollups/{doc=**} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

---

## 4. Key design decisions (with rationales)

### 4.1 Flat sessions collection (not per-day subcollection)

Arbitrary range queries are cheap; rollups cover the O(1) week/month/lifetime reads. Today's math reads today's sessions live (~20 docs). No denormalized day totals that can drift.

### 4.2 Active session identified by `e == null`, not a separate pointer doc

One less doc to keep consistent. `where('e','==',null)` yields at most one result.

### 4.3 Rollups as an additive ledger

Every mutation (close, edit, delete) applies a delta via `FieldValue.increment` on the relevant `week/month/lifetime` docs. Deltas applied only for sessions whose `dk < today_local` (today is live, never in rollups).

Edit: read session → compute `(oldC, oldD, oldDk)` and `(newC, newD, newDk)` → in one transaction, decrement old contributions and increment new contributions. Unchanged values cancel to `increment(0)`.

Delete: same, but only the decrement half.

### 4.4 Split-on-close for midnight-crossing sessions

When closing a session whose span crosses one or more local midnights, emit one session doc per local day. Each piece has its own `dk`. Keeps rollup math trivially correct ("sum all sessions where dk == key").

Lost semantic: "this was one continuous activity." Acceptable — not displayed in v1.

### 4.5 Timezone

Stored once in `users/{uid}/settings/prefs.tz`. On app mount, compare to `Intl.DateTimeFormat().resolvedOptions().timeZone`. If different, show a banner: "Timezone changed (X → Y). Switch? Today's data will be reset."

On "Switch":
1. Delete any active session (no close, no rollup touch).
2. Delete all sessions where `dk === today_in_newTz` OR `dk === today_in_oldTz`. These are always un-rolled-up, so no rollup reconciliation.
3. Write `prefs.tz = newTz`.

DST is handled implicitly by `Intl.DateTimeFormat`. Fall-back hour (1:30 occurring twice) is a bounded, ignorable anomaly.

### 4.6 Min session duration (`m`)

Optional per-category. Applied only at **close time**: if `duration < m`, the session is deleted outright (not persisted). Not retroactive, not enforced on edit.

### 4.7 Category archival (no hard delete)

Existing sessions reference the cid. Deleting a category would orphan them. Soft-delete via `a: true` — hidden from the home grid, still looked up when rendering historical data.

### 4.8 Charts via Recharts

Ship Recharts. Rich interactive charts matter on the Stats tab; hand-rolling them in Tailwind is not worth the v1 time saving.

### 4.9 Full session edit on Stats tab

User can edit `c`, `s`, `e` on any past session. Delta math handles all three changing in one transaction.

---

## 5. File structure

```
apps/src/apps/time/
  TimeApp.tsx                          # shell: <BottomTabBar /> + <Outlet />
  PLAN.md                              # this file
  PROMPT.md                            # build prompt for local Claude Code

  types.ts                             # domain types: Category, Budget, Session
  schema.ts                            # wire <-> domain adapters, duration() helper

  constants.ts                         # window labels, chart colours

  pages/
    TodayPage.tsx                      # / (index)
    StatsPage.tsx                      # /stats
    SettingsPage.tsx                   # /settings

  components/
    BottomTabBar.tsx                   # 3 icons: Today / Stats / Settings
    ActiveTimer.tsx                    # big hero; live ticking from startedAt
    BudgetBar.tsx                      # stacked bars per budget (time and count)
    CategoryGrid.tsx                   # tiles
    CategoryButton.tsx                 # single tile
    StopButton.tsx
    TodayStrip.tsx                     # small per-category totals row
    TzChangeBanner.tsx                 # compare prefs.tz to current, offer reset
    CategoryForm.tsx                   # create/edit modal
    CategoryList.tsx                   # settings list
    SessionList.tsx                    # Stats tab session list
    SessionEditModal.tsx               # edit c/s/e
    RangePicker.tsx                    # Today / Week / Month / Lifetime / Custom
    CategoryFilter.tsx                 # all / single pill selector
    charts/
      StackedDailyBars.tsx             # time per day
      CountBars.tsx                    # sessions per day
      CategoryTotals.tsx               # per-cat bucket

  hooks/
    useCategories.ts                   # onSnapshot on categories; excludes _meta
    useActiveSession.ts                # onSnapshot where e==null
    useTodaySessions.ts                # onSnapshot where dk==today
    useElapsedTicker.ts                # 1s tick; derives from startedAt
    useRollups.ts                      # on-demand reads by range
    useTzCheck.ts                      # compares prefs.tz to runtime tz

  services/
    time.ts                            # localDayKey(date, tz), isoWeekKey, monthKey,
                                       # splitAcrossMidnight, duration helpers
    categories.ts                      # create/edit/archive; _meta counter tx
    activity.ts                        # switchActivity, stopActivity, deleteSession,
                                       # editSession — all transactional, all apply rollup deltas
    rollup.ts                          # runRollupCatchup, applySessionDelta,
                                       # recomputeRollups (admin fixup)
```

---

## 6. Build order with checkpoints

**After every step, stop and ask the user to verify the checkpoint before continuing.**

### Step 1 — Scaffolding
- Create folder skeleton (empty components with minimal JSX).
- Add `date-fns` and `recharts` to `apps/package.json`.
- Register `Time` in `App.tsx` `apps` array and add nested route.
- Update `apps/firestore.rules` with the three new matchers.
- Bottom tab bar renders on mobile + desktop; `Today` / `Stats` / `Settings` tabs navigate.
- Empty pages render a placeholder.
- **Checkpoint 1:** user navigates to `/time`, sees the shell, deploys rules (`firebase deploy --only firestore:rules` or manual update).

### Step 2 — Time utilities (pure)
- `localDayKey(date, tz): number` — returns YYYYMMDD.
- `isoWeekKey(date, tz): string` — 'YYYY-Www' via date-fns `getISOWeek`/`getISOWeekYear`.
- `monthKey(date, tz): string` — 'YYYYMM'.
- `splitAcrossMidnight(startedAt, endedAt, tz): Array<{ dk, s, e }>` — one entry per local day spanned.
- `duration(session): number` — derives from s/e, handling null e (uses `Date.now()`).
- **Checkpoint 2:** user runs a paste-in console script with edge cases (midnight, DST spring-forward, week-year boundary in late Dec / early Jan).

### Step 3 — Categories data layer + Settings tab MVP
- `services/categories.ts`: `createCategory`, `updateCategory`, `archiveCategory`, `unarchiveCategory`. `createCategory` is a tx touching `_meta.next`.
- `hooks/useCategories.ts`: `onSnapshot` on the collection, excludes `_meta`, returns `Record<cid, Category>` + ordered list.
- Settings tab: list, add, edit, archive. `CategoryForm` supports name, icon (text input — OS emoji picker suffices), `Budget[]` (repeatable rows: kind/value/window), optional `m` in minutes, archived toggle.
- No time tracking yet.
- **Checkpoint 3:** user creates 2–3 categories, edits one, archives one. Firestore shows `categories/c1`, `c2`, `c3` and `_meta.next`.

### Step 4 — Sessions data layer (no rollups yet)
- `services/activity.ts`:
  - `switchActivity(uid, cid)` — tx: read active session (`where('e','==',null)` limit 1); if found, close it (apply split-on-close); if `duration < category.m`, delete instead of close; then `addDoc` new active session.
  - `stopActivity(uid)` — same but no new session created.
  - `deleteSession(uid, sessionId)` — tx.
  - `editSession(uid, sessionId, patch)` — tx. Re-derives `dk` from new `s`.
- `hooks/useActiveSession.ts`, `hooks/useTodaySessions.ts`.
- Today tab wired up: `ActiveTimer` (using `useElapsedTicker` — re-renders per second, derives elapsed from `startedAt` each render — no drift), `CategoryGrid`, `StopButton`, `TodayStrip`.
- **Checkpoint 4:** user switches between categories, confirms `sessions/*` docs in Firestore. Test a forced midnight-split via temporarily clamped date math (or a debug helper Claude can stub).

### Step 5 — Rollups
- `services/rollup.ts`:
  - `applySessionDelta(tx, uid, old, next)` — helper emitting `FieldValue.increment` writes for week/month/lifetime, gated on `dk < today`.
  - `runRollupCatchup(uid)` — read `rollups/state.lr`; for every dayKey from `lr+1` up to `today-1`, query `sessions` with that `dk`, sum per category, increment rollups, update `lr`. Idempotent — re-running is a no-op after it catches up.
  - `recomputeRollups(uid)` — zero all rollup docs, scan all sessions with `e != null AND dk < today`, re-aggregate. Exposed as a Settings button; never called in normal flow.
- Plumb `applySessionDelta` into close/edit/delete paths in `activity.ts`.
- Call `runRollupCatchup` on `TimeApp` mount and at the start of each transaction in `activity.ts`.
- **Checkpoint 5:** user closes sessions on yesterday/earlier days (or Claude provides a seed script), triggers catchup, inspects rollup docs. Verify: edit a past session → lifetime totals stay correct. Delete a past session → same.

### Step 6 — Today tab polish + budget bars + tz banner
- `BudgetBar.tsx` — one stacked bar per budget in `category.b`. Time: compute from `live today seconds + (weekRollup.c{cid}.t if w==='w') + (monthRollup.c{cid}.t if w==='m')`. Count: same with `n`. Show "X left" normally; red "+Y over" when exceeded.
- Active visual state (pulse, colour).
- `TzChangeBanner` component.
- Reset-today flow on banner accept.
- **Checkpoint 6:** user runs this on their phone for at least an hour. Reports back.

### Step 7 — Stats tab
- `RangePicker` (Today / Week / Month / Lifetime / Custom with two date inputs).
- `CategoryFilter` (All + one per non-archived category).
- Charts via Recharts:
  - `StackedDailyBars` — x=day, y=hours, colour=category (range-bound).
  - `CountBars` — same but y=session count.
  - `CategoryTotals` — bucketed list with t and n over the range.
- `SessionList` — paginated list of sessions in range, newest first. Tap row → `SessionEditModal` with c/s/e editors. Save → `editSession` tx. Delete → `deleteSession` tx.
- Live-update when a session completes (via `onSnapshot` where `dk` is within current range).
- **Checkpoint 7:** edit a session in the list, watch chart and rollup totals update.

### Step 8 — Settings polish
- Add "Timezone" section (read-only display, mention banner).
- Add "Recompute rollups" button (confirms, runs `recomputeRollups`, shows "done").
- Blank-state messaging on all three tabs (no categories → nudge to Settings).
- Final responsive pass. Confirm bottom tab bar works on iOS safe areas (`pb-[env(safe-area-inset-bottom)]`).
- **Checkpoint 8:** final sign-off.

---

## 7. Invariants the code must preserve

1. **Exactly one session has `e == null` per user at any time.** Every transaction that could create one must first close any existing active session.
2. **Rollups contain only sessions with `dk < today_in_user_tz`.** Today is always computed live from the sessions collection.
3. **`applySessionDelta` is the only path that writes to rollup docs during normal operation.** `recomputeRollups` is the only other path, used only via the admin button.
4. **`dk` is immutable except via `editSession`.** The `editSession` tx must recompute `dk` from the new `s` and run `applySessionDelta` for both old and new periods.
5. **Active session on an app mount where `prefs.tz` differs from runtime tz must be deleted or resolved by the banner flow before any new writes.**
6. **Short wire keys never leak past `services/`.** Components and hooks receive full domain types only.

---

## 8. Pitfalls to avoid

- **Do NOT store elapsed time in component state and increment it per tick.** Always derive from `startedAt` each render. Tab backgrounding will otherwise silently drift.
- **Do NOT compute `dk` as `toISOString().slice(0,10)`** — that's UTC, not local. Use `localDayKey(date, tz)`.
- **Do NOT re-init Firebase.** Import `db` from `apps/src/firebase.ts`.
- **Do NOT add zero entries to rollup maps.** Missing key = 0 by convention. Keeps docs small.
- **Do NOT hard-delete categories.** Archive only.
- **Do NOT block the UI on rollup catchup.** Fire-and-forget on mount; failures are visible via the recompute button.

---

## 9. Decisions left open (to confirm mid-build)

- **Category icon input UX.** Start with a plain text input that accepts emoji via OS picker. Revisit if it's awkward.
- **Session edit conflict with active session.** If you edit a past session's `e` to be `null`, that would create a second active session. Forbid in the form (disable the "clear endedAt" affordance). Only `stopActivity`/`switchActivity` can produce an active session.
- **Custom date range width on Stats tab.** If user picks > 90 days, plots get dense. Add a gentle warning above 90 days; no hard cap.
