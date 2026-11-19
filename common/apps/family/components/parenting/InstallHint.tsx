'use client';

import { useEffect, useState } from "react";
import { CloseIcon } from "@/common/apps/family/components/Icons";
import { outlineBtn } from "@/common/apps/family/components/ui";
import { useInstallPrompt } from "@/common/apps/standalone/StandaloneRuntime";

const DISMISSED_KEY = "nila-install-dismissed";

type Device = "standalone" | "ios" | "other";

function deviceNow(): Device {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "standalone";
  // iPadOS reports itself as a Mac with a touch screen.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);
  return ios ? "ios" : "other";
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** A small card on Today for a browser tab (not the installed app): how to put Nila on the home screen. iOS Safari
 * has no install button, so it gets the Share steps; Chrome gets an Install button from its install prompt. */
export default function InstallHint() {
  const prompt = useInstallPrompt();
  const [device, setDevice] = useState<Device>("standalone");
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDevice(deviceNow());
    setDismissed(wasDismissed());
  }, []);

  const showIos = device === "ios";
  if (dismissed || device === "standalone" || (!showIos && !prompt)) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private browsing: the card comes back next visit.
    }
  }

  return (
    <section aria-label="Install Nila" className="card flex items-start gap-3 !p-3.5" data-testid="install-hint">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="font-bold">Keep Nila on your home screen</p>
        {showIos ? (
          <p className="text-sm text-muted">Tap Share in Safari, then Add to Home Screen. It opens like an app and shows what it last loaded, even without a connection.</p>
        ) : (
          <>
            <p className="text-sm text-muted">Install it to open like an app. It shows what it last loaded, even without a connection.</p>
            <button type="button" className={outlineBtn} onClick={() => void prompt?.prompt().then(dismiss)}>Install</button>
          </>
        )}
      </div>
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="tap -mr-1 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-subtle">
        <CloseIcon />
      </button>
    </section>
  );
}
