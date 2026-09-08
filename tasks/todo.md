# Task: Restrict Exam Scheduling to Curriculum Dept Only

- [x] Remove "+ Create Exam" button and update text in `src/app/dashboard/instructor/exams/page.tsx` <!-- id: 0 -->
- [x] Guard `/dashboard/instructor/exams/create` page route so instructors cannot schedule exams <!-- id: 1 -->
- [x] Add role-based check in `/api/exams/create/route.ts` and `/api/exams/bulk-create/route.ts` to restrict exam creation to Curriculum Dept / authorized roles <!-- id: 2 -->
- [x] Run `npx tsc --noEmit` to verify type check passes cleanly <!-- id: 3 -->
- [x] Verify UI and functionality <!-- id: 4 -->
