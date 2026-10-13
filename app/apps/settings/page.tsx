import type { Metadata } from "next";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { SettingsView } from "@/common/apps/components/SettingsView";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <RequireAuth>
      <SettingsView />
    </RequireAuth>
  );
}
