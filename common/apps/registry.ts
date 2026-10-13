import type { AppDefinition } from './types'

// Apps listed on the hub (/apps). "share" is routed but intentionally not listed.
export const apps: AppDefinition[] = [
  {
    id: 'dashboard',
    name: 'Wealth',
    description: 'Track assets, investments, and net worth. Real estate, crypto, stocks, and your Trading 212 ISA.',
    icon: '📊',
    path: '/apps/wealth',
    requiresAuth: true,
  },
  {
    id: 'time',
    name: 'Time',
    description: 'Chess-clock time tracker with dynamic categories, budgets, and live stats.',
    icon: '⏱️',
    path: '/apps/time',
    requiresAuth: true,
  },
  {
    id: 'expense',
    name: 'Expense',
    description: 'Track expenses across bank and credit card statements. Upload PDFs, auto-group by vendor.',
    icon: '💸',
    path: '/apps/expense',
    requiresAuth: true,
  },
]
