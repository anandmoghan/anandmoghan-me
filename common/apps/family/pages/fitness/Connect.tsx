'use client';

import { useRef, useState } from "react";
import { Link } from "@/common/apps/family/router";
import { Points } from "@/common/apps/family/components/Points";
import { SectionTitle, outlineBtn, primaryBtn, softBtn } from "@/common/apps/family/components/ui";
import Spinner from "@/common/apps/family/components/Spinner";
import { useToast } from "@/common/apps/family/hooks/useToast";
import { fitnessApi, fmtDay, type FitnessData, type IngestKey, type UseFitness } from "@/common/apps/family/lib/fitness";
import { HealthHttpError } from "@/common/apps/family/lib/health";
import { timeAgo } from "@/common/apps/family/lib/format";
import shortcutSteps from "@/common/apps/family/pages/fitness/shortcutSteps";
import type { Person } from "@/common/apps/family/types";

const WHY = [
  "Web apps can't read Apple Health directly.",
  "A Shortcut on your phone sends yesterday's numbers to the home Mac every morning.",
  "Nothing goes to any other service.",
].map((t) => `- ${t}`).join("\n");

const AUTOMATE = [
  "Open the Shortcuts app and tap Automation.",
  "Tap New Automation, then Alarm, and choose Is Stopped (your wake-up alarm). Health can only be read while the phone is unlocked, so running it when you stop your alarm works better than a fixed time.",
  "No alarm? Use Time of Day at a time you usually have your phone in hand, such as 09:00.",
  "Choose Run Immediately and turn off Notify When Run.",
  "Choose the shortcut you just added (it may be called \"family-health-sync\"; you can rename it).",
];

const BACKFILL = [
  "On your iPhone open Health, tap your profile picture, then Export All Health Data.",
  "AirDrop the export to the Mac.",
  "On the Mac, drag the zip into the \"Family Health Import\" folder in the home folder.",
];

function KeyRow({ k, busy, onRevoke }: { k: IngestKey; busy: boolean; onRevoke: () => void }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3" data-testid="ingest-key">
      <div className="min-w-0 flex-1">
        <p className="font-bold">{k.label}</p>
        <p className="text-sm text-muted">
          {k.created_at ? `Created ${fmtDay(k.created_at, true)}` : "Created"}
          {k.last_used_at ? `, last used ${timeAgo(k.last_used_at)}` : ", never used"}
        </p>
        {k.last_date && <p className="text-sm text-muted">Last day sent: {fmtDay(k.last_date, true)}</p>}
      </div>
      <button type="button" disabled={busy} onClick={onRevoke} className={`${outlineBtn} text-destructive`} aria-label={`Revoke ${k.label}`}>{busy ? <><Spinner />Revoking...</> : "Revoke"}</button>
    </li>
  );
}

/** One tap: the Mac makes a key, signs it into a personal Shortcut and hands back a one-time download.
 * Returns `[busy, install]`; `install` takes the phone's name and which Shortcut. */
function useInstall(person: Person, f: UseFitness) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function install(label: string, variant: "daily" | "backfill") {
    setBusy(true);
    try {
      const r = await fitnessApi.installShortcut(f.ctx, person, label.trim() || "iPhone", variant);
      // iOS Safari and the installed app hand a .shortcut download to the Shortcuts app.
      window.location.href = r.download_url;
      await f.refresh();
    } catch (e) {
      const status = e instanceof HealthHttpError ? e.status : 0;
      const message = status === 409 ? "You already have 5 phone keys. Revoke one below first."
        : status === 429 ? "Too many installs waiting, try again in a few minutes"
        : "Could not build the Shortcut, try again";
      toast.show({ message, error: true });
    }
    setBusy(false);
  }

  return [busy, install] as const;
}

function InstallHere({ person, f, label, setLabel }: { person: Person; f: UseFitness; label: string; setLabel: (v: string) => void }) {
  const [busy, install] = useInstall(person, f);
  return (
    <div className="card space-y-3 !px-4 !py-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">Name for this phone</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} className="block min-h-11 w-full rounded-xl border border-border bg-surface px-3" />
      </label>
      <button type="button" disabled={busy} onClick={() => void install(label, "daily")} className={`${primaryBtn} w-full`}>
        {busy ? "Preparing the Shortcut…" : "Install on this iPhone"}
      </button>
      <p className="leading-relaxed text-muted">Shortcuts opens and asks to add it. Then run it once and allow Health access.</p>
    </div>
  );
}

/** The run-once backfill Shortcut: its own key, named after the phone plus "backfill". */
function SendPastMonths({ person, f, label }: { person: Person; f: UseFitness; label: string }) {
  const [busy, install] = useInstall(person, f);
  return (
    <div className="card space-y-3 !px-4 !py-4" data-testid="backfill-card">
      <p className="leading-relaxed">Sends past months from this iPhone in one go. It asks how many days back (180 is about 6 months).</p>
      <button type="button" disabled={busy} onClick={() => void install(label, "backfill")} className={`${softBtn} w-full`}>
        {busy ? "Preparing the Shortcut…" : "Install the backfill Shortcut"}
      </button>
      <p className="leading-relaxed text-muted">Run it once by hand; it can take a few minutes. Data already on the Mac is not added twice.</p>
      <p className="leading-relaxed text-muted">For your full history, the Apple Health export further down is the fullest option.</p>
    </div>
  );
}

function NewKey({ person, f }: { person: Person; f: UseFitness }) {
  const toast = useToast();
  const [label, setLabel] = useState("iPhone");
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState<string | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  async function create() {
    setBusy(true);
    try {
      const r = await fitnessApi.createIngestKey(f.ctx, person, label.trim() || "iPhone");
      setShown(r.key);
      await f.refresh();
    } catch {
      toast.show({ message: "Could not create a key, try again", error: true });
    }
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shown ?? "");
      toast.show({ message: "Key copied" });
    } catch {
      box.current?.focus();
      box.current?.select();
      toast.show({ message: "Select the key and copy it by hand", error: true });
    }
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-bold">Key name</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} className="block min-h-11 w-full rounded-xl border border-border bg-surface px-3" />
      </label>
      <button type="button" disabled={busy} onClick={() => void create()} className={softBtn}>{busy ? <><Spinner />Creating...</> : "Create a key for this phone"}</button>
      {shown && (
        <div className="space-y-2 rounded-xl bg-subtle p-3" data-testid="new-key">
          <p className="font-bold text-destructive">Copy it now, it won't be shown again.</p>
          <textarea ref={box} readOnly rows={2} value={shown} aria-label="New key" onFocus={(e) => e.currentTarget.select()} className="block w-full resize-none break-all rounded-lg border border-border bg-surface p-2 font-mono text-sm" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className={outlineBtn}>Copy</button>
            <button type="button" onClick={() => setShown(null)} className={outlineBtn}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return <ol className="list-decimal space-y-1.5 pl-6 leading-relaxed">{items.map((t) => <li key={t}>{t}</li>)}</ol>;
}

export default function Connect({ person, f, data }: { person: Person; f: UseFitness; data: FitnessData }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("iPhone");
  const keys = data.ingest_keys.filter((k) => !k.revoked);

  async function revoke(k: IngestKey) {
    setBusy(true);
    try {
      await fitnessApi.revokeIngestKey(f.ctx, person, k.id);
      toast.show({ message: `${k.label} revoked` });
      await f.refresh();
    } catch {
      toast.show({ message: "Could not revoke that key, try again", error: true });
    }
    setBusy(false);
  }

  return (
    <div className="space-y-6" data-testid="connect-page">
      <Link to={`/fitness/today?p=${person}`} className="inline-flex min-h-11 items-center font-semibold text-domain">‹ Back to Today</Link>

      <section className="space-y-2.5" aria-label="Install on this iPhone">
        <SectionTitle title="Install on this iPhone" />
        <InstallHere person={person} f={f} label={label} setLabel={setLabel} />
      </section>

      <section className="space-y-2.5" aria-label="Send past months">
        <SectionTitle title="Send past months" />
        <SendPastMonths person={person} f={f} label={label} />
      </section>

      <section className="space-y-2.5" aria-label="Why">
        <SectionTitle title="Why a Shortcut" />
        <Points text={WHY} max={3} />
      </section>

      <section className="space-y-2.5" aria-label="Your phone keys">
        <SectionTitle title="Your phone keys" />
        <div className="card card--flush divide-y divide-border">
          {keys.length === 0 ? <p className="px-4 py-3 text-muted">No keys yet.</p> : (
            <ul className="divide-y divide-border">{keys.map((k) => <KeyRow key={k.id} k={k} busy={busy} onRevoke={() => void revoke(k)} />)}</ul>
          )}
        </div>
      </section>

      <section className="space-y-2.5" aria-label="Automate">
        <SectionTitle title="Run it every morning" />
        <Steps items={AUTOMATE} />
      </section>

      <section className="space-y-2.5" aria-label="Other ways">
        <SectionTitle title="Other ways" />
        <p className="leading-relaxed">Setting up another phone, or the button above didn't work? Create a key, then add the general Shortcut, which asks for the key when you add it.</p>
        <div className="card card--flush">
          <NewKey person={person} f={f} />
        </div>
        <a href="/apps/family-health-sync.shortcut" className={outlineBtn}>Add the Shortcut</a>
        <details className="card !px-4 !pb-4">
          <summary className="flex min-h-14 cursor-pointer items-center text-lg font-extrabold">Set it up by hand</summary>
          <p className="mb-3 text-muted">If the Shortcut file won't import, build "{shortcutSteps.title}" yourself with these actions.</p>
          <ol className="list-decimal space-y-2 pl-6 leading-relaxed" data-testid="manual-steps">
            {shortcutSteps.steps.map((s, i) => <li key={i}><strong>{s.action}</strong>{s.settings ? `: ${s.settings}` : ""}</li>)}
          </ol>
        </details>
      </section>

      <section className="space-y-2.5" aria-label="Backfill">
        <SectionTitle title="Bring in your history once" />
        <Steps items={BACKFILL} />
      </section>
    </div>
  );
}
