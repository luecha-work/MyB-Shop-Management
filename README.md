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
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
JWT_SECRET=<random string at least 32 characters>
```

Use a managed PostgreSQL provider from the Vercel Marketplace or another external PostgreSQL host. The app reads database configuration from `DATABASE_URL`; URLs with `sslmode=require`, `sslmode=verify-ca`, or `sslmode=verify-full` automatically use SSL. The local Docker database is not available to Vercel deployments.

Initialize a new production database with:

```bash
psql "$DATABASE_URL" -f db/schema.deploy.sql
```

For the first owner account, run `db/seed-owner.sql` only after reviewing the temporary password in that file, then reset/change it immediately after first login.

Deploy options:

```bash
npm i -g vercel
vercel link
vercel env pull
vercel
vercel --prod
```

Alternatively, connect the Git repository in the Vercel dashboard and set the same environment variables for Preview and Production.
