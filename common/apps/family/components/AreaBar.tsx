'use client';

import { Link, useLocation } from "@/common/apps/family/router";
import { DOMAIN_LABEL, DOMAIN_ROOT, domainOf } from "@/common/apps/family/lib/domain";
import MacPill from "@/common/apps/family/components/MacPill";
import { DOMAIN_ICON, GearIcon } from "@/common/apps/family/components/Icons";

/** The row above every family page (the site header above it reads "AM › Family"): the area on screen with its
 * icon, linking to that area's root, then the Mac status pill and Settings and more. */
export default function AreaBar({ showMac }: { showMac: boolean }) {
  const { pathname } = useLocation();
  const domain = domainOf(pathname);
  const Icon = DOMAIN_ICON[domain];
  return (
    <div className="flex min-h-14 items-center justify-between gap-2 px-4 pt-2 print:hidden">
      <Link to={DOMAIN_ROOT[domain]} className="tap inline-flex min-h-11 min-w-0 items-center gap-2.5 text-lg font-extrabold">
        <span className="icon-tile" aria-hidden><Icon size={20} /></span>
        <span className="truncate">{DOMAIN_LABEL[domain]}</span>
      </Link>
      <div className="flex min-w-0 items-center gap-1">
        {showMac && <MacPill />}
        <Link to="/more" aria-label="Settings and more" className="btn btn--ghost btn--icon">
          <GearIcon size={20} />
        </Link>
      </div>
    </div>
  );
}
