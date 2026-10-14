import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { FamilyApp } from "@/common/apps/family/FamilyApp";
import { PageSkeleton } from "@/common/apps/shell/Skeleton";
import "./family.css";

// The family app (ported from personal-manager/web). Routing: one static page per screen, ids in
// the query string; see common/apps/family/router.tsx.

export const metadata: Metadata = {
  title: "Family",
  manifest: "/apps/manifest-family.json",
  icons: {
    icon: { url: "/apps/icon-family.svg", type: "image/svg+xml" },
    apple: "/apps/icon-family-180.png",
  },
  appleWebApp: { capable: true, title: "Family", statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1815" },
  ],
};

// FamilyApp reads the query string, which a static export only has in the browser.
export default function FamilyLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <FamilyApp>{children}</FamilyApp>
    </Suspense>
  );
}
