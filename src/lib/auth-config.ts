import "server-only";

export function isAuthConfigured() {
  return Boolean(
    process.env.AUTH_NFID_CLIENT_ID && process.env.AUTH_NFID_CLIENT_SECRET,
  );
}
