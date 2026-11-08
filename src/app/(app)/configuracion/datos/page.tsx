import type { Metadata } from "next";
import { Download } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Banner, Card, CardHeader } from "@/components/ui/card";

export const metadata: Metadata = { title: "Configuración · Copia de seguridad" };

export default function ConfiguracionDatosPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Copia de seguridad"
          description="Descarga todos tus datos (empresa, clientes, biblioteca, IVA y presupuestos) en un único archivo JSON."
        />
        <a href="/api/exportar" className={buttonClass("primary")} download>
          <Download className="h-4 w-4" aria-hidden /> Descargar copia de seguridad
        </a>
      </Card>
      <Banner tone="info">
        <p>
          Tus datos se guardan de forma persistente en la base de datos configurada en <code className="rounded bg-white/60 px-1">DATABASE_URL</code>
          {" "}(por defecto, el archivo <code className="rounded bg-white/60 px-1">data/reformapro.db</code>). Para
          una copia completa también puedes copiar ese archivo con la aplicación parada.
        </p>
      </Banner>
    </div>
  );
}
