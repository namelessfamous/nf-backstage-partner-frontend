"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScopeSwitchOverlay } from "@/components/dashboard/scope-switch-overlay";

type PoliticalClientOption = {
  slug: string;
  name: string;
  partnerName?: string | null;
};

/**
 * Shown on /dashboard/political when the ACTIVE scope has no political client
 * but the user can reach one or more political clients through another scope
 * (Task 5). Instead of silently bouncing to the dashboard, we prompt the user
 * to switch into a political client scope. Selecting one sets the scope cookie
 * and refreshes, at which point the political gate passes and the dashboard
 * renders for that client.
 */
export function PoliticalScopePrompt({
  clients,
}: {
  clients: PoliticalClientOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingName, setPendingName] = useState<string | null>(null);

  async function selectClient(opt: PoliticalClientOption) {
    setPendingName(opt.name);
    await fetch("/api/scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: `client:${opt.slug}` }),
    });
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {isPending && pendingName && <ScopeSwitchOverlay scopeName={pendingName} />}

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-foreground)] sm:text-4xl">
          Political
        </h1>
        <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-[var(--brand-muted)]">
          Select a campaign to view
        </p>
      </div>

      <div className="rounded-3xl bg-[var(--brand-surface-strong)]/40 p-6">
        <p className="mb-4 text-sm text-[var(--brand-muted)]">
          The political dashboard is scoped to a single political or
          public-affairs client. Choose one to load voter-file analytics and
          list-building tools.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((c) => (
            <button
              key={c.slug}
              onClick={() => selectClient(c)}
              disabled={isPending}
              className={`group flex flex-col items-start gap-1 rounded-2xl border border-black/5 bg-[var(--brand-surface)] p-4 text-left transition hover:border-[var(--brand-primary)]/40 hover:shadow-sm ${
                isPending ? "cursor-wait opacity-60" : "cursor-pointer"
              }`}
            >
              <span className="text-base font-semibold text-[var(--brand-foreground)] group-hover:text-[var(--brand-primary)]">
                {c.name}
              </span>
              {c.partnerName && (
                <span className="text-[11px] uppercase tracking-wide text-[var(--brand-muted)]">
                  {c.partnerName}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
