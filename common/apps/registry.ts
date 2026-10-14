import type { AppDefinition } from './types'

// Apps listed on the hub (/apps). "share" is routed but intentionally not listed.
export const apps: AppDefinition[] = [
  {
    id: 'dashboard',
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
    requiresAuth: false,
  },
]
