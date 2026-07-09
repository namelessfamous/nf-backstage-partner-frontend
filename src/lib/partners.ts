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

export type PartnerConfig = {
  key: string;
  /** client_id passed to nf-id SSO. Defaults to NF_ID_CLIENT_ID env var ("partner-portal"). */
  clientId?: string;
  displayName: string;
  description: string;
  supportEmail: string;
  hosts: string[];
  apiBaseUrl?: string;
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
    hosts: ["gritcreative.namfam.co"],
    apiBaseUrl: DEFAULT_BACKSTAGE_API_URL,
    defaultMode: "light",
    theme: {
      light: {
        primary: "#ca8a04",
        secondary: "#422006",
        accent: "#fcd34d",
        surface: "#fffdf6",
        surfaceStrong: "#fef3c7",
        foreground: "#292524",
        muted: "#57534e",
        onPrimary: "#292524", // dark text on the gold primary
        navIcon: "#292524", // dark nav icons on the gold gradient
        background: "#fffbeb",
        sidebarFrom: "#fcd34d", // gold
        sidebarTo: "#fffdf6", // near-white
      },
      dark: {
        primary: "#eab308", // brighter gold for dark bg
        secondary: "#3a2408",
        accent: "#fcd34d",
        surface: "#1c1710", // warm noir
        surfaceStrong: "#2a2013",
        foreground: "#f7f0df",
        muted: "#b8a97f",
        onPrimary: "#292524", // dark text on gold
        navIcon: "#292524", // dark nav icons so black nav text pairs cleanly
        background: "#14100a",
        sidebarFrom: "#fcd34d", // gold
        sidebarTo: "#fef3c7", // pale gold
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
