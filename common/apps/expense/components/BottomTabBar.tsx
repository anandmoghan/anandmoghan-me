'use client'

import { TabBar, type Tab } from '@/common/apps/shell/TabBar'

const tabs: Tab[] = [
  {
    href: '/apps/expense',
    exact: true,
    label: 'Overview',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="2" y="3" width="8" height="8" rx="1" />
        <rect x="14" y="3" width="8" height="8" rx="1" />
        <rect x="2" y="14" width="8" height="8" rx="1" />
        <rect x="14" y="14" width="8" height="8" rx="1" />
      </svg>
    ),
  },
  {
    href: '/apps/expense/transactions',
    exact: false,
    label: 'Transactions',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    ),
  },
  {
    href: '/apps/expense/add',
    exact: false,
    label: 'Statements',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: '/apps/expense/vendors',
    exact: false,
    label: 'Vendors',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l1.5 11a2 2 0 002 1.7h11a2 2 0 002-1.7L21 7M3 7h18M3 7l3-4h12l3 4M9 11v4M15 11v4" />
      </svg>
    ),
  },
  {
    href: '/apps/expense/settings',
    exact: false,
    label: 'Settings',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function BottomTabBar() {
  return <TabBar tabs={tabs} label="Expense" />
}
