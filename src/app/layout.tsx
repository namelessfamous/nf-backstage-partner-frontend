import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { CSSProperties } from "react";
import { getPartnerContext } from "@/lib/partner-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
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
