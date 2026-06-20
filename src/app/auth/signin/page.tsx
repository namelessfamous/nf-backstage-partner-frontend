import { redirect } from "next/navigation";
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
    const ssoUrl = buildSsoUrl(partner.clientId ?? NF_ID_CLIENT_ID);
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
            className="mt-6 inline-block rounded-full bg-[var(--brand-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  // Default: redirect to nf-id SSO
  const ssoUrl = buildSsoUrl(partner.clientId ?? NF_ID_CLIENT_ID);
  redirect(ssoUrl);
}

function buildSsoUrl(clientId: string): string {
  const appUrl = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const callbackUrl = `${appUrl}/api/auth/sso-callback`;
  return `${NF_ID_ISSUER}/api/sso?to=${encodeURIComponent(callbackUrl)}&client_id=${encodeURIComponent(clientId)}`;
}
