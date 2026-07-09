import type { Metadata } from "next";
import { getPartnerContext } from "@/lib/partner-context";
import { buildThemeCss, themeInitScript } from "@/lib/theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { partner } = await getPartnerContext();
  const icon = partner.branding?.icon ?? "/nf-icon-composed.svg";
  const apple = partner.branding?.appleIcon ?? icon;

  return {
    title: `${partner.displayName} Partner Portal`,
    description: partner.description,
    icons: {
      icon,
      shortcut: icon,
      apple,
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
        {/* Typekit: partner-scoped kit when set, else NF (obviously-variable + space-mono). */}
        <link
          rel="stylesheet"
          href={
            partner.branding?.fontCssUrl ?? "https://use.typekit.net/xhf6mln.css"
          }
        />
        {/* Partner-scoped palettes bound to html[data-theme]. */}
        <style dangerouslySetInnerHTML={{ __html: buildThemeCss(partner) }} />
        {/* Partner-scoped font-family overrides (over globals.css defaults). */}
        {partner.branding &&
          (partner.branding.fontSans || partner.branding.fontSerif) && (
            <style
              dangerouslySetInnerHTML={{
                __html: `:root{${
                  partner.branding.fontSans
                    ? `--font-sans:${partner.branding.fontSans};`
                    : ""
                }${
                  partner.branding.fontSerif
                    ? `--font-serif:${partner.branding.fontSerif};`
                    : ""
                }${
                  partner.branding.fontMono
                    ? `--font-mono:${partner.branding.fontMono};`
                    : ""
                }}`,
              }}
            />
          )}
        {/* Resolve stored/default theme before first paint to avoid FOUC. */}
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript(partner.defaultMode) }}
        />
      </head>
      <body className="flex h-full flex-col">{children}</body>
    </html>
  );
}
