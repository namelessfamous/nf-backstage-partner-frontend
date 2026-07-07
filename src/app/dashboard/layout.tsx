import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPartnerContext } from "@/lib/partner-context";
import { getScopeContext } from "@/lib/scope";
import { DashboardShell } from "@/components/dashboard/shell";

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

  return (
    <DashboardShell
      partner={partner}
      user={session?.user ?? undefined}
      scopeCtx={scopeCtx}
    >
      {children}
    </DashboardShell>
  );
}
