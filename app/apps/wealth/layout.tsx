import type { Metadata, Viewport } from "next";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { WealthShell } from "@/common/apps/wealth/components/WealthShell";

export const metadata: Metadata = {
  title: "Wealth",
  manifest: "/apps/manifest-wealth.json",
  icons: {
    icon: { url: "/apps/icon-wealth.svg", type: "image/svg+xml" },
    apple: "/apps/icon-wealth-192.png",
  },
  appleWebApp: { capable: true, title: "Wealth", statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1815" },
  ],
};

export default function WealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WealthShell>{children}</WealthShell>
    </RequireAuth>
  );
}
