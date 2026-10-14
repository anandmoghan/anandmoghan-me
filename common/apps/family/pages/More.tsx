'use client';

import { useState, type ReactNode } from "react";
import { Link } from "@/common/apps/family/router";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useTheme } from "@/common/components/ThemeProvider";
import { PageTitle, SectionTitle, Segmented } from "@/common/apps/family/components/ui";
import { BagIcon, CameraIcon, ChevronRightIcon, SparkleIcon, UploadIcon } from "@/common/apps/family/components/Icons";
import MacStatusCard from "@/common/apps/family/components/MacStatusCard";
import Spinner from "@/common/apps/family/components/Spinner";

const LINKS: { to: string; title: string; hint: string; icon: ReactNode }[] = [
  { to: "/upload", title: "Upload photos", hint: "Wardrobe items and reference photos", icon: <UploadIcon size={20} /> },
  { to: "/tryons", title: "My try-ons", hint: "Photos of how you look in shop picks", icon: <CameraIcon size={20} /> },
  { to: "/style", title: "Style guide", hint: "Colours, fit rules and what to skip", icon: <SparkleIcon size={20} /> },
  { to: "/brief/new", title: "New brief", hint: "Ask for shopping picks", icon: <BagIcon size={20} /> },
];

export default function More() {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  return (
    <div className="mx-auto max-w-2xl space-y-7 px-4 pt-5 pb-6">
      <PageTitle title="Settings and more" />
      <section className="space-y-2.5">
        <SectionTitle title="Shortcuts" />
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
      </section>
      <section className="space-y-2.5">
        <SectionTitle title="Appearance" />
        <Segmented label="Theme" value={theme} onChange={setTheme} options={[["system", "Automatic"], ["light", "Light"], ["dark", "Dark"]]} />
      </section>
      <MacStatusCard />
      <button type="button" disabled={signingOut} aria-busy={signingOut} onClick={() => { setSigningOut(true); void signOut().finally(() => setSigningOut(false)); }} className="tap card flex w-full items-center gap-2 !px-4 text-left font-bold text-destructive hover:bg-subtle disabled:opacity-60">
        {signingOut ? <><Spinner />Signing out...</> : "Sign out"}
      </button>
    </div>
  );
}
