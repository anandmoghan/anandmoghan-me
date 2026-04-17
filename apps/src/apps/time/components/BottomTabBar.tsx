import { Link, useLocation } from 'react-router-dom'

const tabs = [
  {
    path: '/time',
    exact: true,
    label: 'Today',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-accent' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    path: '/time/stats',
    exact: false,
    label: 'Stats',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-accent' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <rect x="2" y="3" width="6" height="18" rx="1" />
        <rect x="9" y="8" width="6" height="13" rx="1" />
        <rect x="16" y="13" width="6" height="8" rx="1" />
      </svg>
    ),
  },
  {
    path: '/time/settings',
    exact: false,
    label: 'Settings',
    icon: (active: boolean) => (
      <svg className={`w-5 h-5 ${active ? 'text-accent' : 'text-muted'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export function BottomTabBar() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = tab.exact
            ? (pathname === tab.path || pathname === tab.path + '/')
            : pathname.startsWith(tab.path)
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center gap-0.5 px-8 py-3 text-xs transition-colors ${
                isActive ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.icon(isActive)}
              <span className={`text-[10px] font-medium ${isActive ? 'text-accent' : ''}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
