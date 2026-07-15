import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Backstage API access token from nf-id SSO */
    accessToken?: string;
    /** Unix seconds — expiry of the embedded backstage access token. */
    accessTokenExp?: number;
    /** True when the embedded backstage access token has expired. */
    accessTokenExpired?: boolean;
    user?: DefaultSession["user"] & {
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    /** Unix seconds — expiry of the embedded backstage access token. */
    accessTokenExp?: number;
    /** Epoch ms of the last server-side denylist (revocation) check. */
    denylistCheckedAt?: number;
    /** True once the access token was found revoked (logged out elsewhere). */
    revoked?: boolean;
  }
}
