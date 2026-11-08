import { getDb } from "@/server/db/client";
import { quotePdfFilename, renderQuotePdf } from "@/server/pdf/quote-pdf";
import { getCompany } from "@/server/repositories/company";
import { getQuote } from "@/server/repositories/quotes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PDF del presupuesto. Se muestra en el navegador; con ?descargar=1 se descarga. */
export async function GET(request: Request, ctx: RouteContext<"/api/presupuestos/[id]/pdf">) {
  const { id } = await ctx.params;
  const db = await getDb();
  const quote = await getQuote(db, id);
  if (!quote) return new Response("Presupuesto no encontrado", { status: 404 });
  const company = await getCompany(db);

  const pdf = await renderQuotePdf(quote, company);
  const download = new URL(request.url).searchParams.get("descargar") === "1";
  const filename = quotePdfFilename(quote);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
