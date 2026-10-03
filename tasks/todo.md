# Task: Remove All Branch Download, Plans & SortBy, Keep Only Branch-Wise Excel Download

## Objective
Update `/dashboard/curriculum-dept/exam-corner/subject-ranking` according to user requirements:
1. Remove all-branch download option (the top Print button).
2. Remove Plans filter and Sort By filter.
3. Keep download capability only branch-wise.
4. Replace Print with an Excel (.xlsx) download option in the branch-wise view.

## Implementation Steps
- [x] 1. Update state and sorting logic in `ExamSubjectRankingPage`:
  - Removed `selectedPlanFilter` and `rankingSortBy` state.
  - Set default branch ranking sort to highest pass rate.
  - Added `isExportingExcel` state and `handleExportExcel` function with `exceljs`.
- [x] 2. Update All-Branch Leaderboard header:
  - Removed `Plan` dropdown, `Sort By` dropdown, and `Print` button.
- [x] 3. Update Branch Drill-Down header:
  - Removed `Plan` dropdown.
  - Replaced `Print Report` button with `Download Excel` button with loading state.
- [x] 4. Verify TypeScript compilation (`npx tsc --noEmit` exited with code 0).
- [x] 5. Push to Git and deploy to production server (`commit 2a6d7a0`).
- [x] 6. Verify production cluster health across all 4 nodes (`3001`, `3005`, `3006`, `3007`) and public domain.
