import type { Metadata } from "next";
import { getPartnerContext } from "@/lib/partner-context";
import { buildThemeCss, themeInitScript } from "@/lib/theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { partner } = await getPartnerContext();

  return {
    title: `${partner.displayName} Partner Portal`,
    description: partner.description,
    icons: {
      icon: "/nf-icon-composed.svg",
      shortcut: "/nf-icon-composed.svg",
      apple: "/nf-icon-composed.svg",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { partner } = await getPartnerContext();

  return (
    <html
      lang="en"
      // Resolved to the real value pre-paint by themeInitScript; this default
      // keeps SSR markup deterministic.
      data-theme={partner.defaultMode}
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        {/* Nameless Famous — Typekit: obviously-variable + space-mono */}
        <link rel="stylesheet" href="https://use.typekit.net/xhf6mln.css" />
        {/* Partner-scoped palettes bound to html[data-theme]. */}
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss(partner) }} />
        {/* Resolve stored/default theme before first paint to avoid FOUC. */}
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript(partner.defaultMode) }}
        />
      </head>
      <body className="flex h-full flex-col">{children}</body>
    </html>
  );
}
