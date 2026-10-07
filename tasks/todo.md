# Subject-Wise Hierarchy Navigation Implementation Plan

## Overview
Implement a new Subject-Wise navigation flow in the Teacher Ranking page (`src/app/dashboard/curriculum-dept/subject-performance/page.tsx`).
Users can select a subject, view branches offering that subject, drill down into classes/batches within the branch, and view class-level performance and student/teacher breakdowns.

## Proposed Flow
1. **Menu Mode**: Add 3rd option card: "Subject-Wise Ranking" (and clarify existing as "Branch-Wise Ranking").
2. **Subject-Wise Mode**:
   - **Level 1 (All Subjects)**: List all subjects across the organization with stats (branches offering it, pass rate, exams count).
   - **Level 2 (Branches for selected Subject)**: List branches offering the selected subject with branch-level pass rate, exams, and classes count.
   - **Level 3 (Classes/Batches for selected Branch & Subject)**: List student groups/batches taking this subject with class pass rate, exams, examinees count, and teacher details.
   - **Level 4 (Class Deep Dive / Student & Teacher Breakdown)**: Show detailed student marks/grade distribution, exam-wise breakdown, and instructor performance for that class.

## Checklist
- [x] Step 1: Create dedicated component or integrate modular views in `src/app/dashboard/curriculum-dept/subject-performance/page.tsx` for the Subject-Wise drilldown.
- [x] Step 2: Implement aggregation hooks/memos for organization-wide subjects, subject branches, and branch classes.
- [x] Step 3: Implement smooth animated breadcrumb navigation across the levels (All Subjects -> Branches -> Classes -> Class Details).
- [x] Step 4: Run typecheck `npx tsc --noEmit` and verify no regressions (exited 0).
- [ ] Step 5: Test and commit changes, then deploy to server per standard procedure.
