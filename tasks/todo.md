# Task: Implement Criteria Filter & Performance Analysis in Subject Ranking (Exam Corner)

## Objective
Add the student filter dropdown (Full Marks, 90% & Above, etc.) and the comprehensive Performance Analysis count/names table to the Exam Subject Ranking page (`/dashboard/curriculum-dept/exam-corner/subject-ranking`), matching the pattern and design established in the Class Performance page.

## Implementation Steps
- [x] 1. Define Filter Options (`filterOptions`) and state (`selectedFilter`) in `ExamSubjectRankingPage`.
- [x] 2. Update `drillDownDetails` calculation to compute:
  - Ranked students list.
  - Filtered students list based on `selectedFilter`.
  - Always compute full Performance Analysis summary rows (`criteria`, `count`, `names`, `percentage`, `isPct`) over the entire branch student cohort.
- [x] 3. Update drill-down UI header:
  - Add "FILTER STUDENTS" dropdown selector with clear active indicator.
  - Show clear count of `"Showing X of Y students"` when a filter is applied.
  - Quick "Clear Filter (Show All)" action button.
- [x] 4. Render the Performance Analysis table under the student rankings table with the exact styling (Analysis, Count, Names, % of Class / Branch).
- [x] 5. Verify build and type checks (`npx tsc --noEmit` exited with code 0).
