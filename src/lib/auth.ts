import type { NextAuthOptions } from "next-auth";

const issuer = (process.env.AUTH_NFID_ISSUER ?? "https://id.namfam.co").replace(/\/$/, "");
const scope = process.env.AUTH_NFID_SCOPE ?? "openid profile email offline_access";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  providers: [
    {
      id: "nf-id",
      name: "Nameless Famous ID",
      type: "oauth",
      wellKnown: `${issuer}/.well-known/openid-configuration`,
      clientId: process.env.AUTH_NFID_CLIENT_ID ?? "",
      clientSecret: process.env.AUTH_NFID_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          scope,
        },
      },
      checks: ["pkce", "state"],
      idToken: true,
      profile(profile) {
        const candidate = profile as {
          sub?: string;
          name?: string;
          email?: string;
          picture?: string;
        };

        return {
          id: candidate.sub ?? candidate.email ?? "nf-id-user",
          name: candidate.name ?? candidate.email ?? "Partner user",
          email: candidate.email ?? null,
          image: candidate.picture ?? null,
        };
      },
    },
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
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

      if (typeof token.idToken === "string") {
        session.idToken = token.idToken;
      }

      return session;
    },
  },
};
