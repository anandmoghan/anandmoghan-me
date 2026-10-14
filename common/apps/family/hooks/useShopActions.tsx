'use client';

import { useState } from "react";
import DismissSheet from "@/common/apps/family/components/DismissSheet";
import { useAuth } from "@/common/firebase/AuthProvider";
import { useToast } from "@/common/apps/family/hooks/useToast";
import * as w from "@/common/apps/family/lib/writes";
import { fullName } from "@/common/apps/family/lib/shop";
import type { Suggestion } from "@/common/apps/family/types";

/** Shortlist / dismiss / restore / mark ordered for suggestions. Reads come straight from
 * Firestore snapshots, which already include the local pending write, so the UI is optimistic
 * without any local override state. */
export function useShopActions(suggestions: Suggestion[]) {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const toast = useToast();
  const [sheetId, setSheetId] = useState<string | null>(null);
  const byId = (id: string) => suggestions.find((s) => s.id === id);

  function run(p: Promise<unknown>) {
    p.catch(() => toast.show({ message: "Could not save", error: true }));
  }

  function shortlist(id: string) {
    run(w.shortlist(email, id));
    toast.show({ message: "Shortlisted", actionLabel: "Undo", onAction: () => run(w.resetSuggestion(email, id)) });
  }
  function unshortlist(id: string) {
    run(w.resetSuggestion(email, id));
    toast.show({ message: "Removed from shortlist", actionLabel: "Undo", onAction: () => run(w.shortlist(email, id)) });
  }
  function restore(id: string) {
    run(w.resetSuggestion(email, id));
    toast.show({ message: "Restored" });
  }
  function dismiss(id: string) {
    setSheetId(id);
  }
  function answerSheet(reason: string | null) {
    const id = sheetId;
    if (!id) return;
    setSheetId(null);
    run(w.dismiss(email, id, reason));
    toast.show({ message: "Dismissed", actionLabel: "Undo", onAction: () => run(w.resetSuggestion(email, id)) });
  }
  function markOrdered(s: Suggestion) {
    run(w.markOrdered(email, s, s.recommended_size));
    toast.show({ message: "Marked ordered" });
  }

  const sheet = (
    <DismissSheet id={sheetId} title={sheetId && byId(sheetId) ? fullName(byId(sheetId)!.title, byId(sheetId)!.brand) : ""} onReason={answerSheet} />
  );
  return { shortlist, unshortlist, restore, dismiss, markOrdered, sheet };
}
