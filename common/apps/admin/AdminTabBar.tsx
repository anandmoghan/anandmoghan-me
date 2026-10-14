'use client'

import { TabBar, type Tab } from '../shell/TabBar'
import { ShieldIcon, UserIcon } from '../shell/icons'

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />
  </svg>
)

const CommentIcon = () => (
  <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-8l-4 3v-3H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
  </svg>
)

const tabs: Tab[] = [
  { href: '/apps/admin', exact: true, label: 'Users', icon: <UserIcon /> },
  { href: '/apps/admin/roles', label: 'Roles', icon: <ShieldIcon /> },
  { href: '/apps/admin/visits', label: 'Visits', icon: <ChartIcon /> },
  { href: '/apps/admin/comments', label: 'Comments', icon: <CommentIcon /> },
]

export function AdminTabBar() {
  return <TabBar tabs={tabs} label="Admin" />
}
