# Implementation Plan: Academic Performance for Academic Planning Department

## Goal
Add the "Academic Performance" of all branches (identical to General Manager & Director view) into the Academic Planning Department sidebar navigation, including the class and batch drill-down pages.

## Tasks
- [x] 1. Add "Academic Performance" navigation item to `ACADEMIC_PLANNING_NAV` in `src/lib/utils/constants.ts`
- [x] 2. Create the Academic Planning Academic Performance page:
  - `src/app/dashboard/academic-planning/academic-performance/page.tsx`
  - `src/app/dashboard/academic-planning/academic-performance/class/page.tsx`
  - `src/app/dashboard/academic-planning/academic-performance/batch/page.tsx`
  - `src/app/dashboard/academic-planning/students/[id]/page.tsx`
- [x] 3. Verify type-checking with `npx tsc --noEmit` (Exited with code 0)
- [x] 4. Confirm seamless integration and report back

## Review
- "Academic Performance" sidebar item added under Academic Planning Department nav.
- All 9 branches comparison, class trajectories, benchmark curves, exam categories, subject-wise breakdowns, class drill-downs, and batch drill-downs are available with role-aware routes.
- Full type-check completed successfully with 0 errors.
