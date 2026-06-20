import { DEFAULT_BACKSTAGE_API_URL } from "@/lib/runtime-config";

export type PartnerConfig = {
  key: string;
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
  };
};

export const partnerConfigs: PartnerConfig[] = [
  {
    key: "default",
    displayName: "Nameless Famous",
    description:
      "Default partner experience for backstage operators and partner onboarding.",
    supportEmail: "support@namfam.co",
    hosts: ["localhost", "127.0.0.1", "partner.namfam.co"],
    apiBaseUrl: DEFAULT_BACKSTAGE_API_URL,
    theme: {
      primary: "#2563eb",
      secondary: "#172554",
      accent: "#7dd3fc",
      surface: "#ffffff",
      surfaceStrong: "#dbeafe",
      foreground: "#0f172a",
      muted: "#526077",
    },
  },
  {
    key: "gritcreative",
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
    const [subdomain] = normalized.split(".");
    const partnerKeyMatch = partnerConfigs.find((partner) => partner.key === subdomain);

    if (partnerKeyMatch) {
      return partnerKeyMatch;
    }
  }

  return partnerConfigs[0];
}
