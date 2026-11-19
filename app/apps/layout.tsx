import type { Metadata } from "next";
import { AppsShell } from "@/common/apps/components/AppsShell";
import { StandaloneRuntime } from "@/common/apps/standalone/StandaloneRuntime";
import "./apps.css";

export const metadata: Metadata = {
  title: "Apps",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return (
    <StandaloneRuntime>
      <AppsShell>{children}</AppsShell>
    </StandaloneRuntime>
  );
}
