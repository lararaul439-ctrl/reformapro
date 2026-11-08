/**
 * Migraciones de base de datos (SQLite / libSQL).
 *
 * - Cada migración se aplica una sola vez, en una transacción, y queda
 *   registrada en `schema_migrations`.
 * - NUNCA edites una migración ya publicada: añade una nueva al final.
 * - Importes en céntimos enteros; porcentajes en puntos básicos (bp).
 */

export interface Migration {
  version: number;
  name: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "esquema_inicial",
    statements: [
      `CREATE TABLE company_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        legal_name TEXT NOT NULL DEFAULT '',
        trade_name TEXT NOT NULL DEFAULT '',
        tax_id TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        postal_code TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        province TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        website TEXT NOT NULL DEFAULT '',
        iban TEXT NOT NULL DEFAULT '',
        logo_data_url TEXT NOT NULL DEFAULT '',
        accent_color TEXT NOT NULL DEFAULT '#1d4ed8',
        quote_prefix TEXT NOT NULL DEFAULT 'P-',
        default_validity_days INTEGER NOT NULL DEFAULT 30,
        default_markup_bp INTEGER NOT NULL DEFAULT 2000,
        default_payment_terms TEXT NOT NULL DEFAULT '',
        default_conditions TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE tax_rates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rate_bp INTEGER NOT NULL UNIQUE CHECK (rate_bp BETWEEN 0 AND 10000),
        is_default INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE customers (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL DEFAULT 'particular' CHECK (kind IN ('particular','empresa')),
        name TEXT NOT NULL,
        tax_id TEXT NOT NULL DEFAULT '',
        email TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        postal_code TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL DEFAULT '',
        province TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX idx_customers_name ON customers(name COLLATE NOCASE)`,
      `CREATE TABLE catalog_items (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        item_type TEXT NOT NULL CHECK (item_type IN ('material','servicio','mano_obra')),
        category TEXT NOT NULL DEFAULT '',
        unit TEXT NOT NULL DEFAULT 'ud',
        unit_cost_cents INTEGER NOT NULL DEFAULT 0,
        unit_price_cents INTEGER NOT NULL DEFAULT 0,
        vat_rate_bp INTEGER NOT NULL DEFAULT 2100,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX idx_catalog_name ON catalog_items(name COLLATE NOCASE)`,
      `CREATE TABLE quote_counters (
        year INTEGER PRIMARY KEY,
        last_seq INTEGER NOT NULL
      )`,
      `CREATE TABLE quotes (
        id TEXT PRIMARY KEY,
        number TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL REFERENCES customers(id),
        customer_snapshot TEXT NOT NULL DEFAULT '{}',
        title TEXT NOT NULL DEFAULT '',
        work_address TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'borrador'
          CHECK (status IN ('borrador','enviado','aceptado','rechazado')),
        issue_date TEXT NOT NULL,
        valid_until TEXT,
        global_discount_bp INTEGER NOT NULL DEFAULT 0,
        intro_text TEXT NOT NULL DEFAULT '',
        payment_terms TEXT NOT NULL DEFAULT '',
        conditions TEXT NOT NULL DEFAULT '',
        internal_notes TEXT NOT NULL DEFAULT '',
        subtotal_cents INTEGER NOT NULL DEFAULT 0,
        taxable_base_cents INTEGER NOT NULL DEFAULT 0,
        vat_cents INTEGER NOT NULL DEFAULT 0,
        total_cents INTEGER NOT NULL DEFAULT 0,
        created_by TEXT NOT NULL DEFAULT 'default',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX idx_quotes_customer ON quotes(customer_id)`,
      `CREATE INDEX idx_quotes_issue_date ON quotes(issue_date DESC)`,
      `CREATE INDEX idx_quotes_status ON quotes(status)`,
      `CREATE TABLE quote_sections (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT '',
        position INTEGER NOT NULL
      )`,
      `CREATE INDEX idx_quote_sections_quote ON quote_sections(quote_id, position)`,
      `CREATE TABLE quote_lines (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        section_id TEXT NOT NULL REFERENCES quote_sections(id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        catalog_item_id TEXT,
        code TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'ud',
        quantity REAL NOT NULL,
        unit_cost_cents INTEGER NOT NULL DEFAULT 0,
        unit_price_cents INTEGER NOT NULL DEFAULT 0,
        discount_bp INTEGER NOT NULL DEFAULT 0,
        vat_rate_bp INTEGER NOT NULL
      )`,
      `CREATE INDEX idx_quote_lines_section ON quote_lines(section_id, position)`,
      `CREATE INDEX idx_quote_lines_quote ON quote_lines(quote_id)`,
      `CREATE TABLE quote_events (
        id TEXT PRIMARY KEY,
        quote_id TEXT NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        detail TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX idx_quote_events_quote ON quote_events(quote_id, created_at)`,

      // Valores iniciales: fila única de empresa y tipos de IVA habituales.
      // Los tipos son EDITABLES por la persona usuaria (Configuración > IVA).
      `INSERT INTO company_settings (id, updated_at) VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
      `INSERT INTO tax_rates (id, name, rate_bp, is_default, is_active, sort_order, created_at) VALUES
        ('iva-21', 'IVA 21 %', 2100, 1, 1, 1, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        ('iva-10', 'IVA 10 %', 1000, 0, 1, 2, strftime('%Y-%m-%dT%H:%M:%fZ','now')),
        ('iva-4',  'IVA 4 %',   400, 0, 1, 3, strftime('%Y-%m-%dT%H:%M:%fZ','now'))`,
    ],
  },
];
