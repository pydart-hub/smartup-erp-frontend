# Tasks

- [x] Inspect existing student_group naming patterns and batch logic <!-- id: 0 -->
- [x] Implement new minimal & hierarchical portion completion UI in `src/app/dashboard/branch-manager/portion-completion/page.tsx` <!-- id: 1 -->
- [x] Convert navigation into Class Cards -> Batch Cards -> Subject Cards <!-- id: 2 -->
- [x] Implement Percentage-Style (0%, 25%, 50%, 75%, 100%) completion tracking with true weighted roll-ups <!-- id: 3 -->
- [x] Convert percentage controls into interactive range sliders with snap points (0%, 25%, 50%, 75%, 100%) <!-- id: 4 -->
- [x] Revert Branch Manager page to only have the clean card slider tracker <!-- id: 5 -->
- [x] Add the minimal All-Branches Dashboard into Academic Planning Dept role (`/dashboard/academic-planning/portion-completion`) <!-- id: 6 -->
- [x] Create dedicated Sidebar for Academic Planning Dept and set Portion Completion as the default landing page upon role switch <!-- id: 7 -->
- [x] Build 4-tier drill-down hierarchy for Instructor Exams (Branch > Class > Batch > Scheduled Exams) <!-- id: 8 -->
- [x] Fix "Weekly Exam" missing in Instructor Exams dropdown and ensure case-insensitive filter matching <!-- id: 9 -->
- [x] Remove 200-record cap on `getAssessmentPlans` so all scheduled exams (e.g. Language1, English, Hindi, Math) load without truncation <!-- id: 10 -->
- [x] Integrate true submitted Assessment Results to label exams as "Marks Entered" vs "Marks Pending" <!-- id: 11 -->
- [x] Add distinct "Marks Entered" and "Marks Pending" count cards to header stats and cards <!-- id: 12 -->
- [x] Verify type checks (`npx tsc --noEmit` exited code 0) <!-- id: 13 -->
