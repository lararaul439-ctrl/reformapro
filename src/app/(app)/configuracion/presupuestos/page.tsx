import type { Metadata } from "next";
import { CompanyForm } from "@/components/settings/company-form";
import { getDb } from "@/server/db/client";
import { getCompany } from "@/server/repositories/company";

export const metadata: Metadata = { title: "Configuración · Presupuestos" };

export default async function ConfiguracionPresupuestosPage() {
  const company = await getCompany(await getDb());
  return <CompanyForm company={company} section="presupuestos" />;
}
