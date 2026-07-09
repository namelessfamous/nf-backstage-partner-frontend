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
      // On first sign-in, copy the backstage access token into the JWT
      if (user && "_accessToken" in user) {
        token.accessToken = (user as NfUser)._accessToken;
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
      return session;
    },
  },
};
