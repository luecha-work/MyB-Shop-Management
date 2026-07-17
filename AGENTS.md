# My.B Shop Management (Next.js Migration) - Agent Knowledge Base

Welcome! This document provides crucial knowledge and context for any AI agents working on the `my-b-shop` project, which is a Next.js migration of the original Google Apps Script `../app-script` project.

**Migration status (July 2026): UI migration is COMPLETE (100%).** All views from the original app have been ported 1:1 (layout shell + dashboard, POS, history, inventory, stockin) and subsequently converted to Ant Design components. Data is still **mock** — the Google Sheets backend is the remaining work (see section 6).

---

## 1. Project Architecture & Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19
- **Language:** TypeScript
- **UI Components:** **Ant Design v6** (`antd` + `@ant-design/icons`) — themed via `ConfigProvider` in `components/Providers/AntdProvider.tsx` to preserve the original design (gold `#765a24` accent, black primary, 12px radius, Thai locale + dayjs `th`)
- **Styling/Layout:** Tailwind CSS v4 (configured in `app/globals.css` using `@theme`) — used for layout, spacing, and design tokens; antd handles interactive components
- **State Management:** React Hooks (`useState`, `useMemo`, `useActionState`), Next.js Navigation
- **Authentication:** Custom Cookie-based Dummy Auth (implemented in `lib/actions/auth.ts` and protected via `middleware.ts` — note: Next 16 deprecates `middleware` in favor of `proxy`, rename pending)
- **Database:** Google Sheets (Planned integration via `googleapis` in Server Actions)
- **Image Storage:** Google Drive (Planned)

---

## 2. Codebase Structure

- `app/layout.tsx`: Root layout configuring Google Fonts (Manrope, Inter, JetBrains Mono) + `AntdRegistry`/`AntdProvider`. `<body suppressHydrationWarning>` guards against browser-extension attribute injection.
- `app/globals.css`: Tailwind v4 `@theme` (colors `--color-*`, spacing `xs/sm/base/md/lg/xl/margin-*`, radii, shadows `card/premium/sm-card/sidebar`), typography `@utility` classes, `glass-card`, `interactive-press`, `.role-staff .role-admin-only` (role-based hiding), and `.ant-btn-secondary-solid` (gold antd button).
- `app/(auth)/login/page.tsx`: Login interface (antd Input/Button).
- `app/(dashboard)/layout.tsx`: App shell — `Topbar` (full-width header on top), then `Sidebar` + content row, `BottomNav`. Adds `role-staff` class to the container when the session role is STAFF.
- `app/(dashboard)/*/page.tsx`: Core views (`/dashboard`, `/pos`, `/history`, `/inventory`, `/stockin`) — all client components, fully implemented against the original app's markup/logic with mock data + simulated loading.
- `components/Layout/`: `Sidebar` (desktop nav, icon-only at `lg`, expanded 280px at `xl`, light-red logout button pinned at the bottom), `Topbar` (desktop header "My.B / Shop Management" + mobile header), `BottomNav` (mobile).
- `components/Providers/AntdProvider.tsx`: The single source of antd theming (tokens + per-component overrides). Extend theme HERE, not inline.
- `components/UI/Loader.tsx`: Full-screen loading overlay (antd `Spin` + message) — shown by every page while data loads.
- `lib/actions/auth.ts`: login/logout/getSession Server Actions.
- `lib/format.ts`: Shared helpers — `thbFormat` (฿ th-TH), `formatNum`, `toLocalISODate`, `currentMonthRange` (default date-range = current month, mirrors original `resetViewState`).

---

## 3. UI/UX & Styling Guidelines

- **Components:** Use antd for all cards, inputs, tables, buttons, modals, tags, pagination. Layout/spacing stays Tailwind. Mobile list views are custom Tailwind cards (antd Table is desktop-only, hidden below `lg`).
- **Icons:** Use `@ant-design/icons` ONLY (Material Symbols was removed). Nav mapping: `DashboardOutlined`, `TransactionOutlined` (POS), `HistoryOutlined`, `AppstoreOutlined` (inventory), `InboxOutlined` (stock-in). Active nav state = gold color + `font-bold` (no filled variant).
- **Gold (secondary) buttons:** `className="ant-btn-secondary-solid"` on antd `Button` (e.g., checkout, modal confirm). Destructive confirm = `type="primary" danger`.
- **Tables:** antd `Table` with `rowSelection` (keys mirror a `Set` in state), built-in pagination (`pageSizeOptions [10,15,20,25,30]`, Thai `showTotal` "แสดง X-Y จาก Z รายการ"). Data is pre-filtered/sliced in `useMemo`; pass the page slice + `total`. Mobile card lists pair with a standalone antd `Pagination size="small"`.
- **Dates:** Keep state as `YYYY-MM-DD` strings; antd `DatePicker` converts via `value={v ? dayjs(v) : null}` / `onChange={(d) => set(d?.format('YYYY-MM-DD') ?? '')}`, display `format="DD/MM/YYYY"`.
- **Modals:** antd `Modal` (centered, custom `title`/`footer` per the original design). POS mobile cart = antd `Drawer placement="bottom" size="90dvh"` — antd v6 API: use `size` (not `width`/`height`) and `styles.section` (not `styles.content`).
- **Loading:** Every page starts with `isLoading=true` → renders `<Loader text="..." />` until data resolves (currently a 600ms simulated fetch in `useEffect`; swap for a Server Action call later).
- **Design System:** Premium Material-3-like aesthetic — `shadow-card` + `border-outline-variant/80` on cards, header, sidebar, and bottom nav; 12px radius; `interactive-press` for press feedback.
- **Tailwind v4:** Custom tokens MUST live in `app/globals.css` `@theme` (no `tailwind.config.ts`); custom CSS rules via `@utility`.

---

## 4. Current Authentication State

The app currently uses a hardcoded, dummy authentication system to facilitate UI development and testing.
- **Roles:** Menus and admin-only sections adapt to `ADMIN` vs `STAFF`. Dashboard menu + History stat cards + Inventory edit buttons are ADMIN-only via the `role-admin-only` class (hidden by `.role-staff` on the layout container).
- **Middleware:** `middleware.ts` redirects unauthenticated users to `/login`.
- **Demo Users:**
  - Admin: `admin@myb.com` / `admin123`
  - Staff: `staff@myb.com` / `staff123`

---

## 5. Dev Workflow Gotchas

- **NEVER run `npm run build` while `npm run dev` is running** — the production artifacts corrupt `.next` and every route 404s. Fix: stop dev → delete `.next` → restart.
- Verify changes with `npx tsc --noEmit`, then hit routes on the dev server with an `auth_session` cookie (URL-encoded JSON `{"role":"ADMIN","name":"...","email":"..."}`).
- antd v6 emits deprecation warnings in the console — fix them with the v6 API (already done for Drawer `size`/`styles.section`).

---

## 6. Next Steps / Pending Implementation

The **Google Sheets backend is NOT yet connected**. Every mutation/fetch point in the pages carries a `TODO` comment naming the original GAS function to port from `../app-script/code.js`:
`getProducts`, `submitOrder`, `getSalesHistory`, `getDashboardStats`, `addStockRecord`, `addProduct`, `updateProduct`, `deleteProducts`, `deleteSalesHistory`, `deleteStockInRecords`, `uploadImageToDrive`.

Future agents must:
1. Setup a Google Cloud Service Account (`credentials.json`).
2. Integrate the `googleapis` package.
3. Replace the mock data + simulated `useEffect` loads with Server Actions that fetch/mutate Google Sheets (Sheet ID: `1fwQSZv8Y6nVECP82Dpz5ck_nq82-LbjncTgSLocUB4Q`).
4. Use `../app-script/AGENTS.md` section 1 as the source of truth for the sheet schema and GP commission rates (Cash 0%, Grab 21.6%, LINE MAN 32.1%).
