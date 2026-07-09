import "server-only";
import { apiList, emptyOnError } from "@/lib/api";
import type { ScopeContext } from "@/lib/scope";
import type { NavData } from "@/components/dashboard/shell";
import type {
  Client,
  Project,
  ProposalListItem,
  BrandListItem,
  BackstageDeliverable,
} from "@/types/api";

/**
 * Build the searchable-flyout entry lists for the sidebar, scoped to the
 * active partner/client. Mirrors the scope-filtering used by each resource
 * list page so the flyouts never surface out-of-scope records.
 *
 * All fetches run in parallel and individually degrade to empty arrays, so a
 * single failing endpoint never blanks the whole sidebar.
 */
export async function buildNavData(scopeCtx: ScopeContext): Promise<NavData> {
  const { activeClientIds, active } = scopeCtx;

  // Scoped deliverables URL (mirrors the deliverables page/dashboard).
  let deliverablesPath = "/api/v1/deliverables/";
  if (active.type === "partner") {
    deliverablesPath += `?partner=${encodeURIComponent(active.slug)}`;
  } else if (active.type === "client") {
    deliverablesPath += `?client=${encodeURIComponent(active.slug)}`;
  }

  const [deliverables, clients, projects, proposals, brands] = await Promise.all([
    apiList<BackstageDeliverable>(deliverablesPath, { revalidate: 0 }).catch(
      emptyOnError<BackstageDeliverable>,
    ),
    apiList<Client>("/api/v1/clients/", { revalidate: 0 }).catch(emptyOnError<Client>),
    apiList<Project>("/api/v1/projects/", { revalidate: 0 }).catch(emptyOnError<Project>),
    apiList<ProposalListItem>("/api/v1/proposals/", { revalidate: 0 }).catch(
      emptyOnError<ProposalListItem>,
    ),
    apiList<BrandListItem>("/api/v1/brands/", { revalidate: 0 }).catch(
      emptyOnError<BrandListItem>,
    ),
  ]);

  // Scope helpers. activeClientIds === null → "all" scope, no filtering.
  const inScopeClientId = (clientId?: string | null): boolean =>
    activeClientIds === null ||
    (clientId != null && activeClientIds.includes(clientId));

  const scopedClients =
    activeClientIds === null
      ? clients
      : clients.filter((c) => activeClientIds.includes(c.id));

  const scopedProjects = projects.filter((p) => inScopeClientId(p.client));

  // Proposals: hide lead-only (client === null) proposals outside "all" scope.
  const scopedProposals =
    activeClientIds === null
      ? proposals
      : proposals.filter((p) => p.client != null && inScopeClientId(p.client));

  const scopedBrands = brands.filter((b) => inScopeClientId(b.client));

  const scopedDeliverables =
    activeClientIds === null
      ? deliverables
      : deliverables.filter((d) => inScopeClientId(d.client_id));

  return {
    deliverables: scopedDeliverables.map((d) => ({
      href: `/dashboard/deliverables/${d.id}`,
      label: d.name,
      sub: d.project_name ?? d.client_name ?? undefined,
    })),

    // Budget flyout mirrors approved proposals — one entry per proposal that
    // has approved line items (kept simple here: any non-draft/void proposal).
    budget: scopedProposals
      .filter(
        (p) =>
          p.status === "proposal.approved" ||
          p.status === "proposal.ready" ||
          p.status === "proposal.revision_request",
      )
      .map((p) => ({
        href: `/dashboard/budget#proposal-${p.id}`,
        label: p.name,
        sub: p.client_name ?? p.lead_name ?? undefined,
      })),

    clients: scopedClients.map((c) => ({
      href: `/dashboard/clients/${c.slug}`,
      label: c.name,
      sub: c.partner_name ?? undefined,
    })),

    projects: scopedProjects.map((p) => ({
      href: `/dashboard/projects/${p.slug}`,
      label: p.name,
      sub: p.client_name ?? undefined,
    })),

    proposals: scopedProposals.map((p) => ({
      href: `/dashboard/proposals/${p.id}`,
      label: p.name,
      sub: p.client_name ?? p.lead_name ?? undefined,
    })),

    brands: scopedBrands.map((b) => ({
      href: `/dashboard/brands/${b.slug}`,
      label: b.name,
      sub: b.client_name ?? undefined,
    })),
  };
}
