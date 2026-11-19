import type { Metadata, Viewport } from "next";
import { standaloneMetadata, standaloneViewport } from "@/common/apps/standalone/metadata";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { WealthShell } from "@/common/apps/wealth/components/WealthShell";

export const metadata: Metadata = standaloneMetadata("wealth");

export const viewport: Viewport = standaloneViewport("wealth");

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WealthShell>{children}</WealthShell>
    </RequireAuth>
  );
}
