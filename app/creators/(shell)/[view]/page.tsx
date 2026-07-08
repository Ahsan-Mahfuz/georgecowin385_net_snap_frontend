import { notFound } from "next/navigation";
import { creatorRegistry } from "@/components/views/creators/registry";

export default async function CreatorViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  const View = creatorRegistry[view];
  if (!View) notFound();
  return <View />;
}
