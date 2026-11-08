import { PageHeader } from "@/components/ui/card";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Configuración" description="Datos de tu empresa, impuestos y opciones de los presupuestos." />
      <SettingsTabs />
      <div className="max-w-4xl">{children}</div>
    </>
  );
}
