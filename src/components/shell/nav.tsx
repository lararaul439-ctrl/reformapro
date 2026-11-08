"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FileText,
  Hammer,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { logoutAction } from "@/app/actions/auth";
import { buttonClass } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Panel", icon: LayoutDashboard },
  { href: "/presupuestos", label: "Presupuestos", icon: FileText },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/configuracion", label: "Configuración", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <Hammer className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">ReformaPro</span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-slate-400")} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ companyName, showLogout, onNavigate }: { companyName: string; showLogout: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6">
      <Brand />
      <Link
        href="/presupuestos/nuevo"
        onClick={onNavigate}
        className={buttonClass("primary", "md", "w-full")}
      >
        <Plus className="h-4 w-4" aria-hidden /> Nuevo presupuesto
      </Link>
      <NavList onNavigate={onNavigate} />
      <div className="mt-auto border-t border-slate-200 pt-4 text-xs text-slate-500">
        <p className="truncate font-medium text-slate-700">{companyName || "Tu empresa"}</p>
        {!companyName && (
          <Link href="/configuracion" onClick={onNavigate} className="text-brand-700 hover:underline">
            Completa los datos de empresa
          </Link>
        )}
        {showLogout && (
          <form action={logoutAction} className="mt-3">
            <button type="submit" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800">
              <LogOut className="h-3.5 w-3.5" aria-hidden /> Cerrar sesión
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/** Barra lateral fija (escritorio) + barra superior con menú desplegable (móvil). */
export function AppShell({
  companyName,
  showLogout = false,
  children,
}: {
  companyName: string;
  showLogout?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block">
        <SidebarBody companyName={companyName} showLogout={showLogout} />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          type="button"
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white p-5 shadow-xl">
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            <SidebarBody companyName={companyName} showLogout={showLogout} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}
