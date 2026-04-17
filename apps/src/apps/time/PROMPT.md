# Build Prompt — Time App

You are building a new feature inside an existing React SPA. A full design doc is already written:

**Read `apps/src/apps/time/PLAN.md` first, fully, before doing anything.** It contains the data model, Firestore rules, file structure, 8-step build order with checkpoints, invariants, and pitfalls. Treat it as the source of truth. Do not re-derive decisions it already makes.

## What to build

A "chess clock" style time tracker called **Time**, mounted at `/time` inside the existing `apps/` React SPA. Dynamic user-defined categories, time- and/or count-based budgets per category, live active-session ticker, stats/plots, and rollups for fast aggregations. See PLAN.md §1–§2 for the full spec.

## Existing app conventions you MUST follow

Before writing any code, read these to understand the patterns in use:

- `apps/src/App.tsx` — app registry and routing pattern.
- `apps/src/hooks/useAuth.ts` — auth context. Use `user.uid` for scoping.
- `apps/src/firebase.ts` — Firestore client singleton. Import `db` from here; do not re-init.
- `apps/src/apps/dashboard/DashboardApp.tsx` — example sub-app shape.
- `apps/src/apps/dashboard/hooks/useGroups.ts` — example `onSnapshot` hook.
- `apps/src/components/Layout.tsx`, `apps/src/styles/globals.css` — Tailwind + CSS var styling (`bg-background`, `text-foreground`, `text-muted`, `border-border`, `text-accent`, `text-destructive`, `text-success`). Dark/light already handled.
- `apps/firestore.rules` — current rules. Your additions are specified in PLAN.md §3.

Stack: React 19, Vite, TypeScript strict, Tailwind 3, Firebase v10, React Router v7. Mobile-first. PWA usage expected — `/time` gets installed.

## Non-negotiable rules

1. **Don't touch existing features.** Dashboard, HomePage, LoginPage, SettingsPage, ThemeProvider, AuthProvider, Layout — hands off except where PLAN.md §1 requires a small edit to `App.tsx` to register the new route and app entry.
2. **Match the existing styling.** Tailwind only; use the CSS vars. No new CSS files. No inline `style` attributes except for dynamic values like widths.
3. **All data writes that mutate sessions + rollups are in a single `runTransaction`.** See PLAN.md §4.3 and §7.
4. **The live elapsed ticker re-derives from `startedAt` on every render tick.** Never store elapsed seconds in state. See PLAN.md §8.
5. **Short wire keys never leak past `services/`.** Components and hooks receive full domain types. Conversion lives in `schema.ts`.
6. **Don't add documentation files, READMEs, or extra markdown beyond what exists.** The plan and this prompt are enough.
7. **Don't add unrequested features or abstractions.** Build exactly what PLAN.md §6 specifies, in the specified step order.
8. **Security rules:** update `apps/firestore.rules` as specified in PLAN.md §3 at Step 1. Do not deploy yourself — the user deploys.

## Build order and checkpoint discipline

PLAN.md §6 defines 8 steps, each with a checkpoint. **Run all 8 steps end-to-end without stopping for user approval.** The checkpoints are your own self-verification gates — use them to confirm the step actually works before moving on, not as stop-and-wait points.

For each step:

1. Do the work.
2. Verify with Chrome MCP (see next section) that the checkpoint criteria in PLAN.md §6 are met.
3. If verification passes, immediately start the next step.
4. If verification fails, debug and fix before moving on. Do not move to the next step with a broken checkpoint.

Keep a running log of what you've done per step. At the very end, produce one consolidated summary covering all 8 steps, screenshots of the final UI on mobile and desktop, and the list of files created/edited.

## When to stop mid-build

Only stop before finishing if **you are genuinely blocked** and need the user to act. Valid reasons to stop:

- You cannot deploy the new Firestore rules and the user needs to do so. (Try `firebase deploy --only firestore:rules` from the repo root first; only stop if that fails.)
- Chrome MCP login fails because the test credentials in `.env.local` are missing, expired, or named unexpectedly and you can't identify them.
- A step's checkpoint fails verification three times in a row despite fixes, and the root cause needs human judgement.
- An ambiguity in PLAN.md §9 is now blocking a decision you can't make safely.

In any of those cases: stop, explain precisely what you need from the user, and wait. Do not invent workarounds for genuine blockers.

Invalid reasons to stop (keep going):

- A checkpoint passed. Next step.
- You finished a feature and want to "confirm it looks good." It already looks good — you verified it.
- You want permission to refactor something. Don't refactor. Stick to the plan.

## Verifying the app with Chrome MCP

You have access to the Chrome DevTools MCP server (tools prefixed `mcp__chrome-devtools__`). Chrome MCP **replaces** user-driven verification — you use it to self-check every step. After Step 1 (scaffolding) and at every subsequent step that adds UI or data flow, verify the app actually renders and works:

1. Start the dev server if it isn't running:
   - `cd apps && npm run dev` (Vite, default port 5173).
   - The user's project also has Claude Preview MCP (`mcp__Claude_Preview__preview_start`) with `.claude/launch.json`. Either flow works — pick one and stick to it.
2. Open the dev URL in Chrome via `mcp__chrome-devtools__new_page` or `mcp__chrome-devtools__navigate_page`.
3. **Log in with a test account.** Credentials are in the env files:
   - `/Users/anandmoghan/workspace/code/anandmoghan-me/.env.local`
   - `/Users/anandmoghan/workspace/code/anandmoghan-me/apps/.env.local`

   Look for `TEST_EMAIL` / `TEST_PASSWORD` or similarly named keys. Use them to sign in via the LoginPage. Do not hard-code credentials into source files; read them at test time.
4. Navigate to `/time` and confirm the behaviour expected by the current checkpoint.
5. Use `mcp__chrome-devtools__take_snapshot` or `take_screenshot` to confirm visual state. Use `list_console_messages` to catch errors. Use `list_network_requests` to confirm Firestore reads/writes are happening where expected.
6. Test mobile viewport too: `emulate` with a phone viewport (e.g. 390×844 iPhone 14).
7. Report what you verified in your checkpoint summary.

If Chrome MCP is unavailable or login fails, say so explicitly and describe what you would have tested — don't claim success without verification.

## When unsure, ask

The plan is opinionated but not exhaustive. If something is genuinely ambiguous (see PLAN.md §9 for pre-flagged items), ask the user before committing to an approach. Don't invent a decision just to keep moving.

## Starting point

Begin by:

1. Reading PLAN.md in full.
2. Reading the files listed under "Existing app conventions" above.
3. Verifying Chrome MCP is working: open a new page, navigate to the dev server URL, confirm the existing app loads. If this fails, stop and report.
4. Verifying test credentials load from `.env.local`. If missing, stop and report.
5. Posting a brief plan-of-attack (≤10 bullets: data model recap, file list for Step 1, and anything you'll need to confirm along the way).
6. **Then immediately start Step 1 and keep going through Step 8 without pausing**, verifying each checkpoint with Chrome MCP before advancing.

At the end, produce:

- Consolidated summary of what was built per step.
- List of files created and files edited.
- Final Chrome MCP screenshots: `/time` Today tab, Stats tab, Settings tab — both mobile (390×844) and desktop (1280×800).
- Any decisions you made on the open questions in PLAN.md §9, with brief rationale.
- Any deferred follow-ups you noticed but deliberately did not do.
