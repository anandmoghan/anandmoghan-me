'use client';

import type { ReactNode } from "react";
import type { Domain } from "@/common/apps/family/lib/domain";
const base = { viewBox: "0 0 24 24", "aria-hidden": true, fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
type P = { size?: number };
const ic = (d: ReactNode, sw = 1.8, def = 22) => ({ size = def }: P) => <svg {...base} width={size} height={size} strokeWidth={sw}>{d}</svg>;

export const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg {...base} width="20" height="20" fill={filled ? "currentColor" : "none"} strokeWidth="2">
    <path d="M12 20.5s-8-4.9-8-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.9c0 5.7-8 10.6-8 10.6Z" />
  </svg>
);
export const CloseIcon = ic(<path d="M6 6l12 12M18 6L6 18" />, 2.2, 18);
export const RestoreIcon = ic(<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />, 2.2, 18);
export const BackIcon = ic(<path d="M15 6l-6 6 6 6" />, 2.2, 18);
export const ChevronRightIcon = ic(<path d="M9 6l6 6-6 6" />, 2.2, 18);
export const BagIcon = ic(<path d="M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2" />);
export const FeedIcon = ic(<path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5" />);
export const UploadIcon = ic(<path d="M12 16V5m0 0-4 4m4-4 4 4M5 19h14" />);
export const SunMoonIcon = ic(<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z" />, 2, 20);
export const HealthIcon = ic(<path d="M3 12h4l2-5 4 10 2-5h6" />);
export const MoreIcon = ic(<><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>);
export const SparkleIcon = ic(<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" />);
export const HangerIcon = ic(<path d="M12 8a2.5 2.5 0 1 0-2.5-2.5M12 8v2l9 6.5a1 1 0 0 1-.6 1.8H3.6a1 1 0 0 1-.6-1.8L12 10" />);
export const HeartPulseIcon = ic(<path d="M12 20s-8-4.7-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.3 12 20 12 20ZM7 12h3l1.5-2.5 2 4L15 12h2" />);
export const GearIcon = ic(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" /></>);
export const HomeIcon = ic(<path d="M4 11l8-7 8 7v8.5a.5.5 0 0 1-.5.5H15v-6H9v6H4.5a.5.5 0 0 1-.5-.5V11Z" />);
export const BellIcon = ic(<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Zm4 4h4" />);
export const GridIcon = ic(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
export const LayersIcon = ic(<path d="M12 4l8 4-8 4-8-4 8-4Zm-8 8l8 4 8-4M4 16l8 4 8-4" />);
export const BoxIcon = ic(<path d="M4 7.5 12 4l8 3.5v9L12 20l-8-3.5v-9Zm0 0 8 3.5 8-3.5M12 11v9" />);
export const DocIcon = ic(<path d="M7 3h7l4 4v14H7V3Zm7 0v4h4M10 12h5M10 16h5" />);
export const ChartIcon = ic(<path d="M4 20h16M7 16v-4M12 16V8M17 16v-6" />);
export const ChatIcon = ic(<path d="M5 5h14v10H10l-4 4v-4H5V5Z" />);
export const BookIcon = ic(<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Zm0 15A1.5 1.5 0 0 0 6.5 21H19" />);
export const CameraIcon = ic(<><path d="M4 8h3l2-3h6l2 3h3v11H4V8Z" /><circle cx="12" cy="13" r="3.5" /></>);
export const ImageIcon = ic(<><rect x="4" y="4" width="16" height="16" rx="2" /><circle cx="9" cy="9.5" r="1.5" /><path d="M4 17l5-5 4 4 2-2 5 5" /></>);
export const ListIcon = ic(<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />, 2);
export const DotIcon = ic(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" fill="currentColor" /></>);
export const FlagIcon = ic(<path d="M5 21V4m0 0h11l-2 4 2 4H5" />);
export const DumbbellIcon = ic(<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11" />, 2);
export const CheckListIcon = ic(<path d="M10 6h10M10 12h10M10 18h10M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5" />);
export const TargetIcon = ic(<><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>);
export const TrendIcon = ic(<path d="M4 17l5-5 4 3 7-8M15 7h5v5" />);
export const BowlIcon = ic(<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0ZM9 7c0-1.5 1-2 1-3.5M13 7c0-1.5 1-2 1-3.5M8 20h8" />);
export const FlaskIcon = ic(<path d="M9.5 3h5M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9" />);
/** A small child: round head with one curl, shoulders below. Nila's area. */
export const ChildIcon = ic(<><circle cx="12" cy="9" r="4.5" /><path d="M11 4.6c.4-1.3 2.2-1.4 2.6-.2M5 20.5a7 7 0 0 1 14 0" /></>);
export const MoonIcon = ic(<path d="M19.5 14.5A7.5 7.5 0 1 1 9.5 4.5a6 6 0 0 0 10 10Z" />);
export const StepsIcon = ic(<path d="M4 19h4v-4h4v-4h4V7h4" />, 2);
export const HelpIcon = ic(<><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8h.01" /></>);
export const InfoIcon = ic(<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>, 2, 18);

export const DOMAIN_ICON: Record<Domain, (p: P) => ReactNode> = {
  home: HomeIcon, health: HeartPulseIcon, fitness: DumbbellIcon, parenting: ChildIcon, shopping: BagIcon, style: SparkleIcon, updates: BellIcon,
};
