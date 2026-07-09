import "server-only";
import { cookies } from "next/headers";
import { apiGet, apiList } from "@/lib/api";
import { getPartnerContext } from "@/lib/partner-context";
import type { Partner, Client } from "@/types/api";

// ── Types ──────────────────────────────────────────────────────────────────

export type ScopeValue =
  | { type: "all" }
  | {
      type: "partner";
      slug: string;
      id: string;
      name: string;
      /** IDs of every Client that belongs to this partner (for server-side filtering). */
      clientIds: string[];
    }
  | {
      type: "client";
      slug: string;
      id: string;
      name: string;
      partnerId?: string | null;
    };

export type ScopeContext = {
  active: ScopeValue;
  partners: Partner[];
  clients: Client[];
  /** If false, only one accessible scope — hide the selector. */
  showSelector: boolean;
  /** True when the logged-in user is admin or super_admin. */
  isAdmin: boolean;
  /**
   * Convenience: the set of client UUIDs that fall within the active scope.
   * null → no filter (show everything).
   * [] → partner scope but partner has no clients yet.
   */
  activeClientIds: string[] | null;
  /** Set only for client scope; used for ?client_slug= API params. */
  activeClientSlug: string | null;
};

// ── Cookie helpers ──────────────────────────────────────────────────────────

export const SCOPE_COOKIE = "nf-portal-scope";

export function parseScopeCookie(
  value: string | undefined,
): { type: string; slug?: string } {
  if (!value || value === "all") return { type: "all" };
  const idx = value.indexOf(":");
  if (idx === -1) return { type: "all" };
  const type = value.slice(0, idx);
  const slug = value.slice(idx + 1);
  if ((type === "partner" || type === "client") && slug) {
    return { type, slug };
  }
  return { type: "all" };
}

// ── Backend user shape (subset we care about) ──────────────────────────────

type MeResponse = {
  id: string;
  email: string;
  role: string;
  sub_role?: string;
};

// ── Main helper ────────────────────────────────────────────────────────────

/**
 * Resolves the active data-scope for the current request.
 * Call this in any server component (layout or page) that needs to know
 * which partner/client the logged-in user is currently viewing.
 *
 * Uses Next.js fetch dedup — safe to call from both layout and child pages
 * within the same render pass without making duplicate network requests.
 */
export async function getScopeContext(): Promise<ScopeContext> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SCOPE_COOKIE)?.value;
  const parsed = parseScopeCookie(rawCookie);

  // Fetch in parallel; fetch dedup keeps it to one real network call each.
  const [me, partners, clients, { partner: hostnamePartner }] =
    await Promise.all([
      apiGet<MeResponse>("/api/v1/auth/me/", { revalidate: 0 }),
      apiList<Partner>("/api/v1/partners/", { revalidate: 0 }),
      apiList<Client>("/api/v1/clients/", { revalidate: 0 }),
      getPartnerContext(),
    ]);

  const role = me?.role ?? "client";
  const isAdmin = role === "super_admin" || role === "admin";

  // If no cookie, compute a sensible default:
  //   1. If the hostname maps to a real backstage partner → that partner
  //   2. Non-admin with exactly 1 partner → that partner
  //   3. Non-admin with exactly 1 client (no partners) → that client
  //   4. Otherwise → "all"
  let effectiveParsed = parsed;
  if (!rawCookie) {
    const matchedPartner = partners.find((p) => p.slug === hostnamePartner.key);
    if (matchedPartner) {
      effectiveParsed = { type: "partner", slug: matchedPartner.slug };
    } else if (!isAdmin && partners.length === 1) {
      effectiveParsed = { type: "partner", slug: partners[0].slug };
    } else if (!isAdmin && partners.length === 0 && clients.length === 1) {
      effectiveParsed = { type: "client", slug: clients[0].slug };
    }
  }

  // Resolve to a typed ScopeValue
  let active: ScopeValue;
  if (effectiveParsed.type === "partner" && effectiveParsed.slug) {
    const p = partners.find((x) => x.slug === effectiveParsed.slug);
    if (p) {
      const clientIds = clients
        .filter((c) => c.partner === p.id)
        .map((c) => c.id);
      active = {
        type: "partner",
        slug: p.slug,
        id: p.id,
        name: p.name,
        clientIds,
      };
    } else {
      active = { type: "all" };
    }
  } else if (effectiveParsed.type === "client" && effectiveParsed.slug) {
    const c = clients.find((x) => x.slug === effectiveParsed.slug);
    if (c) {
      active = {
        type: "client",
        slug: c.slug,
        id: c.id,
        name: c.name,
        partnerId: c.partner,
      };
    } else {
      active = { type: "all" };
    }
  } else {
    active = { type: "all" };
  }

  // Show selector if admin OR if there are multiple scopes to switch between.
  const totalScopes = partners.length + clients.length;
  const showSelector = isAdmin || totalScopes > 1;

  // Pre-compute convenience fields for pages.
  let activeClientIds: string[] | null = null;
  let activeClientSlug: string | null = null;

  if (active.type === "partner") {
    activeClientIds = active.clientIds;
  } else if (active.type === "client") {
    activeClientIds = [active.id];
    activeClientSlug = active.slug;
  }

  return {
    active,
    partners,
    clients,
    showSelector,
    isAdmin,
    activeClientIds,
    activeClientSlug,
  };
}
