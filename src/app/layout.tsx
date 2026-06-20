import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { getPartnerContext } from "@/lib/partner-context";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { partner } = await getPartnerContext();

  return {
    title: `${partner.displayName} Partner Portal`,
    description: partner.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { partner } = await getPartnerContext();

  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="flex h-full flex-col"
        style={
          {
            "--brand-primary": partner.theme.primary,
            "--brand-secondary": partner.theme.secondary,
            "--brand-accent": partner.theme.accent,
            "--brand-surface": partner.theme.surface,
            "--brand-surface-strong": partner.theme.surfaceStrong,
            "--brand-foreground": partner.theme.foreground,
            "--brand-muted": partner.theme.muted,
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
