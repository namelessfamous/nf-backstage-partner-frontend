import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getPartnerContext } from "@/lib/partner-context";
import { NF_ID_ISSUER, NF_ID_CLIENT_ID } from "@/lib/runtime-config";
import AutoSignIn from "./auto-sign-in";

type SearchParams = {
  id_token?: string;
  access?: string;
  error?: string;
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [params, { partner }] = await Promise.all([
    searchParams,
    getPartnerContext(),
  ]);

  // If we received tokens back from nf-id, hand off to the client component
  // to create the next-auth session
  if (params.id_token && params.access) {
    return <AutoSignIn idToken={params.id_token} access={params.access} />;
  }

  // Show error state if SSO failed
  if (params.error) {
    const ssoUrl = await buildSsoUrl(partner.clientId ?? NF_ID_CLIENT_ID);
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <div className="max-w-md rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">
            Authentication error
          </h2>
          <p className="mt-3 text-sm text-[var(--brand-muted)]">
            {params.error === "invalid_token"
              ? "The sign-in link has expired or is invalid."
              : "Something went wrong during sign-in."}
          </p>
          <a
            href={ssoUrl}
            className="mt-6 inline-block rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-[var(--brand-on-primary)] transition hover:opacity-90"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  // Default: redirect to nf-id SSO
  const ssoUrl = await buildSsoUrl(partner.clientId ?? NF_ID_CLIENT_ID);
  redirect(ssoUrl);
}

/**
 * Build the nf-id SSO URL. The return URL is derived from the actual request
 * host (this is a hostname-driven white-label app), falling back to
 * NEXTAUTH_URL. The origin must be registered in nf-id's client allowlist.
 */
async function buildSsoUrl(clientId: string): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const appUrl = host
    ? `${proto}://${host}`
    : (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const callbackUrl = `${appUrl}/api/auth/sso-callback`;
  return `${NF_ID_ISSUER}/api/sso?to=${encodeURIComponent(callbackUrl)}&client_id=${encodeURIComponent(clientId)}`;
}
