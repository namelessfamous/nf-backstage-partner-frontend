"use client";

import { useEffect, useState } from "react";

/**
 * Rotating status label shown while the dashboard RSC streams in. Cycles the
 * human-readable stages, holding on the last one until the real page paints.
 */
const MESSAGES = [
  "Loading your data…",
  "Building your dashboard…",
  "Preparing your deliverables…",
];

export function LoadingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setI((n) => Math.min(n + 1, MESSAGES.length - 1)),
      1100,
    );
    return () => clearInterval(id);
  }, []);
  return (
    <p
      className="mt-1 text-sm text-[var(--brand-muted)] transition-opacity duration-300"
      aria-live="polite"
    >
      {MESSAGES[i]}
    </p>
  );
}
