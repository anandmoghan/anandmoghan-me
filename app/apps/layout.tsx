import type { Metadata } from "next";
import { AppsShell } from "@/common/apps/components/AppsShell";
import "./apps.css";

export const metadata: Metadata = {
  title: "Apps",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function AppsLayout({ children }: { children: React.ReactNode }) {
  return <AppsShell>{children}</AppsShell>;
}
