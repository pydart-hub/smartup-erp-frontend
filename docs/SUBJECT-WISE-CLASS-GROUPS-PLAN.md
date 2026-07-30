# Subject-Wise Class Groups — Implementation Plan

**Status:** Ready to implement (awaiting command)
**Date:** 2026-05-19

---

## Problem Statement

Subject-wise students (e.g., Plus One Physics) are currently enrolled into the same Student Group as full-program HSS students (e.g., `Kadavanthara-12th Science CBSE-A`). This causes:

- Physics students appear in regular HSS class attendance sheets
- No way to schedule separate classes only for Physics students
- Exams created for a class include subject-wise students mixed in
- `custom_subject` is captured in the admission form but **never saved to Frappe**

---

## Solution: Subject-Specific Student Groups

Create dedicated Student Groups per subject (e.g., `Kadavanthara-Physics-A`) identified by a new `custom_subject` Frappe field. This mirrors the existing O2O (`custom_is_one_to_one`) separation pattern.

---

## Key Concepts

| Feature | Regular Batch | Subject-Wise | O2O |
|---------|--------------|-------------|-----|
| Students per group | Many | Many (10+) | 1 |
| Group created | Pre-created by BM | Pre-created by BM | At admission |
| Identifier | (none) | `custom_subject = "Physics"` | `custom_is_one_to_one = 1` |
| Attendance | Batch (all together) | Batch (all together) | Individual card |
| Scheduling | Regular page | Dedicated subject page | Dedicated O2O page |

---

## How 10 Physics Students End Up in the Same Group

```
BM creates group once:
  Kadavanthara-Physics-A  [custom_subject = "Physics", program = "11th Science CBSE"]

Student 1 admitted → added to Kadavanthara-Physics-A   (1 student)
Student 2 admitted → added to Kadavanthara-Physics-A   (2 students)
...
Student 10 admitted → added to Kadavanthara-Physics-A  (10 students)

BM schedules class for Kadavanthara-Physics-A
→ All 10 Physics students see the class in their schedule

BM marks attendance for Kadavanthara-Physics-A
→ All 10 on one attendance sheet (same flow as regular classes)
```

---

## Subject Group Frappe Document Structure

```
student_group_name: "Kadavanthara-Physics-A"
group_based_on:     "Batch"
program:            "11th Science CBSE"         ← Plus One level
batch:              "Kadavanthara 26-27"
academic_year:      "2026-2027"
custom_branch:      "Smart Up Kadavanthara"
custom_subject:     "Physics"                   ← NEW custom field (the identifier)
```

**Naming convention:** `{BranchName}-{Subject}-{Seq}`
Examples:
- `Kadavanthara-Physics-A`
- `Kadavanthara-Chemistry-A`
- `Vennala-Phy-Chem-A`
- `Kadavanthara-Physics-12-A` (if separate group for Plus Two)

---

## Subjects per Branch (from `feeSchedule.ts`)

```
Kadavanthara:   Physics, Chemistry, Maths
Vennala:        Physics, Chemistry, Maths, Phy-Chem, Phy-Maths, Chem-Maths
Edapally:       (same as SUBJECT_BY_BRANCH config)
Thoppumpady:    Phy-Chem
Tier 1:         Phy-Chem
Eraveli:        Phy-Chem
```

---

## Phase 0 — Frappe Backend (Manual — Admin must do first)

> **REQUIRED before any frontend work can use the filter.**

1. Log in to Frappe admin at `https://smartup.m.frappe.cloud`
2. Go to **Customize Form** → `Student Group`
3. Add new field:
   - **Label:** Subject
   - **Field Name:** `custom_subject`
   - **Field Type:** Data
   - **Required:** No (optional)
   - **In List View:** Yes
4. Save

This one field change is the only backend schema modification needed.

> **Fallback (no backend change):** Use name-pattern matching client-side. Groups with names containing known subject strings (Physics, Chemistry, etc.) can be identified without the field. This is a temporary workaround only.

---

## Phase 1 — Type & API Layer (4 files)

### 1a. `src/lib/types/batch.ts`
- Add `custom_subject?: string` to the `Batch` interface

### 1b. `src/lib/api/batches.ts`
- Add `"custom_subject"` to the `SG_LIST_FIELDS` array
- Add `excludeSubjectGroups?: boolean` param to `getBatches()` — filters out groups where `custom_subject` is set (so regular batch lists stay clean)
- Add `subjectOnly?: boolean` param to `getBatches()` — returns only subject groups

### 1c. `src/lib/api/courseSchedule.ts`
- Add `custom_subject?: string` to `StudentGroupOption` interface
- Add `subjectWiseOnly?: boolean` to `getStudentGroups()` params (mirrors the existing `oneToOneOnly` pattern)
- When `subjectWiseOnly: true`, filter groups where `custom_subject` is not null/empty

### 1d. `src/lib/api/enrollment.ts` (minor)
- Add `"custom_subject"` to the `getStudentGroups` fields list

---

## Phase 2 — Create Subject Group Page (New)

### `src/app/dashboard/branch-manager/batches/new-subject/page.tsx`

Form fields:
- **Branch** — auto-filled from `defaultCompany` (locked)
- **Level** — Plus One / Plus Two (drives `program` selection)
- **Subject** — dropdown from `getSubjectsForBranch(company)` filtered by level
- **Program** — auto-filled based on Level (e.g., "11th Science CBSE" or "11th Science State")
- **Academic Year** — dropdown
- **Batch Code** — dropdown from `getStudentBatchNames()`
- **Group Name** — auto-suggested as `{BranchName}-{Subject}-A` (editable)
- **Max Strength** — number input (default 30)

On submit:
```typescript
createBatch({
  student_group_name: groupName,
  group_based_on: "Batch",
  program: selectedProgram,
  academic_year: selectedAcademicYear,
  batch: selectedBatch,
  max_strength: maxStrength,
  custom_branch: defaultCompany,
  custom_subject: selectedSubject,   // ← the key field
})
```

Link to this page from `batches/page.tsx` as a secondary "New Subject Group" button.

---

## Phase 3 — Fix Admission Step 3

### `src/app/dashboard/sales-user/admit-subject/page.tsx`

**Current Step 3 (broken):**
```typescript
// Fetches ALL student groups for this branch+program → includes full-program groups
getStudentGroups({
  custom_branch: selectedBranch,
  program: selectedProgram,     // "11th Science CBSE"
  limit_page_length: 20,
})
// Student ends up in Kadavanthara-11th Science CBSE-A (WRONG)
```

**Fixed Step 3:**
```typescript
// Fetches ONLY subject groups → filters by custom_subject
getStudentGroups({
  branch: selectedBranch,
  subjectWiseOnly: true,        // ← only groups with custom_subject set
  limit_page_length: 50,
})
// Then further filter in UI: only show groups where custom_subject === selectedSubject
// Student ends up in Kadavanthara-Physics-A (CORRECT)
```

- Remove the "Program" dropdown from Step 3 UI (derive `program` from the selected subject group's own `program` field)
- If no subject groups exist for that subject yet: show a warning message "No {Subject} group found. Ask your Branch Manager to create one."

---

## Phase 4 — Batches List Page

### `src/app/dashboard/branch-manager/batches/page.tsx`

Current: shows all groups mixed.

Change: split into two sections (same pattern as attendance dashboard):
- **Regular Batches** — groups where `custom_subject` is empty/null
- **Subject-Wise Groups** — groups where `custom_subject` is set (collapsible section at bottom)

Add "New Subject Group" button linking to `/batches/new-subject/`.

---

## Phase 5 — Attendance Dashboard (3-section split)

### `src/app/dashboard/branch-manager/attendance/students/page.tsx`

**Current (2 sections):**
```
Regular Classes    → allSummaries.filter(c => !o2oGroupNames.has(c.name))
One-to-One         → allSummaries.filter(c => o2oGroupNames.has(c.name))
```

**After (3 sections):**
```typescript
// NEW: fetch subject groups
const { data: subjectGroupRes } = useQuery({
  queryKey: ["subject-groups-attendance", defaultCompany],
  queryFn: () => getStudentGroups({ branch: defaultCompany, subjectWiseOnly: true }),
  staleTime: 5 * 60_000,
  enabled: !!defaultCompany,
});
const subjectGroups = subjectGroupRes?.data ?? [];
const subjectGroupNames = useMemo(
  () => new Set(subjectGroups.map((g) => g.name)),
  [subjectGroups]
);

// Three-way split
const classSummaries   = allSummaries.filter(c => !o2oGroupNames.has(c.name) && !subjectGroupNames.has(c.name));
const subjectSummaries = allSummaries.filter(c => subjectGroupNames.has(c.name));  // NEW
const o2oSummaries     = allSummaries.filter(c => o2oGroupNames.has(c.name));
```

UI layout:
```
┌────────────────────────────────────────────────┐
│  Regular Classes                                │
│  [Batch cards grid — existing UI]               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  ▼ Subject-Wise Classes   [collapsible]  NEW    │
│  Kadavanthara-Physics-A     (10 students)       │
│  Kadavanthara-Chemistry-A    (7 students)       │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│  ▼ One to One             [collapsible]         │
│  [existing O2O section]                         │
└────────────────────────────────────────────────┘
```

Clicking a subject group card → same `openClassAttendance(groupName)` → exact same batch detail view → all 10 students → mark Present/Absent. **No new code needed for the actual attendance marking.**

Also include subject groups in the `allGroups` Set in `allSummaries` memo:
```typescript
const allGroups = new Set([
  ...groupMap.keys(),
  ...batches.map((b) => b.name),
  ...o2oGroups.map((g) => g.name),
  ...subjectGroups.map((g) => g.name),   // ← ADD
]);
```

---

## Phase 6 — Course Scheduling for Subject Groups (New Page)

### `src/app/dashboard/branch-manager/course-schedule/subject/page.tsx`

Mirror of `course-schedule/one-to-one/page.tsx` with:
- `getStudentGroups({ branch, subjectWiseOnly: true })` instead of `oneToOneOnly: true`
- Title: "Schedule Subject-Wise Classes"
- Breadcrumb: Course Schedule → Subject-Wise

### `src/app/dashboard/branch-manager/course-schedule/new/page.tsx` (edit)
- Exclude subject groups from the student group dropdown:
  ```typescript
  // Filter out groups with custom_subject set
  const regularGroups = studentGroups.filter(g => !g.custom_subject);
  ```

---

## Phase 7 — Exams for Subject Groups (New Page)

### `src/app/dashboard/branch-manager/exams/create-subject/page.tsx`

Mirror of `exams/create-one-to-one/page.tsx` with:
- `getStudentGroups({ branch, subjectWiseOnly: true })` instead of `oneToOneOnly`
- Title: "Create Subject-Wise Exam"

### `src/app/dashboard/branch-manager/exams/create/page.tsx` (edit)
- Exclude subject groups from student group dropdown (same filter as scheduling)

---

## Complete File Checklist

| # | File | Action | Phase |
|---|------|--------|-------|
| - | Frappe admin: `Student Group.custom_subject` | **Manual** | 0 |
| 1 | `src/lib/types/batch.ts` | Edit | 1 |
| 2 | `src/lib/api/batches.ts` | Edit | 1 |
| 3 | `src/lib/api/courseSchedule.ts` | Edit | 1 |
| 4 | `src/lib/api/enrollment.ts` | Minor edit | 1 |
| 5 | `src/app/dashboard/branch-manager/batches/new-subject/page.tsx` | **New** | 2 |
| 6 | `src/app/dashboard/branch-manager/batches/page.tsx` | Edit | 2 |
| 7 | `src/app/dashboard/sales-user/admit-subject/page.tsx` | Edit | 3 |
| 8 | `src/app/dashboard/branch-manager/attendance/students/page.tsx` | Edit | 5 |
| 9 | `src/app/dashboard/branch-manager/course-schedule/subject/page.tsx` | **New** | 6 |
| 10 | `src/app/dashboard/branch-manager/course-schedule/new/page.tsx` | Edit | 6 |
| 11 | `src/app/dashboard/branch-manager/exams/create-subject/page.tsx` | **New** | 7 |
| 12 | `src/app/dashboard/branch-manager/exams/create/page.tsx` | Edit | 7 |

---

## What Does NOT Change

- Fee structures and fee config (`/api/fee-config`) — unchanged
- Sales Orders and Invoices — unchanged
- Program Enrollment — still uses HSS program (e.g., "11th Science CBSE")
- Regular batch attendance flow — unchanged
- O2O system — unchanged
- `addStudentToGroup()` in `enrollment.ts` — unchanged (just targets a different group)

---

## Implementation Order

```
Phase 0 → Frappe field (manual)
Phase 1 → Type/API layer (no UI, low risk)
Phase 2 → New "Create Subject Group" page (BM can start creating groups)
Phase 3 → Fix admit-subject Step 3 (admissions now go to correct group)
Phase 4 → Batches list separation (cosmetic)
Phase 5 → Attendance 3-section split (the main visibility fix)
Phase 6 → Subject schedule page + exclude from regular
Phase 7 → Subject exam page + exclude from regular
```

> Start Phase 0 and Phase 1 in parallel. Phase 2 is the highest priority after that — BM must create subject groups before any admissions can use the fixed Step 3.
