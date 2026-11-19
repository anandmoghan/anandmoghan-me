import type { Domain } from './shell/DomainScope'

export interface AppDefinition {
  id: string
  name: string
  description: string
  /** Area colour and icon (global tokens.css, app.css .domain-<name>). */
  domain: Domain
  /** Absolute site path, e.g. /apps/wealth */
  path: string
  requiresAuth: boolean
  /** Listed on the hub for admins only (the route and rules check the admin claim too). */
  adminOnly?: boolean
  /** Only Anand and family (roles/{email} grants); the hub card shows a Restricted badge. */
  restricted?: boolean
  /** From NEXT_PUBLIC_PRIVATE_APPS: listed only for users whose apps claim has this id. */
  private?: boolean
  /** CSS colour for the area accent; overrides the domain colour (private apps). */
  accent?: string
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  createdAt: Date
}

export interface Group {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  members: string[]
}

export interface Invite {
  id: string
  groupId: string
  groupName: string
  fromUid: string
  fromName: string
  toUid: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: Date
}

export interface Trading212Settings {
  encryptedApiKey: string
  iv: string
  lastSynced: Date | null
}
