# Exam & Mark Entry System — Detailed Implementation Plan

> Generated: 2026-04-08  
> Status: PLAN ONLY — Awaiting user approval before implementation

---

## 1. BACKEND DISCOVERY SUMMARY

### What Already Exists on Frappe (Empty, No Data)

The Frappe Education module ships with a **complete assessment framework** already installed on your backend. All doctypes exist but have **ZERO data** — they've never been used.

#### Assessment Plan (the "Exam" doctype)
| Field | Type | Link To | Required |
|-------|------|---------|----------|
| `student_group` | Link | Student Group | ✅ |
| `assessment_name` | Data | — | ❌ |
| `assessment_group` | Link | Assessment Group | ✅ |
| `grading_scale` | Link | Grading Scale | ✅ |
| `program` | Link | Program | ❌ |
| `course` | Link | Course | ✅ |
| `academic_year` | Link | Academic Year | ❌ |
| `academic_term` | Link | Academic Term | ❌ |
| `schedule_date` | Date | — | ✅ |
| `room` | Link | Room | ❌ |
| `examiner` | Link | Instructor | ❌ |
| `examiner_name` | Data | — | ❌ |
| `from_time` | Time | — | ✅ |
| `to_time` | Time | — | ✅ |
| `supervisor` | Link | Instructor | ❌ |
| `supervisor_name` | Data | — | ❌ |
| `maximum_assessment_score` | Float | — | ✅ |
| `assessment_criteria` | Table (child) | Assessment Plan Criteria | ✅ |

#### Assessment Plan Criteria (child table of Assessment Plan)
| Field | Type | Link To | Required |
|-------|------|---------|----------|
| `assessment_criteria` | Link | Assessment Criteria | ✅ |
| `maximum_score` | Float | — | ✅ |

#### Assessment Result (the "Mark Sheet" doctype)
| Field | Type | Link To | Required |
|-------|------|---------|----------|
| `assessment_plan` | Link | Assessment Plan | ✅ |
| `program` | Link | Program | ❌ |
| `course` | Link | Course | ❌ |
| `academic_year` | Link | Academic Year | ❌ |
| `academic_term` | Link | Academic Term | ❌ |
| `student` | Link | Student | ✅ |
| `student_name` | Data | — | ❌ |
| `student_group` | Link | Student Group | ❌ |
| `assessment_group` | Link | Assessment Group | ❌ |
| `grading_scale` | Link | Grading Scale | ❌ |
| `details` | Table (child) | Assessment Result Detail | ✅ |
| `maximum_score` | Float | — | ❌ |
| `total_score` | Float | — | ❌ |
| `grade` | Data | — | ❌ |
| `comment` | Small Text | — | ❌ |

#### Assessment Result Detail (child table of Assessment Result)
| Field | Type | Link To | Required |
|-------|------|---------|----------|
| `assessment_criteria` | Link | Assessment Criteria | ✅ |
| `maximum_score` | Float | — | ❌ |
| `score` | Float | — | ✅ |
| `grade` | Data | — | ❌ |

#### Assessment Criteria (master list)
| Field | Type | Required |
|-------|------|----------|
| `assessment_criteria` | Data | ✅ |
| `assessment_criteria_group` | Link → Assessment Criteria Group | ❌ |

#### Grading Scale + Intervals
| Grading Scale Fields | Type | Required |
|---------------------|------|----------|
| `grading_scale_name` | Data | ✅ |
| `description` | Small Text | ❌ |
| `intervals` | Table (child) → Grading Scale Interval | ✅ |

| Grading Scale Interval | Type | Required |
|-----------------------|------|----------|
| `grade_code` | Data | ✅ |
| `threshold` | Percent | ✅ |
| `grade_description` | Small Text | ❌ |

#### Assessment Group (tree structure)
| Field | Type |
|-------|------|
| `assessment_group_name` | Data |
| `parent_assessment_group` | Link → Assessment Group |
| `is_group` | Check |

**Existing data:** Only `"All Assessment Groups"` (root) and `"Test"` exist.

### No Custom Fields
There are **no custom fields** on Assessment Plan or Assessment Result. We'll need to add `custom_branch` (Link → Company) to both for multi-branch scoping.

---

## 2. WHAT WE NEED TO DO ON THE BACKEND (Seed Data + Custom Fields)

### Step 1: Create Custom Fields (via API)
We need to add branch scoping to the assessment doctypes, just like other SmartUp doctypes:

```
Assessment Plan → custom_branch (Link → Company)
Assessment Result → custom_branch (Link → Company)
```

### Step 2: Seed Assessment Criteria
Create the standard assessment criteria that SmartUp will use:

| Criteria Name | Use Case |
|--------------|----------|
| `Theory` | Written exam marks (only criteria needed) |

### Step 3: Seed Grading Scale
Create a standard grading scale (Indian CBSE/State pattern):

| Grade | Threshold (≥%) | Description |
|-------|----------------|-------------|
| A+ | 90 | Outstanding |
| A | 80 | Excellent |
| B+ | 70 | Very Good |
| B | 60 | Good |
| C+ | 50 | Above Average |
| C | 40 | Average |
| D | 33 | Below Average |
| F | 0 | Fail |

### Step 4: Seed Assessment Groups
Create a hierarchy for exam types:

```
All Assessment Groups (root, exists)
├── Unit Test
│   ├── Unit Test 1
│   ├── Unit Test 2
│   └── Unit Test 3
├── Quarterly Exam
├── Half Yearly Exam
└── Annual Exam
```

### Step 5: Register in Proxy Scoping
Add to `COMPANY_SCOPED_DOCTYPES` in the proxy:
```typescript
"Assessment Plan": "custom_branch",
"Assessment Result": "custom_branch",
```

---

## 3. SYSTEM ARCHITECTURE

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ SETUP (One-time by Admin/Director)                              │
│                                                                  │
│  Assessment Criteria → Grading Scale → Assessment Groups        │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ EXAM CREATION (Branch Manager / Instructor)                     │
│                                                                  │
│  Select: Student Group + Course + Assessment Group              │
│       → Set: Date, Time, Max Score, Criteria breakdown          │
│       → Creates: Assessment Plan (docstatus=1 submitted)        │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ MARK ENTRY (Instructor / Teacher)                               │
│                                                                  │
│  For each student in batch:                                      │
│       → Enter score per Assessment Criteria                     │
│       → Auto-calculate: total_score, grade (from grading scale) │
│       → Creates: Assessment Result (docstatus=1 submitted)      │
│       → One Assessment Result PER student PER Assessment Plan   │
└──────────────────────────────────┬──────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ RESULT GENERATION & RANKING (Automatic)                         │
│                                                                  │
│  Frontend computes from submitted Assessment Results:           │
│       → Per-student totals across all subjects                  │
│       → Percentage = (total_score / maximum_score) × 100        │
│       → Rank within batch (by total %, with tie-breaking)       │
│       → Grade from Grading Scale intervals                      │
│       → Pass/Fail status (threshold: 33% per subject)           │
└─────────────────────────────────────────────────────────────────┘
```

### Role Responsibilities

| Role | Can Do |
|------|--------|
| **Director** | View all exam results across branches; analytics & leaderboard |
| **Branch Manager** | Create exams; view results for branch; approve/publish results |
| **Instructor** | Create exams for assigned batches; enter marks; view results |

---

## 4. FRONTEND IMPLEMENTATION PLAN

### Phase 1: Types & API Layer

#### 4.1 New Type Definitions — `src/lib/types/assessment.ts`

```typescript
// Assessment Criteria (master)
interface AssessmentCriteria {
  name: string;
  assessment_criteria: string;
  assessment_criteria_group?: string;
}

// Grading Scale
interface GradingScaleInterval {
  grade_code: string;
  threshold: number;   // percentage threshold (e.g., 90 means ≥90%)
  grade_description?: string;
}

interface GradingScale {
  name: string;
  grading_scale_name: string;
  description?: string;
  intervals: GradingScaleInterval[];
}

// Assessment Group (exam type)
interface AssessmentGroup {
  name: string;
  assessment_group_name: string;
  parent_assessment_group?: string;
  is_group: 0 | 1;
}

// Assessment Plan Criteria (child table on Assessment Plan)
interface AssessmentPlanCriteria {
  assessment_criteria: string;  // Link name
  maximum_score: number;
}

// Assessment Plan (the Exam)
interface AssessmentPlan {
  name: string;
  student_group: string;
  assessment_name?: string;
  assessment_group: string;
  grading_scale: string;
  program?: string;
  course: string;
  academic_year?: string;
  academic_term?: string;
  schedule_date: string;
  room?: string;
  examiner?: string;
  examiner_name?: string;
  from_time: string;
  to_time: string;
  supervisor?: string;
  supervisor_name?: string;
  maximum_assessment_score: number;
  assessment_criteria: AssessmentPlanCriteria[];
  custom_branch?: string;
  docstatus: 0 | 1 | 2;
}

// Assessment Result Detail (child table on Assessment Result)
interface AssessmentResultDetail {
  assessment_criteria: string;
  maximum_score?: number;
  score: number;
  grade?: string;
}

// Assessment Result (per student per exam)
interface AssessmentResult {
  name: string;
  assessment_plan: string;
  program?: string;
  course?: string;
  academic_year?: string;
  academic_term?: string;
  student: string;
  student_name?: string;
  student_group?: string;
  assessment_group?: string;
  grading_scale?: string;
  details: AssessmentResultDetail[];
  maximum_score?: number;
  total_score?: number;
  grade?: string;
  comment?: string;
  custom_branch?: string;
  docstatus: 0 | 1 | 2;
}

// Computed types (frontend-only, for result display)
interface StudentExamResult {
  student: string;
  student_name: string;
  subjects: {
    course: string;
    score: number;
    maximum_score: number;
    percentage: number;
    grade: string;
    passed: boolean;
  }[];
  total_score: number;
  total_maximum: number;
  overall_percentage: number;
  overall_grade: string;
  rank: number;
  passed: boolean;  // all subjects ≥ 33%
}
```

#### 4.2 New API Module — `src/lib/api/assessment.ts`

Functions needed:
```
// Master data
getAssessmentCriteria()           → list all criteria
getGradingScales()                → list grading scales
getGradingScale(name)             → single scale with intervals
getAssessmentGroups()             → list exam types

// Assessment Plans (Exams)
getAssessmentPlans(filters)       → list exams (by branch, program, course, group, date range)
getAssessmentPlan(name)           → single exam with criteria child table
createAssessmentPlan(data)        → create exam
submitAssessmentPlan(name)        → submit (docstatus=1)

// Assessment Results (Marks)
getAssessmentResults(filters)     → list results (by plan, student, student_group)
getAssessmentResult(name)         → single result with details
createAssessmentResult(data)      → create single student result
submitAssessmentResult(name)      → submit (docstatus=1)
bulkCreateAssessmentResults(plan, results[]) → batch create for all students  
```

### Phase 2: Backend API Routes

#### 4.3 Custom API Routes (Server-Side with Admin Token)

**`/api/exams/create` (POST)** — Create Assessment Plan + auto-submit
```
Body: { student_group, course, assessment_group, grading_scale,
        schedule_date, from_time, to_time, maximum_assessment_score,
        criteria: [{name, max_score}], examiner?, room? }
→ Creates Assessment Plan via Frappe
→ Auto-populates: program (from student group), academic_year, custom_branch
→ Submits (docstatus=1)
→ Returns: created plan
```

**`/api/exams/marks` (POST)** — Bulk save marks for an exam
```
Body: { assessment_plan, marks: [{ student, scores: [{criteria, score}] }] }
→ For each student:
   - Creates Assessment Result with details[] child table
   - Auto-calculates total_score from sum of scores
   - Auto-calculates grade from grading scale intervals
   - Submits (docstatus=1)
→ Returns: { created: count, errors: [] }
```

**`/api/exams/results` (GET)** — Get results for an exam or batch
```
Query: ?assessment_plan=X  OR  ?student_group=X&assessment_group=X
→ Fetches all Assessment Results for the filter
→ Returns: results with student details, scores, grades
```

**`/api/exams/report-card` (GET)** — Generate full report card for student
```
Query: ?student=X&assessment_group=X  (e.g., "Half Yearly Exam")
→ Fetches ALL Assessment Results for this student + exam group
→ Aggregates across subjects
→ Computes: per-subject scores, totals, percentage, grade, rank in batch
→ Returns: StudentExamResult
```

**`/api/exams/batch-results` (GET)** — Batch-level result summary with ranks
```
Query: ?student_group=X&assessment_group=X
→ Fetches ALL Assessment Results for the batch + exam group
→ For each student: aggregates all subjects, computes total, percentage
→ Sorts by percentage DESC → assigns ranks (handles ties)
→ Returns: StudentExamResult[] with ranks
```

**`/api/exams/setup` (POST)** — Seed initial data (one-time admin action)
```
Body: { action: "seed-criteria" | "seed-grading-scale" | "seed-assessment-groups" }
→ Creates the master data described in Section 2
```

### Phase 3: Frontend Pages

#### 4.4 Branch Manager Pages

**`/dashboard/branch-manager/exams/page.tsx`** — Exam Dashboard
```
- Stats cards: Total exams created, Marks entered, Pending mark entry
- Filter: Assessment Group (Unit Test 1, Quarterly, etc.), Program, Date range
- Table: List of Assessment Plans with status indicators
  - Columns: Exam Name, Course, Batch, Date, Examiner, Status (marks entered / pending)
- Action: "Create Exam" button → navigates to create page
```

**`/dashboard/branch-manager/exams/create/page.tsx`** — Create Exam
```
- Form fields:
  1. Student Group (dropdown, filtered by branch — reuse existing batch selector)
  2. Course (dropdown, filtered by program of selected batch)
  3. Assessment Group (dropdown: Unit Test 1, Quarterly, Half Yearly, Annual)
  4. Grading Scale (dropdown, usually just one "SmartUp Grading Scale")
  5. Schedule Date (date picker)
  6. From Time / To Time
  7. Max Score (number, e.g., 100)
  8. Assessment Criteria breakdown:
     - Table: criteria name + max score per criteria
     - Example: Theory=80, Practical=20 (must sum to Max Score)
  9. Examiner (optional, instructor dropdown)
  10. Room (optional)
- On submit → POST /api/exams/create
- Pattern: Same as course-schedule/new page
```

**`/dashboard/branch-manager/exams/[id]/page.tsx`** — Exam Detail + Mark Entry
```
- Shows exam details (course, batch, date, criteria)
- Table of all students in the batch:
  - Pre-populated from Student Group members
  - Columns: Roll No, Student Name, [criteria1 score], [criteria2 score], Total, Grade
  - Editable score inputs (number fields with max validation)
  - Auto-calculates total and grade as marks are entered
- "Save Marks" button → POST /api/exams/marks
- Status indicator: ✅ all marks entered / ⚠️ X students pending
- Pattern: Same as attendance page (bulk entry for all students)
```

**`/dashboard/branch-manager/exams/results/page.tsx`** — Results Dashboard
```
- Filter: Assessment Group, Program, Batch
- Table: Batch-wide results with ranks
  - Columns: Rank, Student, Total Marks, Percentage, Grade, Pass/Fail
  - Row click → individual report card view
- Summary stats: Batch average, highest/lowest, pass %, grade distribution chart
- Export to CSV/Excel
```

#### 4.5 Instructor Pages

**`/dashboard/instructor/exams/page.tsx`** — Instructor Exam Dashboard
```
- Shows only exams where instructor is examiner OR assigned to the batch
- Scoped via useInstructorBatches() hook (same as attendance)
- Two sections:
  1. "Pending Mark Entry" — exams created but marks not yet entered
  2. "Completed" — exams with all marks submitted
- Click exam → navigates to mark entry page
```

**`/dashboard/instructor/exams/[id]/page.tsx`** — Mark Entry (Instructor)
```
- Same layout as Branch Manager mark entry
- But scoped to instructor's assigned batches only
- Cannot create new exams (only enter marks for existing plans)
  OR
- Can create exams for their own batches (configurable)
```

**`/dashboard/instructor/exams/results/page.tsx`** — View Results
```
- Read-only view of results for instructor's batches
- Same table as branch manager but no edit capability
```

#### 4.6 Director Pages

**`/dashboard/director/exams/page.tsx`** — Cross-Branch Exam Analytics
```
- Overview across all branches:
  - Exams conducted per branch
  - Average scores per branch / program
  - Pass rate comparison
- Drill-down: Branch → Program → Batch → Student
- Charts: Grade distribution, subject-wise performance
```

### Phase 4: Result Generation & Ranking Logic

#### 4.7 Result Computation (Frontend Utility)

**File: `src/lib/utils/examResults.ts`**

```typescript
// Grade calculation from grading scale
function calculateGrade(percentage: number, intervals: GradingScaleInterval[]): string {
  // Sort intervals by threshold DESC
  // Return first grade where percentage >= threshold
}

// Rank calculation for a batch
function calculateRanks(results: StudentExamResult[]): StudentExamResult[] {
  // Sort by overall_percentage DESC
  // Assign ranks (1-based)
  // Handle ties: same rank for same percentage, skip next rank
  // e.g., 1, 2, 2, 4 (not 1, 2, 2, 3)
}

// Pass/Fail determination
function isSubjectPassed(percentage: number): boolean {
  return percentage >= 33;  // Indian standard: 33% per subject
}

function isOverallPassed(subjects: SubjectResult[]): boolean {
  return subjects.every(s => isSubjectPassed(s.percentage));
}

// Aggregate results across subjects for a student
function aggregateStudentResults(
  student: string,
  results: AssessmentResult[],
  plans: AssessmentPlan[],
  gradingScale: GradingScale
): StudentExamResult {
  // Map each result → subject score
  // Sum totals, compute percentage, determine grade and pass/fail
}

// Full batch result with ranks
function generateBatchResults(
  studentGroup: string,
  assessmentGroup: string,
  results: AssessmentResult[],
  plans: AssessmentPlan[],
  gradingScale: GradingScale
): StudentExamResult[] {
  // 1. Group results by student
  // 2. Aggregate per student
  // 3. Calculate ranks
  // 4. Sort by rank
}
```

---

## 5. IMPLEMENTATION ORDER (PHASES)

### Phase 1: Backend Setup (1 session)
- [ ] Add `custom_branch` custom field to Assessment Plan + Assessment Result
- [ ] Seed Assessment Criteria (Theory, Practical, Internal Assessment, Viva)
- [ ] Seed Grading Scale (A+ to F with Indian thresholds)
- [ ] Seed Assessment Groups (Unit Tests, Quarterly, Half Yearly, Annual)
- [ ] Add Assessment Plan + Result to proxy's `COMPANY_SCOPED_DOCTYPES`

### Phase 2: Types + API Layer (1 session)
- [ ] Create `src/lib/types/assessment.ts`
- [ ] Create `src/lib/api/assessment.ts`
- [ ] Create API routes:
  - [ ] `/api/exams/create`
  - [ ] `/api/exams/marks`
  - [ ] `/api/exams/results`
  - [ ] `/api/exams/report-card`
  - [ ] `/api/exams/batch-results`

### Phase 3: Branch Manager Pages (2 sessions)
- [ ] Exam dashboard page (`/dashboard/branch-manager/exams/`)
- [ ] Create exam page (`/dashboard/branch-manager/exams/create/`)
- [ ] Mark entry page (`/dashboard/branch-manager/exams/[id]/`)
- [ ] Results dashboard (`/dashboard/branch-manager/exams/results/`)
- [ ] Add "Exams" to branch manager sidebar navigation

### Phase 4: Instructor Pages (1 session)
- [ ] Instructor exam dashboard (`/dashboard/instructor/exams/`)
- [ ] Instructor mark entry (`/dashboard/instructor/exams/[id]/`)
- [ ] Instructor results view (`/dashboard/instructor/exams/results/`)
- [ ] Add "Exams" to instructor sidebar navigation

### Phase 5: Director Analytics (1 session)
- [ ] Director exam analytics (`/dashboard/director/exams/`)
- [ ] Cross-branch comparisons
- [ ] Add "Exams" to director sidebar navigation

### Phase 6: Result Utilities + Report Card (1 session)
- [ ] `src/lib/utils/examResults.ts` — grade, rank, pass/fail logic
- [ ] Report card view (per student)
- [ ] CSV/Excel export for batch results
- [ ] Print-friendly report card format

---

## 6. KEY DESIGN DECISIONS

### Q1: Should instructors create exams or only enter marks?
**Decision:** Both. Instructors can create exams AND enter marks for their assigned batches (same pattern as course schedule). Branch managers can also create exams for any batch in their branch.

### Q2: How to handle multi-criteria exams (Theory + Practical)?
**Decision:** Theory exams only. Single assessment criteria "Theory" per exam. One score input per student (no multi-criteria breakdown). The `assessment_criteria` child table will have a single row: `{ assessment_criteria: "Theory", maximum_score: <max> }`.

### Q3: How are ranks computed?
**Answer:** Frontend computes ranks from submitted Assessment Results. For a given Assessment Group (e.g., "Half Yearly"):
1. Fetch ALL Assessment Plans for that group + batch
2. Fetch ALL Assessment Results for those plans
3. Sum total_score per student across ALL subjects
4. Rank by percentage (total_score / total_maximum × 100)
5. Ties get same rank, next rank skips (1, 2, 2, 4)

### Q4: Per-subject pass/fail or overall?
**Answer:** Both. Indian system: student must score ≥33% in EACH subject independently. Overall pass = passed ALL subjects. Overall grade = based on aggregate percentage.

### Q5: Custom fields needed on backend?
**Answer:** Only `custom_branch` on Assessment Plan + Assessment Result. Everything else uses existing Frappe Education fields.

### Q6: Printable PDF Report Card?
**Decision:** Yes. Need printable PDF report cards per student. Will generate via browser print CSS or a dedicated PDF generation route.

### Q7: DocType submission workflow?
**Answer:**
- Assessment Plan: Created as draft → submitted immediately (docstatus=1)  
- Assessment Result: Created as draft → submitted after marks entered (docstatus=1)
- Submitted = immutable. To edit marks, amend (cancel + create new).

### Q7: How does this integrate with existing attendance/schedule system?
**Answer:** 
- Exams are for a **Student Group** (batch), same as attendance
- Exams are for a **Course**, same as course schedule
- **Examiner** is an **Instructor**, same as course schedule assignment
- Branch scoping via `custom_branch`, same as all other doctypes
- Instructor access via `useInstructorBatches()`, same as attendance

---

## 7. UI MOCKUP DESCRIPTIONS

### Mark Entry Page (Core UX)
```
┌──────────────────────────────────────────────────────┐
│ ← Back to Exams                                       │
│                                                        │
│ 📝 10th Mathematics — Unit Test 1                     │
│ Batch: Chullickal-10th State-A | Date: 2026-04-15    │
│ Max Score: 100 (Theory only)                          │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ #  │ Student Name      │ Score/100 │ Grade │
│ │────┼───────────────────┼───────────┼───────│
│ │ 1  │ Arun Kumar        │ [90    ]  │  A+   │
│ │ 2  │ Divya S           │ [80    ]  │  A    │
│ │ 3  │ Rahul M           │ [57    ]  │  B    │
│ │ 4  │ Sneha R           │ [     ]   │   —   │
│ │ ...│                   │           │         │       │       │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ 📊 Progress: 38/42 students entered                   │
│ ┌──────────────┐  ┌─────────────┐                     │
│ │  Save Draft  │  │ Submit All  │                     │
│ └──────────────┘  └─────────────┘                     │
└──────────────────────────────────────────────────────┘
```

### Results Page (Batch View)
```
┌──────────────────────────────────────────────────────┐
│ 🏆 Half Yearly Exam Results                          │
│ Batch: Chullickal-10th State-A                        │
│                                                        │
│ Filter: [Assessment Group ▾] [Program ▾] [Batch ▾]  │
│                                                        │
│ 📊 Summary                                            │
│ ┌──────────┬──────────┬──────────┬──────────┐        │
│ │ Students │ Pass Rate│ Avg %    │ Highest  │        │
│ │   42     │  88.1%   │  67.3%   │  96.2%   │        │
│ └──────────┴──────────┴──────────┴──────────┘        │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ Rank│ Student    │ Math │ Sci │ Eng │ Total│  %  │ Grade│
│ │─────┼────────────┼──────┼─────┼─────┼──────┼─────┼──────│
│ │  1  │ Arun K     │  90  │ 88  │ 92  │ 540  │96.2 │ A+   │
│ │  2  │ Divya S    │  80  │ 85  │ 78  │ 486  │86.4 │ A    │
│ │  3  │ Rahul M    │  57  │ 62  │ 71  │ 382  │68.0 │ B+   │
│ │ ... │            │      │     │     │      │     │      │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ [📥 Export CSV]  [🖨️ Print Report Cards]              │
└──────────────────────────────────────────────────────┘
```

---

## 8. FILES TO CREATE / MODIFY

### New Files
| File | Purpose |
|------|---------|
| `src/lib/types/assessment.ts` | TypeScript types for all assessment doctypes |
| `src/lib/api/assessment.ts` | Client-side API functions |
| `src/lib/utils/examResults.ts` | Grade, rank, pass/fail computation utilities |
| `src/app/api/exams/create/route.ts` | Server-side exam creation endpoint |
| `src/app/api/exams/marks/route.ts` | Server-side bulk mark entry endpoint |
| `src/app/api/exams/results/route.ts` | Server-side results query endpoint |
| `src/app/api/exams/report-card/route.ts` | Server-side report card endpoint |
| `src/app/api/exams/batch-results/route.ts` | Server-side batch results + ranks |
| `src/app/api/exams/setup/route.ts` | One-time seed data endpoint |
| `src/app/dashboard/branch-manager/exams/page.tsx` | BM exam dashboard |
| `src/app/dashboard/branch-manager/exams/create/page.tsx` | BM create exam |
| `src/app/dashboard/branch-manager/exams/[id]/page.tsx` | BM mark entry |
| `src/app/dashboard/branch-manager/exams/results/page.tsx` | BM results view |
| `src/app/dashboard/instructor/exams/page.tsx` | Instructor exam dashboard |
| `src/app/dashboard/instructor/exams/[id]/page.tsx` | Instructor mark entry |
| `src/app/dashboard/instructor/exams/results/page.tsx` | Instructor results |
| `src/app/dashboard/director/exams/page.tsx` | Director analytics |

### Files to Modify
| File | Change |
|------|--------|
| `src/app/api/proxy/[...path]/route.ts` | Add Assessment Plan + Result to COMPANY_SCOPED_DOCTYPES |
| Navigation sidebar component(s) | Add "Exams" menu item for all 3 roles |
| `src/middleware.ts` | No changes needed (existing role-based routing covers new paths) |

---

## 9. RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| Frappe Assessment Plan requires `assessment_group` and `grading_scale` (mandatory) | Seed these first; create API that auto-fills defaults |
| No `custom_branch` on assessment doctypes | Add via Custom Field API before any data creation |
| Mark entry for 60+ students could be slow | Use bulk create endpoint; batch API calls |
| Grade calculation edge cases (ties, absent students) | Handle "absent" as score=0 with a flag; tie-breaking by roll number |
| Instructor permission to create Assessment Plans | Verify Frappe User Permissions allow it; may need Server Script |
| Large result sets for director analytics | Paginate; cache with React Query staleTime |

---

## 10. DECISIONS CONFIRMED

1. **Exam types**: Unit Test (1, 2, 3), Quarterly, Half Yearly, Annual ✅
2. **Grading scale**: A+ to F (Indian standard thresholds) ✅
3. **Pass mark**: 33% per subject ✅
4. **Instructors**: Can BOTH create exams AND enter marks ✅
5. **Assessment criteria**: Theory only (single score per student per exam) ✅
6. **Report card**: Printable PDF report cards needed ✅
7. **Academic Term**: Using Assessment Groups for categorization (not Academic Terms) ✅
