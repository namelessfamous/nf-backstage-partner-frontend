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
import {
  clientDefaultElection,
  clientAssignedFilter,
  buildInitialEffectiveFilter,
} from "@/lib/political-defaults";

export const dynamic = "force-dynamic";

type ElectionType = "primary" | "general";
type GeoType = "county" | "ld" | "sd";

import type { ScopeContext } from "@/lib/scope";

/** Narrowing helper: the active scope's client id, or null when not a client scope. */
function activeScopeId(ctx: ScopeContext): string | null {
  return ctx.active.type === "client" ? ctx.active.id : null;
}

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

  // ── Client political meta: default election + viewer-assigned base filter ──
  // The active scope is guaranteed to be a single political client here (the
  // niche gate above returns early for partner/all scopes). Resolve that
  // client's political meta to seed the current filter.
  const activeClient =
    scopeCtx.active.type === "client"
      ? scopeCtx.clients.find((c) => c.id === activeScopeId(scopeCtx)) ?? null
      : null;
  const metaDefaultElection = clientDefaultElection(activeClient);
  const assignedFilter = clientAssignedFilter(activeClient);

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

  // Default election = general unless the client political meta overrides it,
  // unless the URL explicitly names one (user in-session override wins).
  const electionType: ElectionType =
    sp.election === "general" || sp.election === "primary"
      ? sp.election
      : metaDefaultElection;
  const geoType: GeoType =
    sp.geoType === "ld" ? "ld" : sp.geoType === "sd" ? "sd" : "county";
  const geoValue: string = sp.geoValue ?? "";

  // Initial analytics — pre-filtered by the DEFAULT CURRENT FILTER so first
  // paint already reflects the freq floor (General/PrimaryFrequency > 0) and
  // any viewer-assigned base filter, matching the client dashboard's seeded
  // state (no flash of the unfiltered whole file).
  const initialEffectiveFilter = buildInitialEffectiveFilter(
    electionType,
    assignedFilter,
  );
  const initialAnalytics = activeStore
    ? await getVoterAnalytics(activeStore.id, {
        electionType,
        weight: "county",
        top: 25,
        filter: initialEffectiveFilter,
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
      assignedFilter={assignedFilter}
      initialEffectiveFilter={initialEffectiveFilter}
      activeStoreId={activeStore?.id ?? null}
    />
  );
}
