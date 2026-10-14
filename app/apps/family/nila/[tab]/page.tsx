import Parenting from "@/common/apps/family/pages/parenting/Parenting";
import { PARENTING_ROUTE_TABS } from "@/common/apps/family/lib/tabs";

export function generateStaticParams() {
  return PARENTING_ROUTE_TABS.map((tab) => ({ tab }));
}

export default function Page() {
  return <Parenting />;
}
