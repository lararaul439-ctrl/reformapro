# ReformaPro

Quotation software for renovation and construction businesses in Spain. It lets a single user manage clients, keep a library of materials and services, build professional quotes with mixed VAT rates, and export them as clean PDFs.

The interface is entirely in Spanish and uses Spanish conventions: euros (`1.250,50 €`), `DD/MM/AAAA` dates, NIF/NIE/CIF validation and configurable VAT.

## Features

- **Clients** – individuals and companies, with fiscal data and quote history per client.
- **Library** – materials, labour and services with unit, cost, sale price and default VAT. Includes an optional starter set of illustrative items.
- **Quotes** – chapters and lines, per-line discounts, a global discount, and a different VAT rate on every line. Totals are computed live and VAT is broken down per rate.
- **Profitability panel** – cost, profit, margin on sales and markup over cost. Internal only: it never appears in the PDF.
- **PDF** – A4 document with company header and logo, client and work address, chapters, VAT breakdown, payment terms, conditions and IBAN. Costs, margins and internal notes are never included.
- **History** – search and filter by status, client and date range; duplicate, edit, change status. Expired quotes are flagged automatically.
- **Settings** – company data, logo, accent colour, quote numbering, default validity and texts, VAT rates (21 %, 10 %, 4 % and custom).
- **Backup** – one-click JSON export of all data (Settings → Copia de seguridad).
- **Optional password** – a single shared password for online deployments.

### Money and tax handling

- Amounts are stored as integer cents and percentages as basis points, so there is no floating-point drift. Rounding is half away from zero.
- Calculation order: line gross → line discount → line net → global discount (applied per VAT group) → VAT per group → total.
- VAT rates are always editable data. The application does **not** decide which rate applies to a given work and gives no tax advice; verify the requirements of each reduced rate before issuing a quote.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · libSQL/SQLite · `@react-pdf/renderer` · zod · Vitest.

## Quick start (local, free)

Requirements: Node.js 20.9 or later.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The database is a local SQLite file (`data/reformapro.db`) created and migrated automatically on first use. No paid service is needed.

Production build on your own machine:

```bash
npm run build
npm start
```

## Configuration

Copy `.env.example` to `.env.local` if you need to change anything.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `file:./data/reformapro.db` (default) or a `libsql://` URL for a remote database. |
| `DATABASE_AUTH_TOKEN` | Token for a remote libSQL/Turso database. |
| `ACCESS_PASSWORD` | Optional. When set, all pages require this password. Set it on any internet-facing deployment. |
| `INSECURE_COOKIES` | Set to `1` only when serving over plain HTTP outside `localhost`. |

## Deployment

### Docker or any VPS

```bash
docker build -t reformapro .
docker run -d --name reformapro -p 3000:3000 \
  -e ACCESS_PASSWORD="choose-a-strong-password" \
  -v reformapro-data:/app/data \
  reformapro
```

All data lives in the `/app/data` volume, so it survives container updates. Put the container behind a reverse proxy with HTTPS (Caddy, Nginx, Traefik).

### Vercel + Turso

Serverless platforms have no persistent disk, so use a remote libSQL database:

1. Create a database on [Turso](https://turso.tech) and note its URL and token.
2. Import the repository into Vercel.
3. Set `DATABASE_URL`, `DATABASE_AUTH_TOKEN` and `ACCESS_PASSWORD` in the project environment variables.

Tables are created automatically on first request.

## Tests

```bash
npm test          # calculations, formatting, persistence, PDF, access control
npm run check     # type check + lint + tests
```

The suite covers money arithmetic and Spanish formatting, quote totals (including mixed VAT and global discounts), persistence against real on-disk SQLite files including transaction rollback, PDF generation (text content, accents, thousands separators, pagination, absence of internal data) and the session logic. PDF tests extract text with `pdftotext` (poppler-utils), which must be installed.

## Project structure

```
src/
  app/            Routes, pages and server actions
  components/     UI kit and feature components
  lib/            Pure domain logic (money, dates, calculation, validation)
  server/
    db/           libSQL client and migrations
    repositories/ Data access, one module per entity
    pdf/          Quote PDF
    auth/         Optional password session
tests/            Vitest suites
```

The domain layer in `src/lib` has no framework dependencies. Every record carries a `created_by` column and requests go through `src/server/context.ts`, which is the intended seam for adding several workers and permissions later.

## Notices

- The PDF embeds the Inter typeface (SIL Open Font License 1.1, © The Inter Project Authors).
- The starter library prices are illustrative placeholders, not market references.
