import { cn } from "@/lib/cn";
import { STATUS_LABELS, type DisplayStatus } from "@/lib/quote-status";

const styles: Record<DisplayStatus, string> = {
  borrador: "bg-slate-100 text-slate-700 ring-slate-200",
  enviado: "bg-blue-50 text-blue-700 ring-blue-200",
  aceptado: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rechazado: "bg-red-50 text-red-700 ring-red-200",
  caducado: "bg-amber-50 text-amber-800 ring-amber-200",
};

export function StatusBadge({ status, className }: { status: DisplayStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        styles[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
