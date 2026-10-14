'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export const HEADER_SLOT_ID = 'app-header-slot';

// Renders its children into the site header's right side, before the theme toggle, so an app
// can add its own items. The target exists only in the browser, so nothing renders until mounted.
export function HeaderSlot({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById(HEADER_SLOT_ID)), []);
  return target ? createPortal(children, target) : null;
}
