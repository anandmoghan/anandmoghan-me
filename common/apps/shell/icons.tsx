import type { ReactNode } from 'react'
import type { Domain } from './DomainScope'

// 24px stroke icons in the family app's style (round caps, 1.8 stroke).
// Sized by the caller's size prop; colour follows currentColor.
type IconProps = { size?: number }

const icon = (paths: ReactNode, strokeWidth = 1.8, defaultSize = 22) =>
  function Icon({ size = defaultSize }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {paths}
      </svg>
    )
  }

export const GridIcon = icon(
  <>
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </>,
)
export const WealthIcon = icon(<path d="M4 20h16M4 16l5-5 4 3 7-8M15 6h5v5" />)
export const ClockIcon = icon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
)
export const ReceiptIcon = icon(<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h4" />)
export const SlidesIcon = icon(
  <>
    <rect x="3.5" y="4.5" width="17" height="12" rx="1.5" />
    <path d="M12 16.5V20M8.5 20h7" />
  </>,
)
export const LadderIcon = icon(<path d="M8 3v18M16 3v18M8 7h8M8 12h8M8 17h8" />)
export const CalendarIcon = icon(
  <>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
)
export const BookIcon = icon(
  <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Zm0 15A1.5 1.5 0 0 0 6.5 21H19" />,
)
export const ShieldIcon = icon(<path d="M12 3l7 3v5.5c0 4.4-3 8-7 9.5-4-1.5-7-5.1-7-9.5V6l7-3Z" />)
export const HomeIcon = icon(
  <path d="M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5V11Z" />,
)
export const LockIcon = icon(
  <>
    <rect x="5" y="10.5" width="14" height="10" rx="2" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </>,
)
export const GearIcon = icon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </>,
)
export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </>,
  2,
  18,
)
export const BellIcon = icon(
  <>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </>,
  1.8,
  20,
)
export const SignOutIcon = icon(<path d="M15 16l4-4-4-4M19 12H9M12 20H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h6" />, 2, 18)
export const ChevronRightIcon = icon(<path d="M9 6l6 6-6 6" />, 2.2, 18)
export const BackIcon = icon(<path d="M15 6l-6 6 6 6" />, 2.2, 18)

// Header and hub icon for each site area that has one. Family areas bring their own
// icons when the family app is ported.
export const DOMAIN_ICON: Partial<Record<Domain, (p: IconProps) => ReactNode>> = {
  home: GridIcon,
  wealth: WealthIcon,
  time: ClockIcon,
  expense: ReceiptIcon,
  share: SlidesIcon,
  ladder: LadderIcon,
  materials: BookIcon,
  planner: CalendarIcon,
  admin: ShieldIcon,
}
