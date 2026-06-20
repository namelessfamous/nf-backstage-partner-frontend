import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPartnerContext } from "@/lib/partner-context";
import { DashboardShell } from "@/components/dashboard/shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, { partner }] = await Promise.all([
    getServerSession(authOptions),
    getPartnerContext(),
  ]);

  return (
    <DashboardShell partner={partner} user={session?.user ?? undefined}>
      {children}
    </DashboardShell>
  );
}
