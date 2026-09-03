# Task: Add Batch All Students List with Admission Date, Total Fee, Paid Fee & Download

- [x] Update `DuesTodayStudentRow` interface in `src/lib/api/director.ts` <!-- id: 0 -->
- [x] Update `/api/fees/dues-till-today/route.ts` to calculate total_fee, paid_fee, admission_date, and return all batch students <!-- id: 1 -->
- [x] Update `src/app/dashboard/director/dues/[branch]/[classId]/[batch]/page.tsx` with viewMode toggle, fee stats, admission date & CSV download <!-- id: 2 -->
- [x] Run `npx tsc --noEmit` to verify type safety <!-- id: 3 -->
- [x] Commit, push to `origin main`, and run `deploy.sh` on production server <!-- id: 4 -->
- [x] Verify server health across all 4 cluster instances <!-- id: 5 -->
