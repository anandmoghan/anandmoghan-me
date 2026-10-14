import type { Metadata, Viewport } from "next";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { BottomTabBar } from "@/common/apps/expense/components/BottomTabBar";
import { ServiceWorkerRegister } from "@/common/apps/expense/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Expense",
  manifest: "/apps/manifest-expense.json",
  icons: { icon: "/apps/icon-expense.svg", apple: "/apps/icon-expense.svg" },
  appleWebApp: { capable: true, title: "Expense", statusBarStyle: "default" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  // The page background of the light and dark themes (global tokens.css --bg).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1815" },
  ],
};

export default function ExpenseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ServiceWorkerRegister />
      <div className="with-tab-bar relative min-h-[calc(100vh-56px-env(safe-area-inset-top))]">
        {children}
        <BottomTabBar />
      </div>
    </RequireAuth>
  );
}
