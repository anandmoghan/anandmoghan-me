import type { Metadata } from "next";
import { AccountView } from "@/common/apps/components/AccountView";

export const metadata: Metadata = { title: "Account" };

// Open to anonymous sessions too: guests see the upgrade options here.
export default function AccountPage() {
  return <AccountView />;
}
