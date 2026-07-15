import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { apiGetCached, apiListCached } from "@/lib/api";
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
   * True when the backend role is exactly "client" — a client-only user with
   * no partner/admin reach. These users get a single fixed scope: the scope
   * selector is hidden entirely and the Clients menu item is suppressed.
   */
  isClientOnly: boolean;
  /**
   * Set for a non-admin user whose access resolves to exactly one partner.
   * When present, the scope selector should present that partner as the
   * top-level "all my clients" option and only list that partner's clients —
   * no global "All Scopes" and no separate "Partners" section.
   */
  singlePartner: Partner | null;
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
export const getScopeContext = cache(_getScopeContext);

async function _getScopeContext(): Promise<ScopeContext> {
  const cookieStore = await cookies();
  const rawCookie = cookieStore.get(SCOPE_COOKIE)?.value;
  const parsed = parseScopeCookie(rawCookie);

  // Fetch in parallel; fetch dedup keeps it to one real network call each.
  const [me, partners, clients, { partner: hostnamePartner }] =
    await Promise.all([
      apiGetCached<MeResponse>("/api/v1/auth/me/"),
      apiListCached<Partner>("/api/v1/partners/"),
      apiListCached<Client>("/api/v1/clients/"),
      getPartnerContext(),
    ]);

  const role = me?.role ?? "client";
  const isAdmin = role === "super_admin" || role === "admin";
  const isClientOnly = role === "client";

  // Default scope when there is no explicit cookie (2026-07-15 rule):
  //   Access is uniform — any user can have access to any set of clients.
  //   - Admin: hostname partner match wins, else "all" (global view).
  //   - Everyone else (client role or partner-scoped): NO "all" default.
  //       * exactly 1 accessible client       → that client
  //       * multiple accessible clients        → the FIRST client returned by
  //         the API (index 0). The selector lets them switch; "all" is not a
  //         resting state for non-admins (it fails closed — see below).
  //       * a real backstage partner match on the hostname still wins for a
  //         partner-scoped landing when it exists.
  let effectiveParsed = parsed;
  if (!rawCookie) {
    const matchedPartner = partners.find((p) => p.slug === hostnamePartner.key);
    if (isAdmin) {
      if (matchedPartner) {
        effectiveParsed = { type: "partner", slug: matchedPartner.slug };
      }
      // else leave as { type: "all" } — admins get the global view.
    } else if (matchedPartner) {
      effectiveParsed = { type: "partner", slug: matchedPartner.slug };
    } else if (clients.length >= 1) {
      // Client-role / non-admin users default to the FIRST client the API
      // reports they can access. Simple, deterministic, no "all" landing.
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

  // A non-admin user whose access resolves to exactly one partner gets a
  // partner-scoped selector (their clients only). Admins and multi-partner
  // users keep the full three-tier selector.
  const singlePartner =
    !isAdmin && partners.length === 1 ? partners[0] : null;

  // Show the client/scope selector whenever the user can reach more than one
  // client (2026-07-15 rule: if a user has access to multiple clients, the
  // scope must reflect that — they get a selector). Admins always get it.
  //   - single-partner non-admin: show when that partner has >1 client.
  //   - everyone else (incl. client role): show when they can reach >1 client.
  // A user with exactly one accessible client is pinned to it — nothing to
  // switch — so the selector is hidden.
  const clientsForSelector = singlePartner
    ? clients.filter((c) => c.partner === singlePartner.id)
    : clients;
  const showSelector = isAdmin
    ? true
    : clientsForSelector.length > 1;

  // Pre-compute convenience fields for pages.
  let activeClientIds: string[] | null = null;
  let activeClientSlug: string | null = null;

  if (active.type === "partner") {
    activeClientIds = active.clientIds;
  } else if (active.type === "client") {
    activeClientIds = [active.id];
    activeClientSlug = active.slug;
  } else {
    // active.type === "all": ONLY admins may see the unfiltered global view.
    // For any non-admin, "all" must fail CLOSED (empty), never fail open.
    // Previously this left activeClientIds = null (no filter), which, when a
    // non-admin's scope failed to resolve, rendered every partner's data
    // (the security incident this guard fixes). null is only for real admins.
    activeClientIds = isAdmin ? null : [];
  }

  return {
    active,
    partners,
    clients,
    showSelector,
    isAdmin,
    isClientOnly,
    singlePartner,
    activeClientIds,
    activeClientSlug,
  };
}
