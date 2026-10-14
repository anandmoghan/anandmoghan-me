import type { Metadata } from "next";
import { RequireAuth } from "@/common/apps/components/RequireAuth";
import { NotificationsPage } from "@/common/notifications/NotificationsPage";

export const metadata: Metadata = {
  title: "Notifications",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <RequireAuth>
      <NotificationsPage />
    </RequireAuth>
  );
}
