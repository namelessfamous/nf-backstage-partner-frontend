import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import { getPoliticalLists, scopeHasPoliticalNiche } from "@/lib/political";
import { parseFilterParam } from "@/lib/political-types";
import { SegmentDetailContent } from "@/components/political/segment-detail";

export const dynamic = "force-dynamic";

export default async function WalkSegmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ segmentId: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const { segmentId } = await params;
  const { filter } = await searchParams;
  const scopeCtx = await getScopeContext();

  if (!scopeHasPoliticalNiche(scopeCtx)) {
    redirect("/dashboard");
  }

  const grouped = await getPoliticalLists(scopeCtx);
  const segment = grouped.walk.find((s) => s.id === segmentId);

  return (
    <SegmentDetailContent
      view="walk"
      segment={segment}
      initialFilter={parseFilterParam(filter)}
    />
  );
}
