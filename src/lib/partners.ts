import { DEFAULT_BACKSTAGE_API_URL, NF_ID_CLIENT_ID } from "@/lib/runtime-config";

export type ThemePalette = {
  primary: string;
  secondary: string;
  accent: string;
  surface: string;
  surfaceStrong: string;
  foreground: string;
  muted: string;
  /** Foreground color used on top of `primary`/`accent` fills. Must contrast the acid lime — always dark. */
  onPrimary: string;
  /** Accent color for sidebar nav icons — distinct from the black nav text. */
  navIcon: string;
  /** App-wide page background (behind surfaces). */
  background: string;
  /**
   * Sidebar gradient stops. Signature acid-lime (top) fading to the mode's
   * base (black in dark, white in light).
   */
  sidebarFrom: string;
  sidebarTo: string;
  /**
   * Foreground for sidebar nav/footer text. Must contrast the *bottom* of the
   * gradient (where most nav links + the footer sit): light in dark mode
   * (black bottom), dark in light mode (white bottom).
   */
  sidebarText?: string;
};

/**
 * Partner-scoped typography + brand marks. When present these override the
 * portal's default NF Typekit fonts and NF logo/icon.
 */
export type PartnerBranding = {
  /** Web-font stylesheet URL (Adobe Typekit or Google Fonts <link href>). */
  fontCssUrl?: string;
  /** CSS font-family stack for sans/body text. */
  fontSans?: string;
  /** CSS font-family stack for serif/display headings. */
  fontSerif?: string;
  /** CSS font-family stack for monospace. Falls back to portal default. */
  fontMono?: string;
  /** Wide wordmark/logo used in the expanded sidebar header. Public path. */
  logo?: string;
  /** Square mark used collapsed + as favicon. Public path. */
  icon?: string;
  /** Apple touch icon. Public path. */
  appleIcon?: string;
};

export type PartnerConfig = {
  key: string;
  /** client_id passed to nf-id SSO. Defaults to NF_ID_CLIENT_ID env var ("partner-portal"). */
  clientId?: string;
  displayName: string;
  description: string;
  supportEmail: string;
  hosts: string[];
  apiBaseUrl?: string;
  /** Optional per-partner fonts + logo/icon. Omit to inherit NF defaults. */
  branding?: PartnerBranding;
  /**
   * Which palette the portal defaults to before the visitor has chosen one.
   * Overridable at runtime via the header light/dark switcher.
   */
  defaultMode: "light" | "dark";
  /** Dark + light palettes. The active one is chosen by the theme switcher. */
  theme: {
    dark: ThemePalette;
    light: ThemePalette;
  };
};

export const defaultPartnerConfig: PartnerConfig = {
  key: "default",
  clientId: NF_ID_CLIENT_ID,
  displayName: "Nameless Famous",
  description:
    "Default partner experience for backstage operators and partner onboarding.",
  supportEmail: "support@namfam.co",
  hosts: ["localhost", "127.0.0.1", "partner.namfam.co"],
  apiBaseUrl: DEFAULT_BACKSTAGE_API_URL,
  defaultMode: "dark",
  theme: {
    // Nameless Famous — namelessfamous.com brand (dark mode)
    dark: {
      primary: "#DDDBDE", // light charcoal — reads on dark background
      secondary: "#22222a", // dark surface
      accent: "#019458", // NF green — dark mode accent
      surface: "#1a1a1f", // dark charcoal — card backgrounds
      surfaceStrong: "#22222a", // elevated surface
      foreground: "#DDDBDE", // primary text on dark
      muted: "#8a8587", // muted text
      onPrimary: "#111111", // dark text on light primary
      navIcon: "#0a0a0b", // noir nav icon on lime
      background: "#050505", // noir atmospheric background
      sidebarFrom: "#c8f53c", // acid lime signature (top)
      sidebarTo: "#aadd1f", // deeper acid lime (bottom) — sidebar stays lime
      sidebarText: "#0a0a0b", // noir ink on lime
    },
    // Nameless Famous — namelessfamous.com brand (light mode)
    light: {
      primary: "#3B373B", // dark charcoal — CTAs, active states
      secondary: "#e7e2d6", // warm paper edge
      accent: "#f54a00", // NF orange — light mode accent
      surface: "#ffffff", // card backgrounds
      surfaceStrong: "#ece7dd", // callout/elevated on cream
      foreground: "#111111", // near-black ink
      muted: "#6b675c", // muted ink
      onPrimary: "#DDDBDE", // light text on dark charcoal primary
      navIcon: "#0a0a0b", // noir nav icon on lime
      background: "#f5f0e8", // cream paper
      sidebarFrom: "#c8f53c", // acid lime signature (top)
      sidebarTo: "#aadd1f", // deeper acid lime (bottom) — sidebar stays lime
      sidebarText: "#0a0a0b", // noir ink on lime
    },
  },
};

export const partnerConfigs: PartnerConfig[] = [
  defaultPartnerConfig,
  {
    key: "gritcreative",
    clientId: NF_ID_CLIENT_ID,
    displayName: "Grit Creative",
    description:
      "White-labeled view for Grit Creative teams managing backstage partner data.",
    supportEmail: "hello@gritcreative.co",
    // Primary custom-domain host + namfam.co subdomain fallback.
    hosts: ["win.gritcreative.co", "gritcreative.namfam.co"],
    apiBaseUrl: DEFAULT_BACKSTAGE_API_URL,
    defaultMode: "light",
    branding: {
      // Adobe Typekit kit bgl5djd from gritcreative.co
      fontCssUrl: "https://use.typekit.net/bgl5djd.css",
      fontSans: '"proxima-nova", sans-serif',
      fontSerif: '"baskerville-urw", serif',
      // Grit has no mono kit — body/mono slots use proxima-nova, not monospace.
      fontMono: '"proxima-nova", sans-serif',
      logo: "/brands/grit-creative/grit-logo.svg",
      icon: "/brands/grit-creative/grit-logo.svg",
      appleIcon: "/brands/grit-creative/apple-touch-icon.png",
    },
    // Real Grit Creative brand (gritcreative.co): red #aa3423 + cream #ede5ce,
    // Typekit baskerville-urw (serif) + proxima-nova (sans), grit shield logo.
    theme: {
      light: {
        primary: "#aa3423", // Grit red
        secondary: "#3f3d3a", // warm charcoal
        accent: "#80271a", // deep red accent
        surface: "#ffffff", // card backgrounds
        surfaceStrong: "#ede5ce", // cream elevated / callout
        foreground: "#181819", // near-black ink
        muted: "#65635b", // muted gray-brown
        onPrimary: "#ede5ce", // cream text on red primary
        navIcon: "#ede5ce", // cream nav icons on red gradient
        background: "#ede5ce", // signature cream paper
        sidebarFrom: "#aa3423", // Grit red (top)
        sidebarTo: "#80271a", // deep red (bottom)
        sidebarText: "#ede5ce", // cream on red
      },
      dark: {
        primary: "#e9a196", // lightened red — reads on dark
        secondary: "#2b2b29", // dark surface
        accent: "#aa3423", // Grit red accent
        surface: "#1a1917", // warm noir card
        surfaceStrong: "#2b2b29", // elevated surface
        foreground: "#ede5ce", // cream text on dark
        muted: "#b3ad9d", // muted warm gray
        onPrimary: "#181819", // ink on light red primary
        navIcon: "#ede5ce", // cream nav icons on red gradient
        background: "#141312", // warm noir background
        sidebarFrom: "#aa3423", // Grit red (top)
        sidebarTo: "#64271e", // deep red (bottom)
        sidebarText: "#ede5ce", // cream on red
      },
    },
  },
];

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/:\d+$/, "");
}

export function resolvePartnerByHostname(hostname: string) {
  const normalized = normalizeHostname(hostname);
  const exactMatch = partnerConfigs.find((partner) =>
    partner.hosts.some((host) => normalizeHostname(host) === normalized),
  );

  if (exactMatch) {
    return exactMatch;
  }

  if (normalized.endsWith(".namfam.co")) {
    const subdomains = normalized.split(".").slice(0, -2);
    const partnerKeyMatch = subdomains
      .map((subdomain) => partnerConfigs.find((partner) => partner.key === subdomain))
      .find(Boolean);

    if (partnerKeyMatch) {
      return partnerKeyMatch;
    }
  }

  return defaultPartnerConfig;
}
