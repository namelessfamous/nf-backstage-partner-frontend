import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { DM_Sans, DM_Serif_Display, DM_Mono } from "next/font/google";
import { getPartnerContext } from "@/lib/partner-context";
import "./globals.css";

// Nameless Famous — brutNOIR typography
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-dm-serif",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
  display: "swap",
});

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
    <html
      lang="en"
      className={`h-full antialiased ${dmSans.variable} ${dmSerifDisplay.variable} ${dmMono.variable}`}
    >
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
            "--brand-on-primary": partner.theme.onPrimary,
          } as CSSProperties
        }
      >
        {children}
      </body>
    </html>
  );
}
