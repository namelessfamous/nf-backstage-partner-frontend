import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import { getPoliticalLists, scopeHasPoliticalNiche } from "@/lib/political";
import { SegmentDetailContent } from "@/components/political/segment-detail";

export const dynamic = "force-dynamic";

export default async function CallSegmentDetailPage({
  params,
}: {
  params: Promise<{ segmentId: string }>;
}) {
  const { segmentId } = await params;
  const scopeCtx = await getScopeContext();

  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const grouped = await getPoliticalLists(scopeCtx);
  const segment = grouped.call.find((s) => s.id === segmentId);

  return <SegmentDetailContent view="call" segment={segment} />;
}
