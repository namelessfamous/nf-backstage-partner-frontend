import "server-only";

export function isAuthConfigured() {
  return Boolean(process.env.NF_ID_SECRET && process.env.NEXTAUTH_SECRET);
}
