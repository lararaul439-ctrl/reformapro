"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PackagePlus } from "lucide-react";
import { importStarterCatalogAction } from "@/app/actions/catalog";
import { Button, type ButtonVariant } from "@/components/ui/button";

export function ImportStarterButton({ variant = "secondary" }: { variant?: ButtonVariant }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await importStarterCatalogAction();
            setNote(res.ok ? `Se añadieron ${res.added} artículos de ejemplo.` : res.message);
            router.refresh();
          })
        }
      >
        <PackagePlus className="h-4 w-4" aria-hidden />
        {pending ? "Importando…" : "Añadir artículos de ejemplo"}
      </Button>
      {note && <p role="status" className="text-xs text-slate-500">{note}</p>}
    </div>
  );
}
