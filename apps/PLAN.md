# Apps Platform Plan - apps.anandmoghan.me

## Context

Anand wants an app platform at `apps.anandmoghan.me` that hosts multiple apps (starting with a wealth Dashboard). The platform has a shared auth layer - you can browse available apps without logging in, but launching one requires Google sign-in. The existing site `anandmoghan.me` is a static Next.js blog on Cloudflare Pages. The apps platform is a separate dynamic SPA sharing the same visual identity.

---

## Architecture Overview

```
anandmoghan-me/          (existing repo root)
├── app/                    (existing static site - anandmoghan.me)
├── common/                 (existing shared components)
├── apps/                   (NEW - React SPA via Vite - apps.anandmoghan.me)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                    (root router)
│   │   ├── firebase.ts
│   │   ├── styles/
│   │   │   └── globals.css            (copied + adapted from main site)
│   │   │
│   │   ├── components/                (shared platform components)
│   │   │   ├── Layout.tsx             (shell: top bar + profile menu)
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── ThemeToggle.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── ProtectedRoute.tsx     (wraps any app that needs auth)
│   │   │   ├── GoogleLoginButton.tsx
│   │   │   └── ProfileMenu.tsx        (settings, sign out)
│   │   │
│   │   ├── hooks/                     (shared platform hooks)
│   │   │   └── useAuth.ts
│   │   │
│   │   ├── pages/                     (platform-level pages)
│   │   │   ├── HomePage.tsx           (app launcher grid - public)
│   │   │   ├── LoginPage.tsx          (Google sign-in)
│   │   │   └── SettingsPage.tsx       (profile, theme, app-specific settings)
│   │   │
│   │   ├── apps/                      (individual apps as modules)
│   │   │   └── dashboard/
│   │   │       ├── DashboardApp.tsx   (app root - wrapped in ProtectedRoute)
│   │   │       ├── components/
│   │   │       │   ├── GroupSelector.tsx
│   │   │       │   ├── ViewToggle.tsx
│   │   │       │   ├── InviteManager.tsx
│   │   │       │   ├── PortfolioTable.tsx
│   │   │       │   ├── CashSummary.tsx
│   │   │       │   └── TransactionList.tsx
│   │   │       ├── hooks/
│   │   │       │   ├── useGroups.ts
│   │   │       │   ├── useInvites.ts
│   │   │       │   └── useTrading212.ts
│   │   │       ├── services/
│   │   │       │   ├── trading212.ts
│   │   │       │   └── crypto.ts
│   │   │       └── types.ts
│   │   │
│   │   └── types/
│   │       └── index.ts               (shared types: App, User, etc.)
│   │
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── wrangler.toml
```

---

## Routing

```
/                   → HomePage (public app launcher grid)
/login              → LoginPage (Google sign-in)
/settings           → SettingsPage (protected - profile, API keys, theme)
/dashboard          → DashboardApp (protected - wealth dashboard)
/dashboard/...      → Dashboard sub-routes if needed
/<future-app>       → Future apps get their own top-level route
```

The **HomePage** is public. It shows a grid of available apps with icons, names, and descriptions. Clicking an app checks auth - if not logged in, redirects to `/login` with a return URL, then back to the app after sign-in.

---

## App Registry

Each app registers itself in a simple array:

```typescript
// src/types/index.ts
interface AppDefinition {
  id: string
  name: string
  description: string
  icon: string           // emoji or SVG component
  path: string           // route path
  component: LazyComponent
  requiresAuth: boolean
}

// src/App.tsx
const apps: AppDefinition[] = [
  {
    id: 'dashboard',
    name: 'Wealth Dashboard',
    description: 'Track investments across Trading212 accounts',
    icon: '📊',
    path: '/dashboard',
    component: lazy(() => import('./apps/dashboard/DashboardApp')),
    requiresAuth: true,
  },
  // future apps added here
]
```

HomePage reads this array to render the grid. Router reads it to generate routes. Adding a new app = adding a folder under `src/apps/` and one entry in the array.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19 + TypeScript + Vite |
| Routing | React Router v7 |
| Styling | Tailwind CSS (same tokens as main site) |
| Auth | Firebase Auth (Google provider) - shared across all apps |
| Database | Cloud Firestore |
| API Keys | AES-GCM encrypted in Firestore |
| Trading212 | REST API via Cloudflare Worker CORS proxy |
| Hosting | Cloudflare Pages at `apps.anandmoghan.me` |

---

## Data Model (Firestore)

```
users/{uid}
  email: string
  displayName: string
  photoURL: string
  createdAt: timestamp

users/{uid}/settings/trading212
  encryptedApiKey: string
  iv: string
  lastSynced: timestamp

groups/{groupId}
  name: string
  createdBy: string (uid)
  createdAt: timestamp
  members: string[] (array of uids)

invites/{inviteId}
  groupId: string
  groupName: string
  fromUid: string
  fromName: string
  toEmail: string
  status: "pending" | "accepted" | "declined"
  createdAt: timestamp
```

---

## CORS Proxy for Trading212

```
apps/worker/
  └── trading212-proxy.ts
```

Cloudflare Worker at `api.apps.anandmoghan.me`. Browser sends decrypted API key in request header, worker forwards to Trading212 API and returns response with CORS headers.

---

## Features & UX Flow

### Home Page (Public)
- Grid of app cards with icon, name, description
- "Launch" button on each card
- If not logged in, clicking Launch redirects to login then back

### Login
- Google Sign-In via Firebase Auth
- On first login, creates user doc in Firestore
- Redirects to the app they were trying to access

### Layout (Authenticated)
- **Top bar**: "Apps" breadcrumb link (back to home), current app name, profile avatar button
- **Profile menu** (dropdown): Settings link, Sign Out

### Settings Page (Shared)
- **Profile section**: Display name, email (read-only from Google)
- **Theme**: Light / Dark / System toggle
- **App-specific sections**: Each app can register a settings panel
  - Dashboard settings: Trading212 API key (masked input), manage groups, manage invites

### Dashboard App
- **Group selector** dropdown in a sub-header
- **View toggle**: tabs for each group member + "Combined"
- **Content**: Portfolio table, cash summary, recent transactions
- **Group management**: Create group, invite by email
- **Invites**: Accept/decline pending invites

---

## Implementation Phases

### Phase 1: Platform Shell
1. Create `apps/` with Vite + React + TypeScript + React Router
2. Set up Tailwind with same design tokens as main site
3. Copy and adapt globals.css, ThemeProvider, ThemeToggle, Button, Card
4. App registry pattern and lazy-loaded routes
5. HomePage with app grid (public)
6. Layout component with top bar

### Phase 2: Auth
1. Firebase config setup (env vars)
2. Firebase Auth with Google provider
3. `useAuth` hook
4. `ProtectedRoute` wrapper
5. LoginPage with redirect-back logic
6. ProfileMenu with sign-out
7. User document creation on first sign-in

### Phase 3: Settings
1. SettingsPage with profile display
2. Theme preference (persisted)
3. App-specific settings registration pattern
4. Dashboard settings: Trading212 API key input (encrypt + store)

### Phase 4: Dashboard - Groups & Invites
1. Create group flow
2. Send invite by email
3. Invites list with accept/decline
4. Group selector in dashboard
5. Firestore security rules

### Phase 5: Dashboard - Trading212 Data
1. Cloudflare Worker CORS proxy
2. `useTrading212` hook (portfolio, cash, transactions)
3. Individual member view
4. Combined view (aggregate across group members)
5. Portfolio table, cash summary, transaction list components

### Phase 6: Deployment
1. `wrangler.toml` for Cloudflare Pages
2. Custom domain `apps.anandmoghan.me`
3. GitHub Actions workflow
4. Deploy CORS proxy worker

---

## Verification

1. `npm run dev` in `apps/` - home page loads with Dashboard card
2. Clicking Dashboard redirects to login if not signed in
3. Google login works, redirects back to Dashboard
4. Settings page: enter Trading212 API key, create group, send invite
5. Second user logs in, sees invite, accepts
6. Both users see each other's data in group view
7. Combined view aggregates correctly
8. `npm run build` succeeds
9. `apps.anandmoghan.me` works end-to-end

---

## What the User Needs to Provide

1. **Firebase project**: Create at console.firebase.google.com, enable Google Auth + Firestore, provide config object
2. **Trading212 API key**: For testing
3. **Cloudflare DNS**: CNAME `apps.anandmoghan.me` → Cloudflare Pages project
