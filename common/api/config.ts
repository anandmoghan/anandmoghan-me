// The home-server API behind https://api.anandmoghan.me. The browser calls it with
// `Authorization: Bearer <Firebase ID token>`; each app owns one path prefix on it.
// NEXT_PUBLIC_API_BASE points the whole site at another server (a local one, for example).
export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || 'https://api.anandmoghan.me').replace(/\/+$/, '')

export const FAMILY_API = `${API_BASE}/family`
export const LADDER_API = `${API_BASE}/ladder`
export const PLANNER_API = `${API_BASE}/planner`
