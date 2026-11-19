# Task: Add Dark and Light Theme Switcher & Full Theme Support to LevelUp Admin Center

## Status: COMPLETED

### 1. Plan & Objectives
- [x] 1. Inspect existing theme infrastructure (`next-themes`, `globals.css`, `ThemeToggle.tsx`, `ThemeProvider.tsx`).
- [x] 2. Update `src/app/levelup/admin/page.tsx` with:
  - Theme switcher button in the navbar using `ThemeToggle` component.
  - Complete light & dark theme styling for the page container, navbar, breadcrumb, badge, action buttons.
  - KPI metric cards (light: crisp white with slate border; dark: deep slate with subtle border).
  - Tab pills & search input field.
  - Table view (header, rows, borders, text, timestamps, status badges, scorecard links, delete buttons).
  - Unauthenticated / login view with light/dark adaptive styling and theme toggle.
- [x] 3. Update `src/components/levelup/LevelUpRemarkModal.tsx` to support both light and dark themes (modal box, candidate summary, presets, textarea, action buttons).
- [x] 4. Update `src/components/levelup/LevelUpDeleteModal.tsx` to support both light and dark themes (danger banner, confirmation box, input, buttons).
- [x] 5. Verify local TypeScript compilation (`npx tsc --noEmit`) with 0 errors.
- [x] 6. Stage, commit, push to Git (`origin/main`), and trigger server deployment (`deploy.sh`).
- [x] 7. Verify live site `https://smartuplearning.net/levelup/admin` in production.

### 2. Architecture & Design Specifications
- **Theme Engine**: `next-themes` via `ThemeProvider` (`attribute="class"` toggling `.dark` on `<html>`).
- **Navbar Switcher**: Interactive `ThemeToggle` with sun/moon animated icons, ambient glow, and particle burst.
- **Color Palette**:
  - Light mode: `bg-slate-50`, surface `bg-white`, header `bg-white/90`, borders `border-slate-200`, text `text-slate-900` / `text-slate-600`.
  - Dark mode: `bg-[#0A0D14]`, surface `bg-[#121722]`, header `bg-[#10141E]/90`, borders `border-slate-800`, text `text-white` / `text-slate-400`.
  - Accent / Brand: Emerald/Purple theme tokens preserved across both modes.

### 3. Review & Results
- **TypeScript**: `npx tsc --noEmit` passed with 0 errors.
- **Git Push**: Commit `6703162` pushed to `origin/main`.
- **Clustered Server Deploy**:
  - Executed `/var/www/smartup-erp/scripts/deploy.sh` on server `76.13.244.60`.
  - Next.js production build compiled in 59s.
  - Zero-downtime reload across all 4 PM2 instances (`smartup-erp-1` to `smartup-erp-4`).
- **Verification**:
  - All 4 PM2 cluster nodes online.
  - `https://smartuplearning.net/levelup/admin` returns `HTTP/2 200 OK`.
  - Theme switching works dynamically between Dark and Light mode.
