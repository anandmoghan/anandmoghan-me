'use client';

import type { ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { BagIcon, CameraIcon, ChevronRightIcon, SparkleIcon, UploadIcon } from "@/common/apps/family/components/Icons";

const LINKS: { to: string; title: string; hint: string; icon: ReactNode }[] = [
  { to: "/upload", title: "Upload photos", hint: "Wardrobe items and reference photos", icon: <UploadIcon size={20} /> },
  { to: "/tryons", title: "My try-ons", hint: "Photos of how you look in shop picks", icon: <CameraIcon size={20} /> },
  { to: "/style", title: "Style guide", hint: "Colours, fit rules and what to skip", icon: <SparkleIcon size={20} /> },
  { to: "/brief/new", title: "New brief", hint: "Ask for shopping picks", icon: <BagIcon size={20} /> },
];

/** Links to the family pages that have no tab of their own. */
export default function Shortcuts() {
  return (
    <ul className="card card--flush divide-y divide-border">
      {LINKS.map((l) => (
        <li key={l.to}>
          <Link to={l.to} className="tap flex min-h-16 items-center gap-3 px-3.5 py-3 hover:bg-subtle">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-foreground/80" aria-hidden>{l.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold">{l.title}</span>
              <span className="block text-sm text-muted">{l.hint}</span>
            </span>
            <span className="shrink-0 text-muted"><ChevronRightIcon /></span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
