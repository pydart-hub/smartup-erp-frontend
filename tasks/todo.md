# Task: Fix Exam Mark Saving CancelledLinkError

- [x] 1. Update `src/lib/api/assessment.ts` to filter out cancelled Assessment Plans (`docstatus != 2`) by default <!-- id: 1 -->
- [x] 2. Update `src/app/api/exams/marks/route.ts` to validate Assessment Plan docstatus and reject/handle cancelled plans gracefully <!-- id: 2 -->
- [x] 3. Update exam detail pages (`instructor/exams/[id]`, `branch-manager/exams/[id]`, `class-incharge/exams/[id]`) to show a warning banner and disable "Save Marks" if an exam is cancelled <!-- id: 3 -->
- [x] 4. Verify TypeScript compilation and build <!-- id: 4 -->
