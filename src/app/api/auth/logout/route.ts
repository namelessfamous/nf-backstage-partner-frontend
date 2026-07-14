import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { SCOPE_COOKIE } from "@/lib/scope";

const NO_CACHE = { "Cache-Control": "no-store" };

const NF_ID_LOGOUT_URL = "https://id.namfam.co/logout";
const BACKSTAGE_LOGOUT_URL = "https://a.namfam.co/api/v1/auth/logout/";

/**
 * Revoke the backstage access token embedded in the NextAuth session so the
 * stateless JWT is dead server-side, not just dropped from the cookie. Without
 * this, a copy of the token that survives (another tab, an in-flight request)
 * stays valid until expiry even after the user "logs out". Best-effort.
 */
async function revokeBackstageAccess(access?: string) {
  if (!access) return;
  try {
    await fetch(BACKSTAGE_LOGOUT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access}`,
      },
      body: "{}",
      signal: AbortSignal.timeout(3000),
      cache: "no-store",
    });
  } catch {
    /* best-effort — cookies still cleared below */
  }
}

/**
 * GET /api/auth/logout — single, race-free sign-out for the partner frontend.
 *
 * The previous client-side flow (`signOut({ redirect: false })` immediately
 * followed by `window.location.href = id/logout`) was fragile: the browser
 * often navigated away before NextAuth's Set-Cookie (which clears the local
 * session cookie) was committed, so the partner session survived and the user
 * silently re-authenticated on the next SSO round-trip.
 *
 * This route clears every cookie the partner app owns server-side (guaranteed
 * Set-Cookie), then 302s to the central nf-id /logout endpoint with a
 * `return` back to *this* host so the user lands on the partner app in a
 * fully logged-out state instead of dead-ending on id.namfam.co/login.
 */
export async function GET(req: NextRequest) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : req.nextUrl.origin;

  // After the central SSO session is killed, send the user back to this app's
  // signed-out screen (NOT `/`, which auto-bounces into SSO and can silently
  // re-authenticate the user). The `logged_out` flag tells /auth/signin to
  // render a manual "Sign in" prompt instead of redirecting straight back into
  // the nf-id SSO round-trip.
  // Revoke the backstage access token server-side before tearing down cookies.
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    const access =
      token && typeof token.accessToken === "string"
        ? token.accessToken
        : undefined;
    await revokeBackstageAccess(access);
  } catch {
    /* best-effort revoke */
  }

  const idLogout = new URL(NF_ID_LOGOUT_URL);
  idLogout.searchParams.set("return", `${origin}/auth/signin?logged_out=1`);

  const res = NextResponse.redirect(idLogout, { status: 302, headers: NO_CACHE });

  // NextAuth v4 cookie names — clear both the Secure (https/prod) and the
  // plain (http/dev) variants so this works in every environment.
  const cookieNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    SCOPE_COOKIE,
  ];

  for (const name of cookieNames) {
    res.cookies.set(name, "", { path: "/", expires: new Date(0), maxAge: 0 });
  }

  return res;
}

// Allow POST as well for form / fetch based sign-out.
export const POST = GET;
