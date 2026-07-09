import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { buildReauthUrl } from "@/lib/reauth";

/**
 * Auth-expiry guard for the partner portal (Next 16 proxy / middleware).
 *
 * The previous `withAuth` guard only checked that a NextAuth session token
 * EXISTS. But the NextAuth session cookie outlives the backstage access token
 * embedded inside it. With only an existence check, an expired backstage token
 * still presents as "logged in": the dashboard renders, every backstage API
 * call 401s, and the page paints all-zero data (plus a client-side crash).
 *
 * This guard additionally inspects the embedded token's expiry (`accessTokenExp`,
 * set in the NextAuth jwt callback) and, when it has lapsed (or there is no
 * session at all), bounces the user through nf-id for a silent re-auth —
 * matching the nf-backstage-gui "session timed out" behaviour.
 *
 * Scope: /dashboard/:path* only. The marketing root, /auth/*, /api/auth/*,
 * and static assets are intentionally excluded so the re-auth handshake never
 * gets trapped in a redirect loop.
 */

// 30s skew so we re-auth just before the API begins rejecting the token.
const EXPIRY_SKEW_MS = 30_000;

function currentOrigin(req: NextRequest): string {
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    req.nextUrl.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    req.nextUrl.protocol.replace(/:$/, "") ??
    "https";
  return `${proto}://${host}`;
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const exp =
    typeof token?.accessTokenExp === "number" ? token.accessTokenExp : 0;
  const expired =
    !token || exp === 0 || exp * 1000 < Date.now() + EXPIRY_SKEW_MS;

  if (!expired) return NextResponse.next();

  // Expired (or missing) session on a guarded route → silent re-auth via nf-id.
  const origin = currentOrigin(req);
  const returnPath = `${pathname}${search}`;
  const reauthUrl = buildReauthUrl(origin, returnPath);

  return NextResponse.redirect(reauthUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
