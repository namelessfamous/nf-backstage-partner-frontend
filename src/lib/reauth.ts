/**
 * Central re-authentication URL builder.
 *
 * When the embedded backstage access token has expired, we bounce the user
 * back through nf-id's SSO endpoint. nf-id will:
 *   - silently re-mint tokens if its own session is still alive, or
 *   - show its /timeout passkey prompt / /login page if not,
 * then hand a fresh id_token + access back to our /api/auth/sso-callback,
 * which recreates the NextAuth session and lands the user on `returnPath`.
 *
 * This reuses the exact contract the initial sign-in already uses, so there is
 * no second token-handshake to maintain.
 */

import { NF_ID_ISSUER, NF_ID_CLIENT_ID } from "@/lib/runtime-config";

/**
 * Build the absolute URL that kicks off silent re-auth.
 *
 * @param origin      Absolute origin of *this* app, e.g. https://partner.namfam.co
 * @param returnPath  Path (+search+hash) to return to after re-auth, e.g. /dashboard
 */
export function buildReauthUrl(origin: string, returnPath: string): string {
  const cleanOrigin = origin.replace(/\/$/, "");
  // Where nf-id should send the user back to once it has fresh tokens.
  const callback = new URL("/api/auth/sso-callback", cleanOrigin);
  // Preserve where the user was headed so sso-callback can carry it through.
  callback.searchParams.set("return", returnPath || "/dashboard");

  const sso = new URL("/api/sso", NF_ID_ISSUER);
  sso.searchParams.set("to", callback.toString());
  sso.searchParams.set("client_id", NF_ID_CLIENT_ID);
  return sso.toString();
}
