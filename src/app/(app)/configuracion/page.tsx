import type { Metadata } from "next";
import { CompanyForm } from "@/components/settings/company-form";
import { getDb } from "@/server/db/client";
import { getCompany } from "@/server/repositories/company";

export const metadata: Metadata = { title: "Configuración · Empresa" };

export default async function ConfiguracionEmpresaPage() {
  const company = await getCompany(await getDb());
  return <CompanyForm company={company} section="empresa" />;
}
