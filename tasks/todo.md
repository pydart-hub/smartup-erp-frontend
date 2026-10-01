# Plan: Add Diagnosed Level to Frappe Diagnosis Exams for Students

## Objective
Add the `custom_diagnosed_level` to Frappe's `Assessment Result` DocType, automatically calculate the diagnosed level based on the student's answered questions (identifying the lowest class level where any question was incorrect), backfill existing diagnosis exam results into Frappe, and display the diagnosed level on student profile exam cards.

---

### Step 1: Add Custom Field in Frappe Cloud
- [x] Create `custom_diagnosed_level` on Frappe DocType `Assessment Result` via Frappe REST API:
  - Fieldname: `custom_diagnosed_level`
  - Label: `Diagnosed Level`
  - Fieldtype: `Data`
  - Insert After: `grade`
  - allow_on_submit: 1

### Step 2: Implement Diagnostic Rule Calculation Function
- [x] Ensure or update diagnostic calculation in `src/lib/public-exam/grading.ts`:
  - Find lowest foundation level with incorrect answers.
  - Suffix with ordinal (`5th`, `6th`, `7th`, etc.).

### Step 3: Automated Sync / Backfill Script (Solution 1)
- [x] Created `custom_diagnosed_level` in Frappe with `allow_on_submit: 1`.
- [x] Created `sync_diagnosed_levels_batch` MCP Tool in `src/app/api/mcp/route.ts` to automatically scan Frappe `Assessment Result` records under `Diagnosis Exam`, cross-match with student online attempts in PostgreSQL, extract diagnosed levels, and populate Frappe records.
- [x] Optimized `src/app/api/exams/marks/route.ts` to update `custom_diagnosed_level` in-place on submitted records without needing cancellation or re-creation.

### Step 4: Real-Time Sync on Exam Submission & Marks Entry
- [x] In `src/app/api/public-exam/attempt/[attemptId]/submit/route.ts`:
  - When student submits an exam, calculate diagnosed level and patch Frappe `Assessment Result` if matching record exists.
- [x] In `src/app/api/exams/marks/route.ts`:
  - Allow passing `diagnosed_level` to be saved as `custom_diagnosed_level` on `Assessment Result`.
- [x] In `src/app/dashboard/curriculum-dept/marks-entry/page.tsx`:
  - Render Diagnosed Level column selector for Diagnosis Exam plans and send with saveMarks.

### Step 5: Update Student Performance UI
- [x] In `src/app/api/students/[id]/performance/route.ts`:
  - Include `custom_diagnosed_level` in fields fetched from Frappe `Assessment Result`.
  - Pass it in `SubjectMarkDetail` for frontend.
- [x] In `src/components/students/StudentPerformanceCard.tsx`:
  - Display the `🎯 Diagnosed Level: Xth` badge in the Diagnosis Exam section and expandable subject marks.

### Step 6: Verification
- [x] Run `npx tsc --noEmit` to verify type safety (Exit Code 0).
- [x] Verify Frappe API record for student (e.g. Nuvel John) to confirm `custom_diagnosed_level` is stored (`custom_diagnosed_level: "5th"`).
- [x] Verified zero TypeScript compilation errors.

