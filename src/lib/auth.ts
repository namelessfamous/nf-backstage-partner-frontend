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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
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
        if (user.image) token.picture = user.image;
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
      return session;
    },
  },
};
