import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev is served through host Caddy at https://partner.keysai.local —
  // Next 16 blocks cross-origin dev resources (incl. HMR + hydration
  // requests) unless the proxy hostname is allowlisted here.
  allowedDevOrigins: ["partner.keysai.local", "*.keysai.local"],
};

export default nextConfig;
