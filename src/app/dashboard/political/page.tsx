import { redirect } from "next/navigation";
import { getScopeContext } from "@/lib/scope";
import {
  getPoliticalLists,
  getPoliticalStores,
  getVoterAnalytics,
  scopeHasPoliticalNiche,
  politicalClientsInReach,
  POLITICAL_VIEWS,
} from "@/lib/political";
import { PoliticalScopePrompt } from "@/components/political/political-scope-prompt";
import { PoliticalDashboard } from "@/components/political/political-dashboard";
import {
  segmentsForStore,
} from "@/components/political/segment-filter-dropdown";

export const dynamic = "force-dynamic";

type ElectionType = "primary" | "general";
type GeoType = "county" | "ld" | "sd";

export default async function PoliticalPage({
  searchParams,
}: {
  searchParams: Promise<{
    store?: string;
    election?: string;
    geoType?: string;
    geoValue?: string;
  }>;
}) {
  const scopeCtx = await getScopeContext();

  // ── Niche gate (unchanged) ──────────────────────────────────────────────
  if (!scopeHasPoliticalNiche(scopeCtx)) {
    const reachable = politicalClientsInReach(scopeCtx);
    if (reachable.length === 0) {
      redirect("/dashboard");
    }
    return (
      <PoliticalScopePrompt
        clients={reachable.map((c) => ({
          slug: c.slug,
          name: c.name,
          partnerName: c.partner_name ?? null,
        }))}
      />
    );
  }

  const sp = await searchParams;

  const [grouped, politicalStores] = await Promise.all([
    getPoliticalLists(scopeCtx),
    getPoliticalStores(scopeCtx),
  ]);

  // Only master voter files drive the analytics widgets.
  const voterFiles = politicalStores.filter(
    (s) => s.kind === "voter_file" && s.rowCount > 0,
  );

  const activeStore =
    voterFiles.find((s) => s.id === sp.store) ?? voterFiles[0] ?? null;

  const electionType: ElectionType =
    sp.election === "general" ? "general" : "primary";
  const geoType: GeoType =
    sp.geoType === "ld" ? "ld" : sp.geoType === "sd" ? "sd" : "county";
  const geoValue: string = sp.geoValue ?? "";

  // Initial analytics — whole-file, server-side (no filter on first render)
  const initialAnalytics = activeStore
    ? await getVoterAnalytics(activeStore.id, {
        electionType,
        weight: "county",
        top: 25,
      })
    : null;

  // ── Title / subtitle ─────────────────────────────────────────────────────
  let clientSubtitle: string | null = null;
  if (
    scopeCtx.active.type === "client" ||
    scopeCtx.active.type === "partner"
  ) {
    clientSubtitle = scopeCtx.active.name;
  } else if (activeStore?.clientName) {
    clientSubtitle = activeStore.clientName;
  }

  // ── County options from initial analytics ────────────────────────────────
  const countyOptions = (initialAnalytics?.county_counts ?? []).map(
    (c) => c.label,
  );

  // ── Segments for the active store ────────────────────────────────────────
  const storeSegments = activeStore
    ? segmentsForStore(grouped, activeStore.id)
    : [];

  // ── Grouped lists for nav cards (counts) ─────────────────────────────────
  const groupedLists: Record<string, typeof grouped[keyof typeof grouped]> = {};
  for (const view of POLITICAL_VIEWS) {
    groupedLists[view] = grouped[view];
  }

  return (
    <PoliticalDashboard
      activeStore={activeStore}
      voterFiles={voterFiles}
      initialAnalytics={initialAnalytics}
      countyOptions={countyOptions}
      groupedLists={groupedLists}
      storeSegments={storeSegments}
      clientSubtitle={clientSubtitle}
      isAdmin={scopeCtx.isAdmin}
      initialGeoType={geoType}
      initialGeoValue={geoValue}
      initialElection={electionType}
      activeStoreId={activeStore?.id ?? null}
    />
  );
}
