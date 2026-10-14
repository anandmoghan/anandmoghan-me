"use client";

import { useCallback, useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { useAuth } from "@/common/firebase/AuthProvider";
import { getDb } from "@/common/firebase/client";

export interface Pin { path: string; title: string }

export const MAX_PINS = 12;

/** The stored array, keeping only well-formed entries (anything else is dropped). */
function readPins(raw: unknown): Pin[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p): p is Pin => typeof p?.path === "string" && typeof p?.title === "string" && p.path.startsWith("/"))
    .slice(0, MAX_PINS)
    .map((p) => ({ path: p.path, title: p.title }));
}

/** Pinned family pages, newest first: users/{uid}/prefs/p.familyPins. */
export function usePins() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [state, setState] = useState<{ uid: string; pins: Pin[] } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(getDb(), "users", uid, "prefs", "p"),
      (snap) => setState({ uid, pins: readPins(snap.get("familyPins")) }),
      (err) => {
        console.error("[family] reading pins failed", err);
        setState({ uid, pins: [] });
      },
    );
  }, [uid]);

  const ready = state !== null && state.uid === uid;
  const pins = ready ? state.pins : [];

  /** Pins the page (at the top) or unpins it if it is already pinned. */
  const toggle = useCallback(
    (path: string, title: string) => {
      if (!uid || !ready) return Promise.resolve();
      const next = pins.some((p) => p.path === path) ? pins.filter((p) => p.path !== path) : [{ path, title }, ...pins].slice(0, MAX_PINS);
      return setDoc(doc(getDb(), "users", uid, "prefs", "p"), { familyPins: next }, { merge: true });
    },
    [uid, ready, pins],
  );

  return { pins, ready, toggle };
}
