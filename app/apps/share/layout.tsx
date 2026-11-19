import type { Metadata, Viewport } from "next";
import { standaloneMetadata, standaloneViewport } from "@/common/apps/standalone/metadata";

export const metadata: Metadata = {
  ...standaloneMetadata("share"),
  title: "Shared deck",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export const viewport: Viewport = standaloneViewport("share");

export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
