# Add Class and Student Group to Overdue Excel & CSV Exports

## Status: COMPLETED

### Tasks
- [x] 1. Update `src/app/dashboard/director/dues/[branch]/all/page.tsx`:
  - [x] Add `Class` and `Student Group` columns in `exportBranchStudentsExcel`.
  - [x] Update column count from 16 to 18 (merge A1:R1 and A2:R2).
  - [x] Fix title in Row 1 to `${branchName} — All Overdue Students Report` (replace placeholder "Inst. Status").
  - [x] Map `class_name` (cleaned of " Tuition Fee") and `batch_name` into added rows.
  - [x] Verify CSV export headers & rows match cleanly.
- [x] 2. Update `src/app/dashboard/sales-user/fees/overdue/[branch]/all/page.tsx`:
  - [x] Add `Class` and `Student Group` columns in `exportToExcel`.
  - [x] Update column count from 16 to 18 (merge A1:R1 and A2:R2).
  - [x] Fix title in Row 1 to `${shortBranch} — All Overdue Students Report` (replace placeholder "Inst. Status").
  - [x] Map `class_name` (cleaned of " Tuition Fee") and `batch_name` into added rows.
- [x] 3. Verification:
  - [x] Run `npx tsc --noEmit` to ensure zero type errors (passed with code 0).
