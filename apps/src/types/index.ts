export interface AppDefinition {
  id: string
  name: string
  description: string
  icon: string
  path: string
  requiresAuth: boolean
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
