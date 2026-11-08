import type { Metadata } from "next";
import { TaxRatesManager } from "@/components/settings/tax-rates-manager";
import { getDb } from "@/server/db/client";
import { listTaxRates } from "@/server/repositories/tax-rates";

export const metadata: Metadata = { title: "Configuración · IVA" };

export default async function ConfiguracionIvaPage() {
  const rates = await listTaxRates(await getDb());
  return <TaxRatesManager rates={rates} />;
}
