import Fitness from "@/common/apps/family/pages/fitness/Fitness";
import { FITNESS_ROUTE_TABS } from "@/common/apps/family/lib/tabs";

export function generateStaticParams() {
  return FITNESS_ROUTE_TABS.map((tab) => ({ tab }));
}

export default function Page() {
  return <Fitness />;
}
