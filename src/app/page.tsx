import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

  if (session) {
    redirect("/dashboard");
  }

  redirect("/auth/signin");
}
