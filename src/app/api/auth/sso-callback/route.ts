import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { NF_ID_ISSUER } from "@/lib/runtime-config";

const NO_CACHE = { "Cache-Control": "no-store" };

function getJwtSecret(): Uint8Array {
  const s = process.env.NF_ID_SECRET;
  if (!s) throw new Error("NF_ID_SECRET is not configured");
  return new TextEncoder().encode(s);
}

/**
 * GET /api/auth/sso-callback
 *
 * Receives the redirect back from nf-id SSO with:
 *   ?id_token=<HS256 JWT>&access=<backstage token>
 *
 * Verifies the JWT, then forwards to /auth/signin where the
 * next-auth CredentialsProvider creates the session.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const idToken = searchParams.get("id_token");
  const access = searchParams.get("access");

  if (!idToken || !access) {
    return NextResponse.redirect(new URL("/?error=missing_token", origin), {
      headers: NO_CACHE,
    });
  }

  try {
    await jwtVerify(idToken, getJwtSecret(), { issuer: NF_ID_ISSUER });
  } catch {
    return NextResponse.redirect(new URL("/?error=invalid_token", origin), {
      headers: NO_CACHE,
    });
  }

  // Forward to sign-in page which will create the session client-side
  const signInUrl = new URL("/auth/signin", origin);
  signInUrl.searchParams.set("id_token", idToken);
  signInUrl.searchParams.set("access", access);
  if (searchParams.get("popup") === "1") {
    signInUrl.searchParams.set("popup", "1");
  }
  return NextResponse.redirect(signInUrl, { headers: NO_CACHE });
}
