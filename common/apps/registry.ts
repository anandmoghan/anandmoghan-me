import type { AppDefinition } from './types'

// Apps listed on the hub (/apps). "share" is routed but intentionally not listed.
const publicApps: AppDefinition[] = [
  {
    id: 'family',
    name: 'Family',
    description: 'Health, shopping, style and updates for the family. Household members only.',
    domain: 'home',
    path: '/apps/family',
    requiresAuth: true,
    restricted: true,
  },
  {
    id: 'wealth',
    name: 'Wealth',
    description: 'Track assets, investments, and net worth. Real estate, crypto, stocks, and your Trading 212 ISA.',
    domain: 'wealth',
    path: '/apps/wealth',
    requiresAuth: true,
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Chess-clock time tracker with dynamic categories, budgets, and live stats.',
    domain: 'time',
    path: '/apps/time',
    requiresAuth: true,
  },
  {
    id: 'expense',
    name: 'Expense',
    description: 'Track expenses across bank and credit card statements. Upload PDFs, auto-group by vendor.',
    domain: 'expense',
    path: '/apps/expense',
    requiresAuth: true,
  },
  {
    id: 'materials',
    name: 'Materials',
    description: 'Long-form study notes: speech-to-speech concepts, a literature review and a quick read.',
    domain: 'materials',
    path: '/apps/materials',
    requiresAuth: true,
    restricted: true,
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Users, roles, visits and comment moderation.',
    domain: 'admin',
    path: '/apps/admin',
    requiresAuth: true,
    adminOnly: true,
    restricted: true,
  },
  {
    id: 'ladder',
    name: 'Ladder',
    description: 'Job-application tracker: scraped roles, fit and pay, status, notes, apply prep and tailored materials.',
    domain: 'ladder',
    path: '/apps/ladder',
    requiresAuth: true,
    restricted: true,
  },
  {
    id: 'planner',
    name: 'Planner',
    description: 'Shared calendar mirrored from the iPhone, plus personal habit tracking.',
    domain: 'planner',
    path: '/apps/planner',
    requiresAuth: true,
    restricted: true,
  },
]

/**
 * Private apps: their code lives in gitignored folders, and NEXT_PUBLIC_PRIVATE_APPS (a JSON array of
 * {id, name, href, description?, accent?} in the gitignored .env.local) lists them. Unset or empty means none.
 */
function parsePrivateApps(raw: string | undefined): AppDefinition[] {
  if (!raw) return []
  const entries: unknown = JSON.parse(raw)
  if (!Array.isArray(entries)) throw new Error('NEXT_PUBLIC_PRIVATE_APPS must be a JSON array')
  return entries.map((entry: unknown) => {
    const { id, name, href, description = '', accent } = (entry ?? {}) as Record<string, unknown>
    if (
      typeof id !== 'string' ||
      typeof name !== 'string' ||
      typeof href !== 'string' ||
      !href.startsWith('/apps/') ||
      typeof description !== 'string' ||
      (accent !== undefined && typeof accent !== 'string')
    ) {
      throw new Error(`NEXT_PUBLIC_PRIVATE_APPS: bad entry ${JSON.stringify(entry)}`)
    }
    return {
      id,
      name,
      description,
      domain: 'home',
      path: href,
      requiresAuth: true,
      restricted: true,
      private: true,
      accent,
    }
  })
}

const privateApps = parsePrivateApps(process.env.NEXT_PUBLIC_PRIVATE_APPS)

export const apps: AppDefinition[] = [...publicApps, ...privateApps]

/** Whether the hub and settings list `app`: private apps need their id in the apps claim, admin-only apps the admin claim. */
export function isListed(app: AppDefinition, isAdmin: boolean, granted: string[]): boolean {
  if (app.private) return granted.includes(app.id)
  return !app.adminOnly || isAdmin
}

/** The app a site path belongs to (by path prefix), if any. */
export function appForPath(pathname: string): AppDefinition | undefined {
  return apps.find((a) => pathname.startsWith(a.path))
}
