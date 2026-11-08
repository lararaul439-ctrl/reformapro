import type { Row } from "@libsql/client";
import type { Company } from "@/lib/types";
import type { CompanyInput } from "@/lib/schemas";
import type { Db } from "../db/client";
import { nowISO, num, str } from "../db/helpers";

function mapCompany(row: Row): Company {
  return {
    legalName: str(row, "legal_name"),
    tradeName: str(row, "trade_name"),
    taxId: str(row, "tax_id"),
    address: str(row, "address"),
    postalCode: str(row, "postal_code"),
    city: str(row, "city"),
    province: str(row, "province"),
    phone: str(row, "phone"),
    email: str(row, "email"),
    website: str(row, "website"),
    iban: str(row, "iban"),
    logoDataUrl: str(row, "logo_data_url"),
    accentColor: str(row, "accent_color"),
    quotePrefix: str(row, "quote_prefix"),
    defaultValidityDays: num(row, "default_validity_days"),
    defaultMarkupBp: num(row, "default_markup_bp"),
    defaultPaymentTerms: str(row, "default_payment_terms"),
    defaultConditions: str(row, "default_conditions"),
    updatedAt: str(row, "updated_at"),
  };
}

export async function getCompany(db: Db): Promise<Company> {
  const res = await db.execute("SELECT * FROM company_settings WHERE id = 1");
  if (res.rows.length === 0) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO company_settings (id, updated_at) VALUES (1, ?)",
      args: [nowISO()],
    });
    return getCompany(db);
  }
  return mapCompany(res.rows[0]);
}

export async function saveCompany(db: Db, input: CompanyInput): Promise<Company> {
  await db.execute({
    sql: `UPDATE company_settings SET
      legal_name = ?, trade_name = ?, tax_id = ?, address = ?, postal_code = ?, city = ?,
      province = ?, phone = ?, email = ?, website = ?, iban = ?, logo_data_url = ?,
      accent_color = ?, quote_prefix = ?, default_validity_days = ?, default_markup_bp = ?,
      default_payment_terms = ?, default_conditions = ?, updated_at = ?
      WHERE id = 1`,
    args: [
      input.legalName, input.tradeName, input.taxId, input.address, input.postalCode,
      input.city, input.province, input.phone, input.email, input.website, input.iban,
      input.logoDataUrl, input.accentColor, input.quotePrefix, input.defaultValidityDays,
      input.defaultMarkupBp, input.defaultPaymentTerms, input.defaultConditions, nowISO(),
    ],
  });
  return getCompany(db);
}
