# Task: Restore Diagnosed Level Display in Diagnosis Exams

- [x] Add `diagnosedLevel?: string | null` and `resultSnapshotJson` support to `AttemptWithPublishing` & `getAttemptLevelBreakdown` in `src/lib/public-exam/diagnostics.ts` <!-- id: 0 -->
- [x] Update `BranchManagerDiagnosisExamsPage` to select `resultSnapshotJson` and map `diagnosedLevel` <!-- id: 1 -->
- [x] Update `DirectorDiagnosisExamsPage` and `GeneralManagerDiagnosisExamsPage` to select `resultSnapshotJson` and map `diagnosedLevel` <!-- id: 2 -->
- [x] Ensure `DiagnosisExamsDrillDown.tsx` uses `attempt.diagnosedLevel` directly <!-- id: 3 -->
- [x] Run `npx tsc --noEmit` to verify type safety <!-- id: 4 -->
- [x] Commit, push to `origin main`, and run `deploy.sh` on the server <!-- id: 5 -->
- [x] Verify server health and diagnosis exams on live cluster <!-- id: 6 -->
