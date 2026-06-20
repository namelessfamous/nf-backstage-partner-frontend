import { headers } from "next/headers";
import { resolvePartnerByHostname } from "@/lib/partners";

export async function getPartnerContext() {
  const headerStore = await headers();
  const hostname =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";

  return {
    hostname,
    partner: resolvePartnerByHostname(hostname),
  };
}
