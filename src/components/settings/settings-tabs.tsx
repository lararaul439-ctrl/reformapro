"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/configuracion", label: "Empresa" },
  { href: "/configuracion/presupuestos", label: "Presupuestos" },
  { href: "/configuracion/iva", label: "Tipos de IVA" },
  { href: "/configuracion/datos", label: "Copia de seguridad" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de configuración" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap",
              active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
