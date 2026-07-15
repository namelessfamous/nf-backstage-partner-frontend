import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isSessionUsable } from "@/lib/session-guard";
import { buildReauthUrl } from "@/lib/reauth";

/**
 * Root route.
 *
 * There is no standalone marketing/landing surface for the partner portal —
 * the `/` route is purely a router:
 *   - Authenticated  → `/dashboard`
 *   - Unauthenticated → `/auth/signin`, which in turn kicks off the nf-id SSO
 *     redirect flow. The post-SSO callback lands on `/auth/signin` with tokens
 *     and the AutoSignIn "Completing sign-in…" spinner finishes the handoff to
 *     `/dashboard`.
 *
 * Kept as a server component with a hard `redirect()` so there is never a
 * flash of intermediate content.
 */
export default async function Home() {
  const session = await getServerSession(authOptions);

  if (isSessionUsable(session)) {
    redirect("/dashboard");
  }

  // A present-but-stale local cookie (expired access token / killed SSO
  // session) must NOT sail into /dashboard. Re-enter nf-id SSO: it re-mints
  // silently if nf-id is still logged in, or lands on login/passkey if not.
  if (session) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "partner.namfam.co";
    const proto = h.get("x-forwarded-proto") ?? "https";
    redirect(buildReauthUrl(`${proto}://${host}`, "/dashboard"));
  }

  redirect("/auth/signin");
}
