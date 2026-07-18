# My.B Shop Management (Next.js Migration) - Agent Knowledge Base

Welcome! This document provides crucial knowledge and context for any AI agents working on the `my-b-shop` project, which is a Next.js migration of the original Google Apps Script `../app-script` project.

**Migration status (July 2026): UI migration is COMPLETE (100%).** All views from the original app have been ported 1:1 (layout shell + dashboard, POS, history, inventory, stockin) and subsequently converted to Ant Design components. PostgreSQL integration is in place for read paths plus core product, stock-in, sales checkout, sales-history delete, user, and branch mutations through Next.js API routes aligned with `db/new_schema.sql`; remaining backend work is focused on production hardening and branch-aware owner/admin workflows (see section 6).

**Maintenance rule:** Every code change that affects architecture, database schema, API routes, environment variables, dev workflow, authentication, UI conventions, or implementation status MUST update this `AGENTS.md` in the same change set so future agents have accurate project context.

---

## 1. Project Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack default dev server) + React 19
- **Language:** TypeScript
- **UI Components:** **Ant Design v6** (`antd` + `@ant-design/icons`) — themed via `ConfigProvider` in `components/Providers/AntdProvider.tsx` to preserve the original design (gold `#765a24` accent, black primary, 12px radius, Thai locale + dayjs `th`)
- **Styling/Layout:** Tailwind CSS v4 (configured in `app/globals.css` using `@theme`) — used for layout, spacing, and design tokens; antd handles interactive components
- **State Management:** React Hooks (`useState`, `useMemo`, `useActionState`), Next.js Navigation
- **Authentication:** Database-backed login in `lib/actions/auth.ts` using PostgreSQL `users.password_hash` with `pgcrypto crypt()`; route protection lives in Next.js `proxy.ts`. Login sets `access_token` for 1 hour and `refresh_token` for 24 hours.
- **Database:** PostgreSQL 16 via Docker (`Makefile`) and `pg`
- **Supabase:** Production database provider is Supabase Postgres. The app still uses PostgreSQL via `DATABASE_URL` for core read/write APIs; on Vercel this must be the Supabase Shared Pooler / Supavisor connection string, not the direct `db.<project-ref>.supabase.co:5432` string, because Supabase direct connections are IPv6 unless the IPv4 add-on is enabled and Vercel Functions cannot use direct IPv6-only database connections. `@supabase/supabase-js` + `@supabase/ssr` are installed and helper clients live in `lib/supabase/*`. Product image uploads use Supabase Storage bucket `images` (public) under `products/` through protected API route `app/api/products/images/route.ts` and require server-only `SUPABASE_SERVICE_ROLE_KEY`.
- **Backend/API:** Next.js App Router route handlers under `app/api/*`
- **Image Storage:** Product image uploads go to Supabase Storage public bucket `images`, folder `products/`, through a protected Next.js API route using `SUPABASE_SERVICE_ROLE_KEY`. Do not upload directly from the browser with public write policies. Product add/edit saves the returned public URL to `products.image_url`.

---

## 2. Codebase Structure

- `app/layout.tsx`: Root layout configuring Google Fonts (Manrope, Inter, JetBrains Mono) + `AntdRegistry`/`AntdProvider`. `<body suppressHydrationWarning>` guards against browser-extension attribute injection.
- `app/globals.css`: Tailwind v4 `@theme` (colors `--color-*`, spacing `xs/sm/base/md/lg/xl/margin-*`, radii, shadows `card/premium/sm-card/sidebar`), typography `@utility` classes, `glass-card`, `interactive-press`, `.role-staff .role-admin-only` (role-based hiding), and `.ant-btn-secondary-solid` (gold antd button).
- `next.config.ts`: Next.js config. Development allows `*.trycloudflare.com` via `allowedDevOrigins` so Cloudflare Tunnel previews can load Next dev/HMR endpoints.
- `vercel.json`: Vercel project config. Keeps the Next.js framework preset with `npm ci` and `npm run build` for hosted deploys.
- `app/(auth)/login/page.tsx`: Login interface (antd Input/Button).
- `app/(dashboard)/layout.tsx`: App shell — `Topbar` (full-width header on top), then `Sidebar` + content row, `BottomNav`. Adds `role-staff` class to the container when the session role is STAFF.
- `app/(dashboard)/*/page.tsx`: Core views (`/dashboard`, `/pos`, `/history`, `/inventory`, `/stockin`) — all client components, fully implemented against the original app's markup/logic and now fetching read data from local API routes. POS checkout saves through `/api/sales-history`, refetches products after stock is decremented, and writes `localStorage` key `myb:last-sale-at` so open history views can refresh. History fetches use `cache: 'no-store'` plus a cache-busting query param and reload on focus/visibility/storage events. Inventory product add/edit saves through `/api/products`; image selection uploads to `/api/products/images` on product save and persists the returned Supabase public URL. Inventory stock-in saves through `/api/stock-in` and refetches products after stock is incremented.
- `app/(dashboard)/dashboard/page.tsx`: Sales overview dashboard. The date filter sits below the "ภาพรวมยอดขาย" header copy and spans the content width; summary stat cards use a wider 1-column mobile / 2-column desktop grid. Top-products rows keep product detail and sales amount spaced with an 8:2 flex ratio, fetch up to 100 ranked products, and paginate them 5 at a time in the card.
- `app/api/products/route.ts`: Product list/add/edit/delete API backed by PostgreSQL `products`. `POST` creates products with an auto-generated numeric `product_code` stored as text (`1`, `2`, `3`, ...), admin/owner-only `PATCH { action: 'update-product' }` updates product fields plus `products.image_url`, and `DELETE` removes selected products plus any Supabase Storage images under `images/products/`; `PATCH { action: 'update-image' }` remains available for image-only updates.
- `app/api/products/images/route.ts`: Admin/owner-only product image upload API. Accepts multipart `file` + `productName`, validates image type/5MB size, uploads to Supabase Storage public bucket `images` under `products/`, and returns the public URL. Requires `SUPABASE_SERVICE_ROLE_KEY`; never expose this key to the browser.
- `app/api/dashboard/route.ts`: Dashboard summary API backed by PostgreSQL `sales`; top-product names are resolved with `LEFT JOIN products` because transaction tables do not store `product_name` in the current schema. Top products are limited to 100 rows.
- `app/api/sales-history/route.ts`: Sales history API backed by PostgreSQL `sales`; joins `products` through `sales.product_id` to display product names, applies STAFF branch scoping from the session, supports authenticated `POST` checkout, and supports admin/owner-only `DELETE` by `order_id`. Checkout must run in a transaction, lock selected products, validate stock, insert one `sales` row per cart line with GP/net-profit values, decrement `products.current_stock`, increment `products.stock_out`, and refresh product `status`. Deleting/canceling sales history must run in a transaction, restore sold quantities to `products.current_stock`, decrement `products.stock_out` without going below zero, refresh product `status`, then delete the `sales` rows.
- `app/api/stock-in/route.ts`: Stock-in history API backed by PostgreSQL `stock_in`; joins `products` through `stock_in.product_id` to display product names, applies STAFF branch scoping from the session, supports authenticated `POST` stock-in, and supports admin/owner-only `DELETE` by row `id`. Stock-in saves must run in a transaction, insert `stock_in`, increment `products.current_stock` and `products.stock_in`, increment `products.number_of_times_received`, and refresh product `status`.
- `app/api/profile/route.ts`: Read-only current-user profile API backed by PostgreSQL `users`, `roles`, and `branches`; returns name/email/status/role plus assigned branch name/code. Profile edits and password changes are intentionally not exposed here.
- `app/api/users/route.ts`: Admin/owner-only user list + form metadata + create/edit/delete API; reset-password is OWNER-only. Passwords are generated by the UI for add-user or by the server for reset-password, then stored with `crypt($password, gen_salt('bf'))`.
- `app/api/branches/route.ts`: Admin/owner-only branch list with assigned users/roles, single-branch detail via `?id=...`, and create/edit/delete branch API.
- `app/(dashboard)/users/page.tsx`: Manage-user page with table, add/edit user modal, reset-password confirm modal, copy temporary-password modal, and delete selected users. Users cannot delete themselves. Owner role forms hide branch selection and clear branch before save.
- `app/(dashboard)/branches/page.tsx`: Manage-branch page with table, view/edit actions, add/edit branch modal, detail modal showing assigned users/roles, and delete selected branches. Success/error operation feedback uses floating antd `Alert` components at the top-right under the app header and auto-dismisses.
- `app/(dashboard)/profile/page.tsx`: Read-only profile page showing the logged-in user's name, email, role, account status, and assigned branch. Do not add edit/profile-password controls unless product requirements explicitly change.
- `components/Layout/`: `Sidebar` (desktop primary nav, icon-only at `lg`, expanded 280px at `xl`), `Topbar` (desktop/mobile brand text "My.b Shop" with "Management" as desktop sublabel, mobile/iPad header with an antd `Avatar` icon-only profile trigger and profile menu with branch selector loaded from lightweight `/api/branches?options=1`), `BottomNav` (mobile).
- `components/Providers/AntdProvider.tsx`: The single source of antd theming (tokens + per-component overrides). Extend theme HERE, not inline.
- `components/UI/Loader.tsx`: Full-screen loading overlay (antd `Spin` + message) — shown by every page while data loads.
- `lib/actions/auth.ts`: login/logout/getSession Server Actions. Login validates `users.email`, active status, and `password_hash` via PostgreSQL `crypt()`, then stores compact session payloads in `access_token` (1h) and `refresh_token` (24h) cookies.
- `lib/auth/session.ts`: Shared session type, route-handler cookie decoding (`sessionFromRequest`), and role helpers.
- `lib/db.ts`: Shared PostgreSQL connection pool and small DB value helpers. Requires `DATABASE_URL`; sets PostgreSQL `search_path` from `DATABASE_SCHEMA` (default `public`; production/Vercel uses `mybshop`) plus `public,extensions` so Supabase `pgcrypto` functions such as `crypt()` are visible. SSL is inferred from `DATABASE_URL` `sslmode=require|verify-ca|verify-full` or optional `DB_SSL=true`. It strips `sslmode`/`uselibpqcompat` before passing the URL to `pg` and applies `ssl: { rejectUnauthorized: false }` directly when SSL is required, avoiding Supabase pooler `SELF_SIGNED_CERT_IN_CHAIN` failures on Vercel. Includes date/number/UUID param guards for API routes.
- `lib/supabase/client.ts` / `lib/supabase/server.ts`: Supabase browser/server client helpers using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Do not wire Supabase Auth middleware unless product requirements explicitly switch auth away from the current custom JWT/session flow.
- `lib/format.ts`: Shared helpers — `thbFormat` (฿ th-TH), `formatNum`, `toLocalISODate`, `currentMonthRange` (default date-range = current month, mirrors original `resetViewState`).
- `db/schema.sql`: Idempotent PostgreSQL schema for roles, branches, products, users, sales, stock_in, and indexes, kept compatible with `db/new_schema.sql`. `sales` and `stock_in` store `product_id`, not `product_name`; product display names must be resolved by joining `products`. The `users` table stores credentials in `password_hash`; never store plain-text passwords.
- `db/schema.deploy.sql`: Portable managed-PostgreSQL schema for production/Vercel deploys. Uses schema `mybshop`, `CREATE EXTENSION IF NOT EXISTS pgcrypto`, avoids local-owner/GRANT dump statements, creates tables/indexes idempotently, and seeds base roles (`owner`, `admin`, `staff`).
- `db/backfill-product-codes.sql`: One-time repair script for products created before automatic product codes existed. Run it with the correct `search_path` (`mybshop` on production, `public` locally) so blank/NULL `product_code` values become sequential numeric text codes without touching existing codes.
- `db/seed-owner.deploy.sql`: Production owner seed for schema `mybshop`; review/change the temporary password immediately after first login.
- `.gitignore`: Ignores all `.env*` files. Keep env examples in documentation, not committed env files.
- `db/seed-owner.sql`: Local seed for owner login (`owner@myb.com` / `owner123`) using `crypt()`.

---

## 3. UI/UX & Styling Guidelines

- **Components:** Use antd for all cards, inputs, tables, buttons, modals, tags, pagination. Layout/spacing stays Tailwind. Mobile list views are custom Tailwind cards (antd Table is desktop-only, hidden below `lg`).
- **Icons:** Use `@ant-design/icons` ONLY (Material Symbols was removed). Nav mapping: `DashboardOutlined`, `TransactionOutlined` (POS), `HistoryOutlined`, `AppstoreOutlined` (inventory), `InboxOutlined` (stock-in). Active nav state = gold color + `font-bold` (no filled variant).
- **Gold (secondary) buttons:** `className="ant-btn-secondary-solid"` on antd `Button` (e.g., checkout, modal confirm). Destructive confirm = `type="primary" danger`.
- **Cancel buttons:** Modal cancel buttons labeled `ยกเลิก` use `className="ant-btn-cancel-soft"` for a light red treatment.
- **Alerts:** antd v6 `Alert` uses `title={...}` instead of the deprecated `message={...}` prop. Page-level transient alerts float above modals at the top-right (`top: 88px`, `z-index: 1200`) and auto-dismiss after 3 seconds.
- **Tables:** antd `Table` with `rowSelection` (keys mirror a `Set` in state), built-in pagination (`pageSizeOptions [10,15,20,25,30]`, Thai `showTotal` "แสดง X-Y จาก Z รายการ"). Data is pre-filtered/sliced in `useMemo`; pass the page slice + `total`. Mobile card lists pair with a standalone antd `Pagination size="small"`.
- **Dates:** Keep state as `YYYY-MM-DD` strings; antd `DatePicker` converts via `value={v ? dayjs(v) : null}` / `onChange={(d) => set(d?.format('YYYY-MM-DD') ?? '')}`, display `format="DD/MM/YYYY"`, and use `allowClear={false}` for required date filters so the hover clear icon does not appear.
- **Modals:** antd `Modal` (centered, custom `title`/`footer` per the original design). POS mobile cart = antd `Drawer placement="bottom" size="90dvh"` — antd v6 API: use `size` (not `width`/`height`) and `styles.section` (not `styles.content`).
- **Inventory product modal:** Add/edit product keeps the product name full-width, while price and stock numeric fields are arranged as two inputs per row. Numeric `InputNumber` controls must stretch to the full width of their grid cell.
- **Inputs:** antd v6 deprecates `Input addonAfter`; use `Space.Compact` for input + attached action buttons.
- **Loading:** Pages render `<Loader text="..." />` until their API fetch resolves. `dashboard`, `history`, and `stockin` refetch when date filters change.
- **Design System:** Premium Material-3-like aesthetic — `shadow-card` + `border-outline-variant/80` on cards, header, sidebar, and bottom nav; 12px radius; `interactive-press` for press feedback.
- **Tailwind v4:** Custom tokens MUST live in `app/globals.css` `@theme` (no `tailwind.config.ts`); custom CSS rules via `@utility`.
- **Login page:** Keep the auth card width explicit (`width: min(100%, 440px)`) to prevent collapse. Header copy is a single-line `h3` with `text-headline-md`: "Login to My.B Shop Management". Do not show demo account credentials or prefilled dummy credentials.
- **Images:** Never pass an empty string to `<img src>`. Product image rendering should fall back to `FALLBACK_IMG` before render, not only in `onError`.

---

## 4. Current Authentication State

The app uses PostgreSQL-backed authentication.
- **Roles:** Menus and admin-only sections adapt to `ADMIN` vs `STAFF`. Dashboard menu + History stat cards + Inventory edit buttons are ADMIN-only via the `role-admin-only` class (hidden by `.role-staff` on the layout container).
- **Proxy:** `proxy.ts` redirects unauthenticated users to `/login` and clears invalid/stale `access_token`, `refresh_token`, and `auth_session` cookies when token decoding fails.
- **Admin-only pages:** `/users*` and `/branches*` are blocked for `STAFF` by `proxy.ts`. Entry points live in the Topbar profile menu and are shown only to `OWNER` and `ADMIN`, not in Sidebar/BottomNav. The menu labels are "จัดการ user" (`/users`) and "จัดการสาขา" (`/branches`).
- **User passwords / account forms:** Admins never type passwords manually. Add-user shows a generated read-only password with Generate/Copy controls before saving; required add-user fields must validate with red error states before submit. Reset-password is OWNER-only, generates a new password server-side, and shows it once in a copy modal. Owner accounts do not select a branch; STAFF must select a branch. The current logged-in user cannot be selected/deleted from the user table.
- **Token lifetime:** `access_token` expires in 1 hour. `refresh_token` expires in 24 hours. `proxy.ts` can recreate a missing access token from a valid refresh token.
- **Local seed user:** run `make seed-owner` after `make init-db` to create/update `owner@myb.com` / `owner123`.

---

## 5. Dev Workflow Gotchas

- **NEVER run `npm run build` while `npm run dev` is running** — the production artifacts corrupt `.next` and every route 404s. Fix: stop dev → delete `.next` → restart.
- **NEVER commit `.env`, `.env.*`, or any environment-variable file to git.** This is absolute for this repo. Keep env examples in `README.md`/docs only; `.gitignore` must continue ignoring `.env*` with no exception rules.
- `npm run dev` currently uses the standard `next dev`, which starts Turbopack in Next 16. If Turbopack HMR panics (`TurbopackInternalError: Cell ... no longer exists`), stop dev and run `npx next dev --webpack` as a temporary workaround.
- PostgreSQL local workflow:
  - Start Docker Desktop first.
  - `make up` creates the `myb-shop` PostgreSQL container using defaults from `Makefile`.
  - `make init-db` applies `db/schema.sql`.
  - `make seed-owner` creates/updates the local owner login.
  - `make psql` opens a psql shell.
  - `.env` uses `DATABASE_URL="postgresql://admin:Password%401@localhost:5432/myb-shop-db"`, `DATABASE_SCHEMA="public"`, and `DB_SSL="false"` by default.
- Verify code changes with `npx tsc --noEmit` and `npm run lint`, then hit routes on the dev server with an `access_token` or `refresh_token` cookie containing the session payload.
- `npm run verify` runs `npm run typecheck` and `npm run lint`.
- Vercel deployment workflow:
  - Use Vercel's Next.js framework preset; `vercel.json` pins `npm ci` and `npm run build`.
  - Set `DATABASE_URL`, `DATABASE_SCHEMA=mybshop`, `JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel Project Settings for Preview/Production. `DATABASE_URL` must use the Supabase Shared Pooler / Supavisor transaction-mode URL, e.g. `postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?sslmode=require`; `DB_SSL=true` remains an optional override.
  - Use an external/Marketplace PostgreSQL database; local Docker is not reachable from Vercel.
  - Initialize fresh production databases with `psql "$DATABASE_URL" -f db/schema.deploy.sql`, then seed the first owner carefully from `db/seed-owner.deploy.sql` and change/reset that temporary password immediately.
- antd v6 emits deprecation warnings in the console — fix them with the v6 API (already done for Drawer `size`/`styles.section`).

---

## 6. Next Steps / Pending Implementation

The core read paths and high-traffic mutations now use PostgreSQL. Remaining backend work is focused on production hardening and branch-aware workflows:

1. Add seed data or import tooling so a fresh `make up && make init-db` environment has usable demo products/branches.
2. Finish branch-aware filtering for all remaining owner/admin views and wire the Topbar branch selector to API query state for OWNER/ADMIN views.
3. Decide whether deleting stock-in history should reverse `products.current_stock`/`stock_in`; current API deletes only the history row.
4. Keep GP commission rates aligned with the original business rules: Cash 0%, Grab 21.6%, LINE MAN 32.1%.
