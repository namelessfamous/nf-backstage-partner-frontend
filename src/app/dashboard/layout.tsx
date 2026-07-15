import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPartnerContext } from "@/lib/partner-context";
import { getScopeContext } from "@/lib/scope";
import { DashboardShell, type NavData } from "@/components/dashboard/shell";
import { buildNavData } from "@/lib/nav-data";
import { scopeHasPoliticalNiche } from "@/lib/political";
import { SessionExpiredError } from "@/lib/api";
import { buildReauthUrl } from "@/lib/reauth";
import { isSessionUsable } from "@/lib/session-guard";

/**
 * Convert a lapsed-session throw into a redirect to nf-id re-auth. Handles the
 * race where the token was valid at the middleware check but expired by the
 * time these server-side fetches ran. Rethrows anything that is not a session
 * expiry so real bugs still surface.
 */
async function reauthRedirect(): Promise<never> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "partner.namfam.co";
  const proto = h.get("x-forwarded-proto") ?? "https";
  redirect(buildReauthUrl(`${proto}://${host}`, "/dashboard"));
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: Session | null;
  let partner: Awaited<ReturnType<typeof getPartnerContext>>["partner"];
  let scopeCtx: Awaited<ReturnType<typeof getScopeContext>>;
  try {
    const [s, pc, sc] = await Promise.all([
      getServerSession(authOptions),
      getPartnerContext(),
      getScopeContext(),
    ]);
    session = s as Session | null;
    partner = pc.partner;
    scopeCtx = sc;
  } catch (err) {
    if (err instanceof SessionExpiredError) return reauthRedirect();
    throw err;
  }

  // Guard against a lingering local cookie whose access token is dead (or
  // whose central nf-id SSO session was killed elsewhere). Without this, the
  // 12h partner cookie renders a full dashboard against a stale token that
  // only 401s later. Bounce through nf-id SSO instead.
  if (!isSessionUsable(session)) return reauthRedirect();

  // Resource lists for the sidebar searchable flyouts, scoped to the active
  // partner/client. Failures degrade to empty lists (flyout shows "none in scope").
  let navData: NavData;
  try {
    navData = await buildNavData(scopeCtx);
  } catch (err) {
    if (err instanceof SessionExpiredError) return reauthRedirect();
    throw err;
  }

  const showPolitical = scopeHasPoliticalNiche(scopeCtx);

  return (
    <DashboardShell
      partner={partner}
      user={session?.user ?? undefined}
      scopeCtx={scopeCtx}
      navData={navData}
      showPolitical={showPolitical}
    >
      {children}
    </DashboardShell>
  );
}
