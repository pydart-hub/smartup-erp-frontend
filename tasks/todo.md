# Plan: LevelUp GCC Scholarship Exam Platform (Database: smartup_online)

## Objective
Implement a completely separated, dedicated scholarship exam portal for the subdomain `levelup.smartuplearning.net` backed by a new PostgreSQL database named `smartup_online`. Zero changes to existing exam attempts, scholar records, or the `smartup_offline` database.

---

### Step 1: Database & Prisma Configuration
- [x] Add `LEVELUP_DATABASE_URL` with database name `smartup_online` to `.env.local` & `.env`.
- [x] Create `prisma/levelup.prisma` targeting `LEVELUP_DATABASE_URL` with dedicated output generator `@prisma/client-levelup`.
- [x] Generate dedicated Prisma client for LevelUp (`npx prisma generate --schema=prisma/levelup.prisma`).
- [x] Create singleton database client `src/lib/levelup-exam/db.ts` to cleanly export `levelupDb`.

### Step 2: Next.js Middleware & Subdomain Routing
- [x] In `src/proxy.ts`, add `/levelup` and `/api/levelup` to public paths.
- [x] Add `host.toLowerCase().startsWith("levelup.")` rewrite handler routing to `/levelup${pathname}`.

### Step 3: API Layer (`src/app/api/levelup/*`)
- [x] `register/route.ts`: Register GCC student into `smartup_online` database.
- [x] `check/route.ts`: Lookup candidate by phone for instant resumption.
- [x] `start/route.ts`: Create/resume exam attempt with frozen paper snapshot.
- [x] `attempt/[attemptId]/answer/route.ts`: Atomic autosave answers.
- [x] `attempt/[attemptId]/submit/route.ts`: Auto/manual submission & grading calculation.
- [x] `admin/login/route.ts` & `admin/attempts/route.ts`: Dedicated admin view & CSV download for GCC records.

### Step 4: UI & Pages (`src/app/levelup/*`)
- [x] `layout.tsx`: Custom LevelUp GCC layout, metadata, and styling tokens.
- [x] `page.tsx`: Registration page with GCC countries (+971 UAE, +966 KSA, Qatar, Oman, Kuwait, Bahrain, India), syllabus/curriculum selector.
- [x] `exam/[attemptId]/page.tsx`: Full-screen secure exam player.
- [x] `result/[attemptId]/page.tsx`: Scholarship certificate and performance analytics.
- [x] `admin/page.tsx`: Control center to monitor candidate registrations & test submissions.

### Step 5: Verification & Quality Assurance
- [x] Verify Prisma schema generation (`npx prisma generate --schema=prisma/levelup.prisma`).
- [x] Run `npx tsc --noEmit` to ensure zero TypeScript errors (PASSED with Exit Code 0).
