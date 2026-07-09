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
   * Sidebar gradient stops. Kept intentionally LIGHT in every mode so the
   * dark (`text-black`) nav links stay legible top-to-bottom on both light
   * and dark themes.
   */
  sidebarFrom: string;
  sidebarTo: string;
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
    // Nameless Famous — brutNOIR brand system (dark)
    dark: {
      primary: "#c8f53c", // acid — CTAs, active states
      secondary: "#22222a", // noirSurface
      accent: "#c8f53c", // acid signature accent
      surface: "#111114", // noirLight — card backgrounds
      surfaceStrong: "#22222a", // noirSurface — callout/elevated
      foreground: "#f5f0e8", // cream — primary text
      muted: "#8a8577", // creamMuted — tertiary/labels
      onPrimary: "#0a0a0b", // noir — text on acid lime (always dark)
      navIcon: "#7c3aed", // violet — nav icon accent, complements acid lime
      background: "#0a0a0b", // noir
      // Light sidebar in dark mode too, so black nav text stays readable.
      sidebarFrom: "#c8f53c", // acid lime signature
      sidebarTo: "#eef0e3", // soft cream-white
    },
    // Nameless Famous — light counterpart (cream paper, noir ink, acid accent)
    light: {
      primary: "#c8f53c", // acid stays the signature
      secondary: "#e7e2d6", // warm paper edge
      accent: "#a4c400", // slightly deeper acid so it reads on cream
      surface: "#ffffff", // card backgrounds
      surfaceStrong: "#f1ece0", // callout/elevated on cream
      foreground: "#0a0a0b", // noir ink
      muted: "#6b675c", // muted ink
      onPrimary: "#0a0a0b", // dark text on acid lime (always dark)
      navIcon: "#7c3aed", // violet nav accent
      background: "#f5f0e8", // cream paper
      sidebarFrom: "#c8f53c", // acid lime signature
      sidebarTo: "#f5f0e8", // cream paper
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
