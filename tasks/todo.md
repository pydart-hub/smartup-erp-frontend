# Task: Isolate Diagnosis Exams from Scholarship Data Without Data Loss

- [x] 1. Create a centralized helper in `src/lib/utils/diagnosis.ts` (`DIAGNOSIS_EXAM_PUBLISHING_FILTER` & `isTuitionDiagnosisAttempt`) <!-- id: 1 -->
- [x] 2. Update Director Diagnosis Exam pages to filter out scholarship attempts at the Prisma query level: <!-- id: 2 -->
  - `src/app/dashboard/director/diagnosis-exams/page.tsx`
  - `src/app/dashboard/director/diagnosis-exams/report/page.tsx`
  - `src/app/dashboard/director/diagnosis-exams/class-report/page.tsx`
- [x] 3. Update General Manager Diagnosis Exam pages similarly: <!-- id: 3 -->
  - `src/app/dashboard/general-manager/diagnosis-exams/page.tsx`
  - `src/app/dashboard/general-manager/diagnosis-exams/report/page.tsx`
  - `src/app/dashboard/general-manager/diagnosis-exams/class-report/page.tsx`
- [x] 4. Add UI-level defensive filtering in `DiagnosisExamsDrillDown.tsx` and `DiagnosisExamsReport.tsx` to guarantee non-branch districts never appear as tuition branch cards <!-- id: 4 -->
- [x] 5. Verify that `/scholar/admin` still accesses all scholarship records and registrations with 100% data fidelity <!-- id: 5 -->
- [x] 6. Run TypeScript check `npx tsc --noEmit` and verify no compilation or runtime errors <!-- id: 6 -->
- [x] 7. Document results and verification in `tasks/todo.md` and walkthrough <!-- id: 7 -->

## Review & Verification Results
- **Prisma Query Isolation**: All Diagnosis Exam dashboard routes now pass `where: DIAGNOSIS_EXAM_PUBLISHING_FILTER` directly to PostgreSQL, filtering out scholarship publishings at the database level.
- **Defensive Safeguards**: Component-level filters (`isScholarshipAttempt`) ensure any legacy attempts or district values (Ernakulam, Idukki, etc.) are excluded from tuition branch KPI cards and class reports.
- **Zero Data Loss**: No records in `ExamAttempt` or `ScholarRegistration` were modified or deleted. The scholarship portal and `/scholar/admin` retain 100% of student attempts and submissions.
- **Type Safety**: `npx tsc --noEmit` verified with 0 errors.
