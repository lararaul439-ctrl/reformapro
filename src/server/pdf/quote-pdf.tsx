import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { calcQuoteDetail } from "@/lib/quote-calc";
import { formatDateEs } from "@/lib/dates";
import { formatEUR, formatPercentBp, formatQuantity } from "@/lib/money";
import type { Company, QuoteDetail } from "@/lib/types";
import { INTER_BOLD_WOFF_BASE64, INTER_REGULAR_WOFF_BASE64 } from "./fonts";

// Evita cortes de palabra con guion automático (el algoritmo es para inglés).
Font.registerHyphenationCallback((word) => [word]);

const FONT = "Inter";
let fontsRegistered = false;
function registerFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: FONT,
    fonts: [
      { src: `data:font/woff;base64,${INTER_REGULAR_WOFF_BASE64}`, fontWeight: 400 },
      { src: `data:font/woff;base64,${INTER_BOLD_WOFF_BASE64}`, fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

const DEFAULT_ACCENT = "#1d4ed8";
const INK = "#0f172a";
const MUTED = "#64748b";
const LINE = "#e2e8f0";
/** Alto de una página A4 en puntos. El pie se ancla con `top`: con `bottom`, react-pdf lo colocaba fuera de la página. */
const PAGE_HEIGHT = 841.89;

export function safeAccent(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : DEFAULT_ACCENT;
}

function safeLogo(dataUrl: string): string | null {
  return /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/.test(dataUrl) ? dataUrl : null;
}

function makeStyles(accent: string) {
  return StyleSheet.create({
    page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 40, fontFamily: FONT, fontSize: 9, color: INK, lineHeight: 1.35 },
    header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
    brand: { flexDirection: "row", maxWidth: 300 },
    logo: { width: 56, height: 56, objectFit: "contain", marginRight: 12 },
    companyName: { fontSize: 14, fontWeight: 700, color: accent, marginBottom: 2 },
    small: { fontSize: 8.5, color: MUTED },
    docBox: { alignItems: "flex-end" },
    docTitle: { fontSize: 20, fontWeight: 700, color: accent, letterSpacing: 1, lineHeight: 1.15, marginBottom: 3 },
    docNumber: { fontSize: 11, fontWeight: 700, marginBottom: 3 },
    metaRow: { flexDirection: "row", marginTop: 2 },
    metaLabel: { color: MUTED, marginRight: 4 },
    rule: { height: 2, backgroundColor: accent, marginBottom: 12 },
    twoCols: { flexDirection: "row", marginBottom: 12 },
    col: { flex: 1, paddingRight: 12 },
    label: { fontSize: 7.5, fontWeight: 700, color: MUTED, letterSpacing: 0.8, marginBottom: 3 },
    bold: { fontWeight: 700 },
    title: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
    paragraph: { marginBottom: 8 },
    chapter: { marginTop: 8, marginBottom: 2 },
    chapterHead: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f1f5f9", borderBottomWidth: 1, borderBottomColor: accent, paddingVertical: 4, paddingHorizontal: 6 },
    chapterTitle: { fontWeight: 700, fontSize: 10 },
    tHead: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: LINE },
    tHeadText: { fontSize: 7.5, color: MUTED, fontWeight: 700 },
    row: { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 6, borderBottomWidth: 0.5, borderBottomColor: LINE },
    code: { fontSize: 7.5, color: MUTED },
    right: { textAlign: "right" },
    totalsWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 14 },
    totals: { width: 270 },
    tRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    vatHead: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 2 },
    vatRow: { flexDirection: "row", paddingVertical: 2 },
    grand: { flexDirection: "row", justifyContent: "space-between", backgroundColor: accent, color: "#ffffff", paddingVertical: 6, paddingHorizontal: 8, marginTop: 6, borderRadius: 3 },
    grandText: { fontWeight: 700, fontSize: 12, color: "#ffffff" },
    section: { marginTop: 14 },
    footer: { position: "absolute", top: PAGE_HEIGHT - 40, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED, borderTopWidth: 0.5, borderTopColor: LINE, paddingTop: 5 },
  });
}

function joinNonEmpty(parts: Array<string | undefined>, sep = ", "): string {
  return parts.filter((p) => p && p.trim()).join(sep);
}

export function QuotePdfDocument({ quote, company }: { quote: QuoteDetail; company: Company }): ReactNode {
  const accent = safeAccent(company.accentColor);
  const s = makeStyles(accent);
  const calc = calcQuoteDetail(quote);
  const logo = safeLogo(company.logoDataUrl);
  const hasLineDiscount = quote.sections.some((sec) => sec.lines.some((l) => l.discountBp > 0));

  const companyName = company.tradeName || company.legalName || "Mi empresa";
  const companyLegal = company.tradeName && company.legalName && company.tradeName !== company.legalName ? company.legalName : "";
  const companyAddress = joinNonEmpty([company.address, joinNonEmpty([company.postalCode, company.city], " "), company.province]);
  const contact = joinNonEmpty([company.phone, company.email, company.website], "  ·  ");

  const c = quote.customer;
  const customerAddress = joinNonEmpty([c.address, joinNonEmpty([c.postalCode, c.city], " "), c.province]);

  const W = { qty: 66, price: 60, disc: hasLineDiscount ? 34 : 0, vat: 32, amount: 64 };

  return (
    <Document title={`Presupuesto ${quote.number}`} author={companyName} creator="ReformaPro" producer="ReformaPro" language="es-ES">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.brand}>
            {/* react-pdf Image no tiene prop alt (es un PDF, no HTML): la regla de a11y de JSX no aplica */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {logo && <Image src={logo} style={s.logo} />}
            <View style={{ flexShrink: 1 }}>
              <Text style={s.companyName}>{companyName}</Text>
              {companyLegal ? <Text style={s.small}>{companyLegal}</Text> : null}
              {company.taxId ? <Text style={s.small}>NIF/CIF: {company.taxId}</Text> : null}
              {companyAddress ? <Text style={s.small}>{companyAddress}</Text> : null}
              {contact ? <Text style={s.small}>{contact}</Text> : null}
            </View>
          </View>
          <View style={s.docBox}>
            <Text style={s.docTitle}>PRESUPUESTO</Text>
            <Text style={s.docNumber}>{quote.number}</Text>
            <View style={s.metaRow}><Text style={s.metaLabel}>Fecha:</Text><Text>{formatDateEs(quote.issueDate)}</Text></View>
            {quote.validUntil ? <View style={s.metaRow}><Text style={s.metaLabel}>Válido hasta:</Text><Text>{formatDateEs(quote.validUntil)}</Text></View> : null}
          </View>
        </View>
        <View style={s.rule} />

        <View style={s.twoCols}>
          <View style={s.col}>
            <Text style={s.label}>CLIENTE</Text>
            <Text style={s.bold}>{c.name}</Text>
            {c.taxId ? <Text>NIF/CIF: {c.taxId}</Text> : null}
            {customerAddress ? <Text>{customerAddress}</Text> : null}
            {c.phone ? <Text>{c.phone}</Text> : null}
            {c.email ? <Text>{c.email}</Text> : null}
          </View>
          {quote.workAddress ? (
            <View style={s.col}>
              <Text style={s.label}>LUGAR DE LA OBRA</Text>
              <Text>{quote.workAddress}</Text>
            </View>
          ) : <View style={s.col} />}
        </View>

        {quote.title ? <Text style={s.title}>{quote.title}</Text> : null}
        {quote.introText ? <Text style={s.paragraph}>{quote.introText}</Text> : null}

        {quote.sections.map((sec, si) => {
          const secCalc = calc.sections[si];
          const heading = sec.title || (quote.sections.length > 1 ? `Capítulo ${si + 1}` : "Partidas");
          return (
            <View key={sec.id} style={s.chapter}>
              <View wrap={false} minPresenceAhead={60}>
                <View style={s.chapterHead}>
                  <Text style={s.chapterTitle}>{heading}</Text>
                </View>
                <View style={s.tHead}>
                  <Text style={[s.tHeadText, { flex: 1 }]}>Descripción</Text>
                  <Text style={[s.tHeadText, s.right, { width: W.qty }]}>Cantidad</Text>
                  <Text style={[s.tHeadText, s.right, { width: W.price }]}>Precio</Text>
                  {hasLineDiscount ? <Text style={[s.tHeadText, s.right, { width: W.disc }]}>Dto.</Text> : null}
                  <Text style={[s.tHeadText, s.right, { width: W.vat }]}>IVA</Text>
                  <Text style={[s.tHeadText, s.right, { width: W.amount }]}>Importe</Text>
                </View>
              </View>
              {sec.lines.map((l, li) => (
                <View key={l.id} style={s.row} wrap={false}>
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    {l.code ? <Text style={s.code}>{l.code}</Text> : null}
                    <Text>{l.description}</Text>
                  </View>
                  <Text style={[s.right, { width: W.qty }]}>{formatQuantity(l.quantity)} {l.unit}</Text>
                  <Text style={[s.right, { width: W.price }]}>{formatEUR(l.unitPriceCents)}</Text>
                  {hasLineDiscount ? <Text style={[s.right, { width: W.disc }]}>{l.discountBp > 0 ? formatPercentBp(l.discountBp) : ""}</Text> : null}
                  <Text style={[s.right, { width: W.vat }]}>{formatPercentBp(l.vatRateBp)}</Text>
                  <Text style={[s.right, s.bold, { width: W.amount }]}>{formatEUR(secCalc.lines[li].netCents)}</Text>
                </View>
              ))}
              <View style={[s.tRow, { paddingHorizontal: 6, paddingTop: 4 }]} wrap={false}>
                <Text style={s.small}>Subtotal {heading}</Text>
                <Text style={s.bold}>{formatEUR(secCalc.subtotalCents)}</Text>
              </View>
            </View>
          );
        })}

        <View style={s.totalsWrap} wrap={false}>
          <View style={s.totals}>
            {calc.globalDiscountCents > 0 ? (
              <>
                <View style={s.tRow}><Text>Subtotal</Text><Text>{formatEUR(calc.subtotalCents)}</Text></View>
                <View style={s.tRow}><Text>Descuento ({formatPercentBp(quote.globalDiscountBp)})</Text><Text>-{formatEUR(calc.globalDiscountCents)}</Text></View>
              </>
            ) : null}
            <View style={[s.tRow, { borderBottomWidth: 0.5, borderBottomColor: LINE, paddingBottom: 4, marginBottom: 4 }]}>
              <Text style={s.bold}>Base imponible</Text><Text style={s.bold}>{formatEUR(calc.taxableBaseCents)}</Text>
            </View>
            <View style={s.vatHead}>
              <Text style={[s.tHeadText, { flex: 1 }]}>Desglose de IVA</Text>
              <Text style={[s.tHeadText, s.right, { width: 70 }]}>Base</Text>
              <Text style={[s.tHeadText, s.right, { width: 70 }]}>Cuota</Text>
            </View>
            {calc.vat.map((v) => (
              <View key={v.vatRateBp} style={s.vatRow}>
                <Text style={{ flex: 1 }}>IVA {formatPercentBp(v.vatRateBp)}</Text>
                <Text style={[s.right, { width: 70 }]}>{formatEUR(v.baseCents)}</Text>
                <Text style={[s.right, { width: 70 }]}>{formatEUR(v.vatCents)}</Text>
              </View>
            ))}
            <View style={[s.tRow, { borderTopWidth: 0.5, borderTopColor: LINE, marginTop: 3, paddingTop: 3 }]}>
              <Text>Total IVA</Text><Text>{formatEUR(calc.vatTotalCents)}</Text>
            </View>
            <View style={s.grand}>
              <Text style={s.grandText}>TOTAL</Text>
              <Text style={s.grandText}>{formatEUR(calc.totalCents)}</Text>
            </View>
            <Text style={[s.small, { fontSize: 7, marginTop: 4 }]}>
              IVA calculado con los tipos indicados por el emisor en cada partida.
            </Text>
          </View>
        </View>

        {quote.paymentTerms || company.iban ? (
          <View style={s.section} wrap={false}>
            <Text style={s.label}>FORMA DE PAGO</Text>
            {quote.paymentTerms ? <Text>{quote.paymentTerms}</Text> : null}
            {company.iban ? <Text style={{ marginTop: 2 }}>IBAN: {company.iban}</Text> : null}
          </View>
        ) : null}

        {quote.conditions ? (
          <View style={s.section}>
            <Text style={s.label}>CONDICIONES</Text>
            <Text style={{ fontSize: 8.5 }}>{quote.conditions}</Text>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text>{companyName} · {quote.number}</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

/** Genera el PDF del presupuesto. No incluye costes, márgenes ni notas internas. */
export async function renderQuotePdf(quote: QuoteDetail, company: Company): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<QuotePdfDocument quote={quote} company={company} />);
}

/** Nombre de archivo seguro: Presupuesto-2026-0001-Garcia-Nono.pdf */
export function quotePdfFilename(quote: Pick<QuoteDetail, "number" | "customer">): string {
  const clean = (t: string) =>
    t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const parts = ["Presupuesto", clean(quote.number), clean(quote.customer.name).slice(0, 30)].filter(Boolean);
  return `${parts.join("-")}.pdf`;
}
