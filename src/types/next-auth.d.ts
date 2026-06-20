import type { DefaultSession } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    user?: DefaultSession["user"] & {
      id?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    accessToken?: string;
    idToken?: string;
  }
}
