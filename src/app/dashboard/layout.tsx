import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPartnerContext } from "@/lib/partner-context";
import { getScopeContext } from "@/lib/scope";
import { DashboardShell, type NavData } from "@/components/dashboard/shell";
import { buildNavData } from "@/lib/nav-data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, { partner }, scopeCtx] = await Promise.all([
    getServerSession(authOptions),
    getPartnerContext(),
    getScopeContext(),
  ]);

  // Resource lists for the sidebar searchable flyouts, scoped to the active
  // partner/client. Failures degrade to empty lists (flyout shows "none in scope").
  const navData: NavData = await buildNavData(scopeCtx);

  return (
    <DashboardShell
      partner={partner}
      user={session?.user ?? undefined}
      scopeCtx={scopeCtx}
      navData={navData}
    >
      {children}
    </DashboardShell>
  );
}
