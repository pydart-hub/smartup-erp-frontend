# Task: Remove All Branch Download, Plans & SortBy, Keep Only Branch-Wise Excel Download

## Objective
Update `/dashboard/curriculum-dept/exam-corner/subject-ranking` according to user requirements:
1. Remove all-branch download option (the top Print button).
2. Remove Plans filter and Sort By filter.
3. Keep download capability only branch-wise.
4. Replace Print with an Excel (.xlsx) download option in the branch-wise view.

## Implementation Steps
- [x] 1. Update state and sorting logic in `ExamSubjectRankingPage`:
  - Remove `selectedPlanFilter` and `rankingSortBy` state.
  - Set default branch ranking sort to highest pass rate.
  - Add `isExportingExcel` state and `handleExportExcel` function with `exceljs`.
- [x] 2. Update All-Branch Leaderboard header:
  - Remove `Plan` dropdown, `Sort By` dropdown, and `Print` button.
- [x] 3. Update Branch Drill-Down header:
  - Remove `Plan` dropdown.
  - Replace `Print Report` button with `Excel Download` button with loading state.
- [x] 4. Verify TypeScript compilation (`npx tsc --noEmit` exited with code 0).
- [ ] 5. Push to Git and deploy to production server.
- [ ] 6. Verify production cluster.
