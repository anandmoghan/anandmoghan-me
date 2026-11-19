import type { Metadata, Viewport } from "next";
import { standaloneMetadata, standaloneViewport } from "@/common/apps/standalone/metadata";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { BottomTabBar } from "@/common/apps/expense/components/BottomTabBar";

export const metadata: Metadata = standaloneMetadata("expense");

export const viewport: Viewport = standaloneViewport("expense");

export default function ExpenseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="with-tab-bar relative min-h-[calc(100vh-56px-env(safe-area-inset-top))]">
        {children}
        <BottomTabBar />
      </div>
    </RequireAuth>
  );
}
