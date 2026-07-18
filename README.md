# My.B Shop Management

Next.js 16 App Router migration of the My.B Shop Management app.

## Local Development

```bash
npm install
npm run dev
```

Local PostgreSQL uses Docker through `Makefile`:

```bash
make up
make init-db
make seed-owner
```

Default local owner login:

```text
owner@myb.com / owner123
```

## Verification

```bash
npm run verify
```

`verify` runs TypeScript checking and ESLint. Do not run `npm run build` while `npm run dev` is still running.

## Vercel Deployment

Vercel auto-detects Next.js projects and applies framework defaults. This repo also includes `vercel.json` to pin the install and build commands.

Required Vercel environment variables:

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require
DATABASE_SCHEMA=mybshop
JWT_SECRET=<random string at least 32 characters>
NEXT_PUBLIC_SUPABASE_URL=https://ydcaopgvpfqhojozfmea.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
```

Use Supabase Postgres for production. On Vercel, use the Supabase Shared Pooler / Supavisor transaction-mode connection string, not the direct `db.<project-ref>.supabase.co:5432` connection string. Direct Supabase database hosts resolve to IPv6 unless the Supabase IPv4 add-on is enabled, and Vercel Functions cannot use those direct IPv6-only connections.

The app reads database connection details from `DATABASE_URL`, uses `DATABASE_SCHEMA` for PostgreSQL `search_path`, and also includes `public,extensions` so Supabase-hosted `pgcrypto` functions such as `crypt()` are visible. It automatically enables SSL for URLs with `sslmode=require`, `sslmode=verify-ca`, or `sslmode=verify-full`. The app strips `sslmode` before passing the URL to `pg` and applies SSL options directly so Supabase pooler certificates work on Vercel. The local Docker database is not available to Vercel deployments.

Supabase client helpers live in `lib/supabase`. They are available for future Supabase API/Auth/Storage usage. Current application login still uses the existing database-backed `users` table and custom JWT cookies, so the main middleware remains the app's existing route protection rather than Supabase Auth middleware.

Schema convention:

```text
Local: public
Production: mybshop
```

Initialize a new production database with:

```bash
psql "$DATABASE_URL" -f db/schema.deploy.sql
```

For the first production owner account, run `db/seed-owner.deploy.sql` only after reviewing the temporary password in that file, then reset/change it immediately after first login.

Deploy options:

```bash
npm i -g vercel
vercel link
vercel env pull
vercel
vercel --prod
```

Alternatively, connect the Git repository in the Vercel dashboard and set the same environment variables for Preview and Production.
