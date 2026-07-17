# My.B Shop Management (Next.js Migration) - Agent Knowledge Base

Welcome! This document provides crucial knowledge and context for any AI agents working on the `my-b-shop` project, which is a Next.js migration of the original Google Apps Script `app-script` project.

---

## 1. Project Architecture & Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (Configured in `app/globals.css` using `@theme`)
- **State Management:** React Hooks (`useState`, `useActionState`), Next.js Navigation
- **Authentication:** Custom Cookie-based Dummy Auth (implemented in `lib/actions/auth.ts` and protected via `middleware.ts`)
- **Database:** Google Sheets (Planned integration via `googleapis` in Server Actions)
- **Image Storage:** Google Drive (Planned)

---

## 2. Codebase Structure

The project follows the standard Next.js App Router structure:

- `app/layout.tsx`: Root layout configuring Google Fonts (Manrope, Inter, JetBrains Mono) and Google Material Symbols.
- `app/globals.css`: Contains the Tailwind CSS v4 custom color theme (`--color-primary`, `--color-surface`, etc.), border radii, shadows, typography utility classes, and custom glassmorphism utilities (`@utility glass-card`).
- `app/(auth)/login/page.tsx`: The login interface.
- `app/(dashboard)/layout.tsx`: The main application shell layout, containing the `Sidebar`, `Topbar`, and mobile `BottomNav`.
- `app/(dashboard)/*/page.tsx`: The core application views (`/dashboard`, `/pos`, `/inventory`, `/history`, `/stockin`).
- `components/Layout/`: Reusable navigation components (`Sidebar`, `Topbar`, `BottomNav`).
- `components/UI/`: Reusable UI elements (e.g., `Card.tsx`, `Loader.tsx`).
- `lib/actions/`: Next.js Server Actions (e.g., `auth.ts` for login/logout/session logic).

---

## 3. UI/UX & Styling Guidelines

- **Tailwind v4 Setup:** The project utilizes the new Tailwind v4 engine. Custom colors and variables MUST be defined in `app/globals.css` using `@theme` instead of the legacy `tailwind.config.ts`. Custom CSS rules are defined using `@utility`.
- **Design System:** The app uses a premium UI aesthetic (Material 3 style) with rich shadows, curved borders (12px), and glassmorphism effects (`glass-card`).
- **Icons:** Use `<span className="material-symbols-outlined">icon_name</span>` for icons. Add the `filled` class for active states.
- **Interactivity:** Elements that can be clicked should use the custom `@utility interactive-press` class to trigger a pressing animation (transform/translateY).

---

## 4. Current Authentication State

The app currently uses a hardcoded, dummy authentication system to facilitate UI development and testing. 
- **Roles:** The layout and menus adapt dynamically based on the user's role (`ADMIN` vs `STAFF`).
- **Middleware:** `middleware.ts` intercepts requests and redirects unauthenticated users to `/login`.
- **Demo Users:**
  - Admin: `admin@myb.com` / `admin123`
  - Staff: `staff@myb.com` / `staff123`

---

## 5. Next Steps / Pending Implementation

When modifying this project, keep in mind that the **Google Sheets Backend is NOT yet fully connected**. 
Future agents must:
1. Setup a Google Cloud Service Account (`credentials.json`).
2. Integrate the `googleapis` package.
3. Replace mock data arrays in the view pages with actual Server Actions that fetch and mutate data in Google Sheets (Sheet ID: `1fwQSZv8Y6nVECP82Dpz5ck_nq82-LbjncTgSLocUB4Q`).
