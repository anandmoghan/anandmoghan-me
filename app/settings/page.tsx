import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { SettingsPage } from "@/common/apps/components/SettingsPage";
import { Spinner } from "@/common/apps/components/Spinner";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

// SettingsPage reads ?app=, which a static export only has in the browser.
export default function Page() {
  return (
    <Suspense fallback={<Spinner text="Loading" />}>
      <RequireAuth>
        <SettingsPage />
      </RequireAuth>
    </Suspense>
  );
}
