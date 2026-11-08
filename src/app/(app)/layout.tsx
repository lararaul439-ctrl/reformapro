import { AppShell } from "@/components/shell/nav";
import { isAccessGateEnabled } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { getCompany } from "@/server/repositories/company";

// Todas las pantallas leen la base de datos: nunca se prerenderizan.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const company = await getCompany(await getDb());
  return (
    <AppShell companyName={company.tradeName || company.legalName} showLogout={isAccessGateEnabled()}>
      {children}
    </AppShell>
  );
}
