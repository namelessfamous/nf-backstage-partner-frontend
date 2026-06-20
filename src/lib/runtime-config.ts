export const NF_ID_ISSUER = (
  process.env.AUTH_NFID_ISSUER ?? "https://id.namfam.co"
).replace(/\/$/, "");

export const NF_ID_CLIENT_ID = process.env.NF_ID_CLIENT_ID ?? "partner-portal";

export const DEFAULT_BACKSTAGE_API_URL =
  process.env.NEXT_PUBLIC_BACKSTAGE_API_URL ?? "https://a.namfam.co";
