export const NF_ID_ISSUER = (
  process.env.AUTH_NFID_ISSUER ?? "https://id.namfam.co"
).replace(/\/$/, "");

export const NF_ID_SCOPE =
  process.env.AUTH_NFID_SCOPE ?? "openid profile email offline_access";

export const DEFAULT_BACKSTAGE_API_URL =
  process.env.NEXT_PUBLIC_BACKSTAGE_API_URL ?? "https://a.namfam.co";
