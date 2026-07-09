import { DEFAULT_BACKSTAGE_API_URL, NF_ID_CLIENT_ID } from "@/lib/runtime-config";

export type PartnerConfig = {
  key: string;
  /** client_id passed to nf-id SSO. Defaults to NF_ID_CLIENT_ID env var ("partner-portal"). */
  clientId?: string;
  displayName: string;
  description: string;
  supportEmail: string;
  hosts: string[];
  apiBaseUrl?: string;
  theme: {
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
  theme: {
    // Nameless Famous — brutNOIR brand system
    primary: "#c8f53c", // acid — CTAs, active states
    secondary: "#22222a", // noirSurface
    accent: "#c8f53c", // acid signature accent
    surface: "#111114", // noirLight — card backgrounds
    surfaceStrong: "#22222a", // noirSurface — callout/elevated
    foreground: "#f5f0e8", // cream — primary text
    muted: "#8a8577", // creamMuted — tertiary/labels
    onPrimary: "#0a0a0b", // noir — text on acid lime (always dark)
    navIcon: "#7c3aed", // violet — nav icon accent, complements acid lime
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
    theme: {
      primary: "#ca8a04",
      secondary: "#422006",
      accent: "#fcd34d",
      surface: "#fffdf6",
      surfaceStrong: "#fef3c7",
      foreground: "#292524",
      muted: "#57534e",
      onPrimary: "#292524", // dark text on the gold primary
      navIcon: "#292524", // dark nav icons on the gold gradient
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
