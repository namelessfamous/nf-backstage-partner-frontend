"use client";

/**
 * DashboardFooter — sits at the bottom of the main panel (below page content).
 *
 * Contains:
 *   - Nameless Famous composed icon + wordmark
 *   - Support button (mailto: partner support address)
 *   - Request button (mailto: prefilled "new request" subject)
 *   - Confidentiality disclaimer
 *
 * Purely presentational, brand-token driven, and print-hidden.
 */

import { LifeBuoy, Send } from "lucide-react";
import type { PartnerConfig } from "@/lib/partners";

export function DashboardFooter({ partner }: { partner: PartnerConfig }) {
  const supportEmail = partner.supportEmail;
  const isPartner = partner.key !== "default";
  const requestSubject = encodeURIComponent(
    `[${partner.displayName}] New request`,
  );
  const requestBody = encodeURIComponent(
    "Describe your request below and our team will follow up.\n\n—\nSubmitted via the partner portal.",
  );

  return (
    <footer
      data-no-print
      className="mt-auto border-t border-black/5 bg-[var(--brand-surface)] px-6 py-6 lg:px-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Brand mark + wordmark */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={isPartner && partner.branding?.icon ? partner.branding.icon : "/nf-icon-composed.svg"}
            alt={partner.displayName}
            width={28}
            height={28}
            className="h-7 w-7 shrink-0"
          />
          <div className="leading-tight">
            {isPartner ? (
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--brand-foreground)]">
                {partner.displayName}
                <span className="text-[var(--brand-muted)]">— powered by</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/namelessfamous-logo.svg"
                  alt="Nameless Famous"
                  className="h-4 w-auto opacity-80"
                />
              </p>
            ) : (
              <p className="text-sm font-semibold text-[var(--brand-foreground)]">
                {partner.displayName}
              </p>
            )}
            <p className="text-xs text-[var(--brand-muted)]">Partner Portal</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${supportEmail}?subject=${encodeURIComponent(
              `[${partner.displayName}] Support`,
            )}`}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-black/10 bg-[var(--brand-surface)] px-4 py-2 text-sm font-medium text-[var(--brand-foreground)] transition hover:border-[var(--brand-primary)]/40"
          >
            <LifeBuoy className="size-4" />
            Support
          </a>
          <a
            href={`mailto:${supportEmail}?subject=${requestSubject}&body=${requestBody}`}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ color: "var(--brand-on-primary)" }}
          >
            <Send className="size-4" style={{ color: "var(--brand-on-primary)" }} />
            Request
          </a>
        </div>
      </div>

      {/* Confidentiality disclaimer */}
      <p className="mt-5 border-t border-black/5 pt-4 text-xs leading-relaxed text-[var(--brand-muted)]">
        <span className="font-medium text-[var(--brand-foreground)]/80">
          Confidential.
        </span>{" "}
        The information in this portal — including proposals, deliverables,
        pricing, and client data — is confidential and intended solely for the
        authorized recipient. Do not copy, distribute, or disclose any part of
        it without written permission from {partner.displayName}.
        &copy; {new Date().getFullYear()} {partner.displayName}. All rights
        reserved.
      </p>
    </footer>
  );
}
