# Add Academic Planning Portion Completion to Director Role & Fix Duplicates

## Background
The Director role needs full visibility into curriculum and syllabus progression across all campus branches. Academic Planning Department currently possesses two key tools:
1. `AcademicPlanningBranchDrilldown` (Campus Overview & 4-level drilldown: Branch -> Class -> Batch -> Subject/Topic).
2. `APDPortionCompletionPage` (Class & Subject Portion Management: Class-wise & Subject-wise curriculum milestones + All-Branches Dashboard + Branch Status Matrix Inspector).

We added "Portion Completion" as a first-class new sidebar navigation item to the Director role, backed by a comprehensive Director Portion Completion view that provides both Campus Overview drilldowns and Class-Wise Curriculum Portion tracking.

Additionally, in Plus One (11th) and Plus Two (12th), portions were appearing twice because subject-wise tuition groups (e.g. `Phy-Chem-11-A`, `Chemistry-11-A`) and 1:1 groups were generating separate portion status records that mapped to the same batch ("Batch A"). We resolved this by filtering out subject-wise and 1:1 groups, keeping only canonical whole-class batch cohorts, and deduplicating portions per batch.

## Todo List
- [x] 1. Add "Portion Completion" to `DIRECTOR_NAV` in `src/lib/utils/constants.ts` with icon `BookOpen` / emoji `📖`.
- [x] 2. Create the Director Portion Completion page at `src/app/dashboard/director/portion-completion/page.tsx`.
  - Executive Director header with tab switcher:
    - Tab 1: **Campus Drilldown** (`AcademicPlanningBranchDrilldown` with quick branch filter).
    - Tab 2: **Curriculum & Milestones** (`APDPortionCompletionPage` with syllabus matrix and modals).
- [x] 3. Create shared student group utility `src/lib/utils/studentGroupUtils.ts`:
  - `isOneToOneStudentGroup` (filters out `STU-` and 1:1 records).
  - `isSubjectWiseStudentGroup` (filters out `Phy-Chem`, `Chem-Maths`, `Chemistry`, `Physics`, `Maths`, `Biology` tuition groups).
  - `isCanonicalBatchGroup` (strictly retains whole-class cohorts).
  - `extractBatchName` (maps batch identifiers cleanly).
- [x] 4. Update `AcademicPlanningBranchDrilldown.tsx`:
  - Exclude 1:1 and subject-wise tuition groups from batch records.
  - Implement batch-level portion deduplication (`branch__class__batch__portionKey`) to guarantee each milestone appears once.
- [x] 5. Update `/api/branch-manager/portions/dashboard/route.ts` & `/api/branch-manager/portions/route.ts`:
  - Exclude 1:1 and subject-wise groups and deduplicate so network rollups and branch counts are not inflated.
- [x] 6. Update `/api/academic-planning/portions/route.ts` & `APDPortionCompletionPage`:
  - Exclude non-canonical groups in `GET` statistics aggregation and prevent future assignment to non-canonical groups in `POST`.
- [x] 7. Verify with `npx tsc --noEmit` (passed with 0 errors).
- [x] 8. Fix overdue tracking and visibility:
  - Add overdue badges to Class cards (Level 2) and Batch cards (Level 3) in both Director/APD drilldown and Branch Manager portion completion.
  - Add dedicated `[ Overdue (X) ]` status filter tab to isolate and view only overdue portions in Level 4.
  - Add overdue alert banner with a single-click "View Overdue Only" shortcut.
