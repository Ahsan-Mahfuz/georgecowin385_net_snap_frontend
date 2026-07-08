import { notFound } from "next/navigation";
import { collectiveRegistry } from "@/components/views/collective/registry";

export default async function CollectiveViewPage({ params }: { params: Promise<{ view: string }> }) {
  const { view } = await params;
  const View = collectiveRegistry[view];
  if (!View) notFound();
  return <View />;
}
