import type { Metadata, Viewport } from "next";
import { standaloneMetadata, standaloneViewport } from "@/common/apps/standalone/metadata";

// Nila installs on its own: its manifest and service worker (scope /apps/family/nila) replace Family's on these routes.
export const metadata: Metadata = standaloneMetadata("nila");

export const viewport: Viewport = standaloneViewport("nila");

export default function NilaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
