import "server-only";
import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtVerify } from "jose";
import { NF_ID_ISSUER } from "@/lib/runtime-config";

interface NfUser extends User {
  _accessToken: string;
}

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function getJwtSecret(): Uint8Array {
  const s = process.env.NF_ID_SECRET;
  if (!s) throw new Error("NF_ID_SECRET is not configured");
  return new TextEncoder().encode(s);
}

/**
 * Decode a JWT's `exp` claim (Unix seconds) without verifying the signature.
 * The backstage access token is issued by the API; we only need its expiry to
 * know when to force a silent re-auth. Returns 0 when unreadable (treated as
 * already-expired by callers).
 */
function decodeJwtExp(token: string): number {
  try {
    const part = token.split(".")[1];
    const json = JSON.parse(
      Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8",
      ),
    );
    return typeof json.exp === "number" ? json.exp : 0;
  } catch {
    return 0;
  }
}

const BACKSTAGE_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://a.namfam.co";

// How often (ms) to re-validate the access token against the server-side
// denylist. Logout on ANY nf-id portal denylists the token immediately; this
// is how the partner session learns about it BEFORE the token's own exp.
// 0 = check on EVERY session read so "log out everywhere" is INSTANT (Keys,
// 2026-07-15). Costs one lightweight /auth/me/ call per navigation; fail-open
// on network error keeps a blip from mass-logging-out.
const DENYLIST_CHECK_INTERVAL_MS = 0;

/**
 * Returns true when the access token has been revoked server-side (logged out
 * elsewhere). Fails OPEN (returns false) on network/timeout so a transient API
 * blip can't mass-log-out every partner. A 401 with code "token_revoked" (or
 * any 401) means the shared denylist rejected the token.
 */
async function isAccessTokenRevoked(access: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKSTAGE_API_URL}/api/v1/auth/me/`, {
      headers: { Authorization: `Bearer ${access}` },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return res.status === 401;
  } catch {
    return false; // fail open
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  // Clamp the NextAuth session cookie lifetime so a stale session can't
  // outlive the backstage access token it wraps. Default NextAuth maxAge is
  // 30 days — far longer than the API token — which let a "logged-out" or
  // lingering cookie keep resurrecting a session. 12h is a safe upper bound;
  // the API token expiry + reauth flow enforce the real, shorter window.
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  jwt: { maxAge: 60 * 60 * 12 },
  pages: { signIn: "/auth/signin" },
  providers: [
    CredentialsProvider({
      id: "nf-id",
      name: "nf-id SSO",
      credentials: {
        id_token: { label: "ID Token", type: "text" },
        access: { label: "Access Token", type: "text" },
      },
      async authorize(credentials): Promise<NfUser | null> {
        if (!credentials?.id_token || !credentials?.access) return null;
        try {
          const { payload } = await jwtVerify(credentials.id_token, getJwtSecret(), {
            issuer: NF_ID_ISSUER,
          });
          const email = typeof payload.email === "string" ? payload.email : null;
          const name = typeof payload.name === "string" ? payload.name : undefined;
          // nf-id may expose the avatar under a few standard claim names.
          const image = firstString(payload.picture, payload.avatar, payload.image);
          if (!email) return null;
          return {
            id: email,
            email,
            name: name ?? email,
            image: image ?? null,
            _accessToken: credentials.access,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, copy the backstage access token into the JWT and
      // record its expiry so the session can report when it has lapsed.
      if (user && "_accessToken" in user) {
        const access = (user as NfUser)._accessToken;
        token.accessToken = access;
        token.accessTokenExp = decodeJwtExp(access);
        token.denylistCheckedAt = Date.now();
        if (user.image) token.picture = user.image;
        return token;
      }

      // On subsequent reads: periodically check the shared server-side
      // denylist so a logout from ANY nf-id portal kills THIS session too,
      // even before the access token's own exp. Throttled to once per
      // DENYLIST_CHECK_INTERVAL_MS to avoid an API call on every render.
      const access =
        typeof token.accessToken === "string" ? token.accessToken : undefined;
      if (access) {
        const lastChecked =
          typeof token.denylistCheckedAt === "number"
            ? token.denylistCheckedAt
            : 0;
        if (Date.now() - lastChecked > DENYLIST_CHECK_INTERVAL_MS) {
          if (await isAccessTokenRevoked(access)) {
            // Token revoked (logged out elsewhere). Drop the session-bearing
            // claims so `session()` yields no accessToken and downstream
            // guards treat the user as signed out.
            delete token.accessToken;
            delete token.accessTokenExp;
            token.revoked = true;
            return token;
          }
          token.denylistCheckedAt = Date.now();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && typeof token.picture === "string") {
        session.user.image = token.picture;
      }
      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }
      if (typeof token.accessTokenExp === "number") {
        session.accessTokenExp = token.accessTokenExp;
        // 30s skew so we re-auth just *before* the API starts 401ing.
        session.accessTokenExpired =
          token.accessTokenExp > 0 &&
          token.accessTokenExp * 1000 < Date.now() + 30_000;
      }
      // Revoked server-side (logged out on another portal) → mark the session
      // expired so route guards force a re-auth / sign-out.
      if (token.revoked) {
        session.accessTokenExpired = true;
      }
      return session;
    },
  },
};
