import type { Metadata } from "next";
import { NilaPwa } from "@/common/apps/family/components/parenting/NilaPwa";

// Nila installs on its own: this manifest (scope /apps/family/nila) replaces the Family one on these routes,
// and the service worker is registered here only. The theme colours come from the Family layout.
export const metadata: Metadata = {
  title: "Nila",
  manifest: "/apps/manifest-nila.json",
  icons: {
    icon: { url: "/apps/icons/nila.svg", type: "image/svg+xml" },
    apple: "/apps/icons/nila-180.png",
  },
  appleWebApp: { capable: true, title: "Nila", statusBarStyle: "default" },
  other: { "apple-mobile-web-app-capable": "yes", "mobile-web-app-capable": "yes" },
};

export default function NilaLayout({ children }: { children: React.ReactNode }) {
  return (
    <NilaPwa>{children}</NilaPwa>
  );
}
