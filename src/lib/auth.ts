import "server-only";
import type { NextAuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { jwtVerify } from "jose";
import { NF_ID_ISSUER } from "@/lib/runtime-config";

interface NfUser extends User {
  _accessToken: string;
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
          if (!email) return null;
          return {
            id: email,
            email,
            name: name ?? email,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
};
