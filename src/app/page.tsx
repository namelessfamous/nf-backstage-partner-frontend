import { getServerSession } from "next-auth";
import { AuthControls } from "@/components/auth-controls";
import { isAuthConfigured } from "@/lib/auth-config";
import { authOptions } from "@/lib/auth";
import { getPartnerContext } from "@/lib/partner-context";
import { DEFAULT_BACKSTAGE_API_URL, NF_ID_ISSUER } from "@/lib/runtime-config";

export default async function Home() {
  const [session, { hostname, partner }] = await Promise.all([
    getServerSession(authOptions),
    getPartnerContext(),
  ]);

  const authConfigured = isAuthConfigured();
  const apiBaseUrl = partner.apiBaseUrl ?? DEFAULT_BACKSTAGE_API_URL;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--brand-primary)]">
                {partner.displayName}
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--brand-foreground)] sm:text-5xl">
                Partner access to backstage data, tailored by hostname.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-[var(--brand-muted)]">
                This starter portal authenticates against nf-id, targets nf-backstage, and
                applies partner branding from the incoming domain.
              </p>
            </div>
            {authConfigured ? (
              <AuthControls isAuthenticated={Boolean(session)} />
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--brand-primary)]/40 bg-[var(--brand-surface-strong)] px-5 py-4 text-sm text-[var(--brand-muted)]">
                Add nf-id client credentials to enable sign-in for {partner.displayName}.
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-3xl bg-[var(--brand-surface-strong)] p-5">
              <p className="text-sm font-medium text-[var(--brand-muted)]">Authentication</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--brand-foreground)]">
                {authConfigured ? "Configured" : "Needs credentials"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
                OIDC issuer defaults to <span className="font-medium">{NF_ID_ISSUER}</span>.
              </p>
            </article>
            <article className="rounded-3xl bg-[var(--brand-surface-strong)] p-5">
              <p className="text-sm font-medium text-[var(--brand-muted)]">Backstage API</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--brand-foreground)]">
                {apiBaseUrl.replace(/^https?:\/\//, "")}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
                Ready for server actions, route handlers, and authenticated data fetching.
              </p>
            </article>
            <article className="rounded-3xl bg-[var(--brand-surface-strong)] p-5">
              <p className="text-sm font-medium text-[var(--brand-muted)]">Resolved host</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--brand-foreground)]">
                {hostname}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">
                Hostnames map to partner themes in a single config module.
              </p>
            </article>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[2rem] bg-[linear-gradient(135deg,var(--brand-primary),var(--brand-secondary))] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
              White label
            </p>
            <h2 className="mt-4 text-3xl font-semibold">{partner.displayName}</h2>
            <p className="mt-4 text-base leading-7 text-white/85">{partner.description}</p>
            <div className="mt-8 rounded-3xl bg-white/12 p-5 backdrop-blur-sm">
              <p className="text-sm text-white/70">Support contact</p>
              <p className="mt-2 text-lg font-medium">{partner.supportEmail}</p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/5 bg-[var(--brand-surface)] p-8">
            <h2 className="text-xl font-semibold text-[var(--brand-foreground)]">
              Session snapshot
            </h2>
            {session ? (
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-[var(--brand-muted)]">User</dt>
                  <dd className="mt-1 text-base text-[var(--brand-foreground)]">
                    {session.user?.name ?? session.user?.email ?? "Authenticated user"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--brand-muted)]">Email</dt>
                  <dd className="mt-1 text-base text-[var(--brand-foreground)]">
                    {session.user?.email ?? "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-[var(--brand-muted)]">Access token</dt>
                  <dd className="mt-1 break-all text-xs text-[var(--brand-foreground)]">
                    {session.accessToken ? "Available for API requests" : "Not available"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-6 text-base leading-7 text-[var(--brand-muted)]">
                Sign in to verify the nf-id integration and begin wiring partner-specific data
                views against nf-backstage.
              </p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
