import type { Metadata, Viewport } from "next";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { BottomTabBar } from "@/common/apps/expense/components/BottomTabBar";
import { ServiceWorkerRegister } from "@/common/apps/expense/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "Expense",
  manifest: "/apps/manifest-expense.json",
  icons: { icon: "/apps/icon-expense.svg", apple: "/apps/icon-expense.svg" },
  appleWebApp: { capable: true, title: "Expense", statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function ExpenseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ServiceWorkerRegister />
      <div className="relative min-h-[calc(100vh-56px-env(safe-area-inset-top))] pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
        <BottomTabBar />
      </div>
    </RequireAuth>
  );
}
