import { deckRegistry } from "@/common/apps/share/decks";
import { ShareDeckRoute } from "@/common/apps/share/ShareDeckRoute";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(deckRegistry).map((slug) => ({ slug }));
}

export default async function ShareDeckPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ShareDeckRoute slug={slug} />;
}
