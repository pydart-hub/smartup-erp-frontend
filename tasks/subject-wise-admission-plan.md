# Subject-Wise Admission — New UI Structure & Workflow

> **Status**: Study complete. No implementation yet.

---

## 1. What Is Subject-Wise Admission?

HSS students (Plus One / Plus Two level) who want to study **individual subjects**
rather than the full class program. They pay a **reduced fee** based on subject(s) chosen.

### Subject Options

| Key in Fee JSON | Type | Description |
|-----------------|------|-------------|
| Physics | Single | Individual subject |
| Chemistry | Single | Individual subject |
| Maths | Single | Individual subject |
| Phy-Chem | Combo | 2-subject bundle |
| Phy-Maths | Combo | 2-subject bundle |
| Chem-Maths | Combo | 2-subject bundle |
| 10 Cbse Maths | Special | CBSE-specific single subject |

### Availability by Branch

| Branch (Frappe Company) | Subjects Available |
|---|---|
| Smart Up Kadavanthara | All 7 |
| Smart Up Vennala | All 7 |
| Smart Up Edappally | All 7 |
| Smart Up Thopumpadi | Phy-Chem only |
| Smart Up Chullickal / Fortkochi / Eraveli / Palluruthy (Tier 1) | Phy-Chem only |
| Smart Up Moolamkuzhi | **None** — no subject-wise |

### Plans Available

Only **Basic** and **Advanced**. No Intermediate for subject-wise.

### Pricing Pattern (example: Vennala)

| Subject | Basic Annual | Advanced Annual |
|---------|:---:|:---:|
| Physics | 18,000 | 22,000 |
| Chemistry | 18,000 | 22,000 |
| Maths | 22,500 | 28,000 |
| Phy-Chem | 31,000 | 35,000 |
| Phy-Maths | 34,400 | 43,900 |
| Chem-Maths | 34,400 | 43,900 |
| 10 Cbse Maths | 14,500 | 17,800 |
| Full Plus One | 47,000 | 58,000 |

Single subjects = ~38-48% of full program. Combos = ~60-76%.

---

## 2. New Page: `/dashboard/sales-user/admit-subject`

A **separate dedicated page** for subject-wise admissions, alongside the existing
`/dashboard/sales-user/admit` page for regular admissions.

### Why Separate UI (Not a Toggle on Existing Form)

1. **Cleaner UX** — Sales users see exactly one purpose per page
2. **Different Step 3** — Subject selection replaces class selection logic
3. **Different fee lookup** — Uses subject key instead of PROGRAM_MAP
4. **Only 2 plans** — No Intermediate option cluttering the UI
5. **Targeted availability** — Only branches with subject-wise data see the nav item

---

## 3. Form Structure — 4 Steps

### Step 1: Student Info (identical to regular admission)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| full_name | text | required | |
| date_of_birth | date | required | |
| gender | select | Male/Female/Other | |
| blood_group | select | optional | |
| student_email_id | email | optional | |
| student_mobile_number | text | optional, 10 digits | |
| aadhaar_number | text | optional, 12 digits | |
| disabilities | text | optional | |

### Step 2: Guardian Details (identical to regular admission)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| guardian_name | text | required | |
| guardian_email | email | required | For parent login |
| guardian_mobile | text | required, 10 digits | |
| guardian_relation | select | required | |
| guardian_password | password | required, min 8 | |

### Step 3: Academic & Subject Details (NEW — different from regular)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| custom_branch | select | required | Dropdown of branches (filtered: only branches with subject-wise data) |
| subject | select | required | **NEW** — dropdown of subjects available at selected branch |
| program | select | required | HSS program for enrollment (e.g. "11th Science State"). Auto-populated based on branch's available HSS Student Groups |
| academic_year | select | required | |
| enrollment_date | date | readonly | Auto-set to today |
| custom_srr_id | text | readonly | Auto-generated |
| student_batch_name | select | required | Student Groups for branch + selected HSS program |

**Step 3 Flow:**
```
1. Sales user selects Branch (e.g. "Smart Up Vennala")
   └─ Branch dropdown ONLY shows branches that have subject-wise data
   └─ i.e. NOT Moolamkuzhi (no subjects)

2. Subject dropdown populates based on branch
   └─ Vennala → Physics, Chemistry, Maths, Phy-Chem, Phy-Maths, Chem-Maths, 10 Cbse Maths
   └─ Thoppumpady → Phy-Chem only

3. HSS Program dropdown auto-populates from Student Groups at that branch
   └─ Queries getStudentGroups({ custom_branch }) filtered to HSS programs only
   └─ e.g. "11th Science State", "11th Science CBSE"
   └─ If only ONE HSS program exists → auto-select it

4. Batch dropdown loads from Student Groups for branch + program
   └─ e.g. "Vennala-11th Science State-A" (same batch as regular students)
   └─ If only one batch → auto-select

5. SRR ID auto-fills (same logic as regular admission)
```

**Key difference from regular admission**: The `subject` field is the PRIMARY
selection in Step 3 (determines fee). The `program` field is for enrollment
only — the student is still enrolled in an HSS program, NOT a "Physics" program.

### Step 4: Fee Details (same structure, different data source)

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| custom_plan | card-select | required | Only Basic / Advanced (no Intermediate) |
| custom_no_of_instalments | card-select | required | 1 / 4 / 6 / 8 |
| fee_structure | hidden | auto-resolved | From Fee Structures matching program + plan + instalments |
| custom_mode_of_payment | radio | Cash / Online | |
| payment_action | radio | Pay Now / Send to Parent | Only for Online |
| advance_amount | number | optional | Partial advance |

**Step 4 Flow:**
```
1. Fee config fetched using SUBJECT key (not program):
   GET /api/fee-config?company=Smart%20Up%20Vennala&subject=Physics&plan=Basic
   └─ API resolves key: "Vennala|Basic|Physics"
   └─ Returns FeeConfigEntry with 17 fields

2. Plan selector shows only Basic and Advanced
   └─ Derived from available Fee Structures for the HSS program
   └─ (Intermediate filtered out since no subject-wise data exists for it)

3. Payment options generated: getAllPaymentOptions(feeConfig, academicYear)
   └─ Returns 1/4/6/8 instalment options with subject-specific amounts
   └─ e.g. Physics Basic at Vennala: OTP ₹14,750, Quarterly ₹18,000, etc.

4. Schedule displayed with due dates and per-instalment amounts

5. Fee Structure resolved for enrollment:
   └─ Uses HSS Fee Structure (e.g. "SU VNL-11th Science State-Basic-4")
   └─ NOT a subject-specific Fee Structure — those don't exist in Frappe
```

---

## 4. Backend / API Changes

### A. Fee Config API Route — Add `subject` Parameter

**File**: `src/app/api/fee-config/route.ts`

Current signature: `GET /api/fee-config?company=X&program=Y&plan=Z`

New signature: `GET /api/fee-config?company=X&program=Y&plan=Z&subject=Physics`

```
When `subject` param is present:
  1. Resolve branch from company using BRANCH_MAP
  2. Build key: "{branch}|{plan}|{subject}"   (e.g. "Vennala|Basic|Physics")
  3. Look up entry in fee config JSON
  4. Return FeeConfigEntry

When `subject` param is absent:
  → Existing logic unchanged (uses PROGRAM_MAP)
```

### B. Fee Config JSON — Merge Subject-Wise Entries

**File**: `docs/fee_structure_parsed.json`

Currently: **93 entries** (standard classes only, used by API)

Need to merge **46 subject-wise entries** from `docs/fee_structure_parsed copy.json`:

| Branch | Entries | Subjects |
|--------|:---:|---------|
| Kadavanthra | 14 | 7 subjects × Basic + Advanced |
| Vennala | 14 | 7 subjects × Basic + Advanced |
| Edappally | 14 | 7 subjects × Basic + Advanced |
| Thoppumpady | 2 | Phy-Chem × Basic + Advanced |
| Tier 1 | 2 | Phy-Chem × Basic + Advanced |
| **Total** | **46** | |

After merge: **139 entries** in live JSON.

### C. New Constants in `feeSchedule.ts`

```typescript
// Branches that support subject-wise admission + their subject list
export const SUBJECT_BY_BRANCH: Record<string, string[]> = {
  "Kadavanthra":    ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths", "10 Cbse Maths"],
  "Vennala":        ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths", "10 Cbse Maths"],
  "Edappally":      ["Physics", "Chemistry", "Maths", "Phy-Chem", "Phy-Maths", "Chem-Maths", "10 Cbse Maths"],
  "Thoppumpady":    ["Phy-Chem"],
  "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)": ["Phy-Chem"],
};

// Programs that qualify as HSS (student gets enrolled in one of these)
export const HSS_PROGRAMS = new Set([
  "11th State", "11th Science State", "11th Science CBSE",
  "12th Science State", "12th Science CBSE",
]);

// Build fee config key for subject-wise lookup
export function buildSubjectFeeConfigKey(
  company: string,
  subject: string,
  plan: string,
): string | null {
  const branch = BRANCH_MAP[company];
  if (!branch) return null;
  return `${branch}|${plan}|${subject}`;
}

// Get available subjects for a company
export function getSubjectsForBranch(company: string): string[] {
  const branch = BRANCH_MAP[company];
  if (!branch) return [];
  return SUBJECT_BY_BRANCH[branch] ?? [];
}
```

### D. New Zod Schema — `subjectStudentSchema`

```typescript
// src/lib/validators/subjectStudent.ts (NEW file)

export const subjectStudentSchema = z.object({
  // Step 1 — Student Info (same fields as studentSchema)
  full_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  gender: z.enum(["Male", "Female", "Other"]),
  blood_group: z.enum(["", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]).optional(),
  student_email_id: z.union([z.string().email(), z.literal("")]).optional(),
  student_mobile_number: z.string().regex(/^\d{10}$/).optional().or(z.literal("")),
  aadhaar_number: z.string().regex(/^\d{12}$/).optional().or(z.literal("")),
  disabilities: z.string().optional(),

  // Step 2 — Guardian (same fields)
  guardian_name: z.string().min(1),
  guardian_email: z.string().email(),
  guardian_mobile: z.string().regex(/^\d{10}$/),
  guardian_relation: z.string().min(1),
  guardian_password: z.string().min(8),

  // Step 3 — Academic + Subject (DIFFERENT from regular)
  custom_branch: z.string().min(1),
  subject: z.string().min(1, "Subject is required"),           // ← NEW: "Physics", etc.
  program: z.string().min(1, "HSS program is required"),       // HSS program for enrollment
  academic_year: z.string().min(1),
  custom_srr_id: z.string().optional(),
  student_batch_name: z.string().min(1, "Batch is required"),
  enrollment_date: z.string().min(1),

  // Step 4 — Fee (same fields)
  custom_plan: z.string().min(1),
  custom_no_of_instalments: z.string().min(1),
  fee_structure: z.string().optional(),
  custom_mode_of_payment: z.enum(["Cash", "Online"]),
});
```

### E. AdmitStudentForm Type — Add Optional Subject

```typescript
// In enrollment.ts — add to AdmitStudentForm interface
custom_subject?: string;   // "Physics", "Phy-Chem", etc. — purely for fee lookup context
```

This field is **NOT sent to Frappe**. It's only used on the frontend for
fee config key resolution and is included in the form data for logging/audit.

---

## 5. Navigation

### Add to SALES_USER_NAV in `constants.ts`

```typescript
export const SALES_USER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard/sales-user", icon: "LayoutDashboard" },
  { label: "New Admission", href: "/dashboard/sales-user/admit", icon: "UserPlus" },
  { label: "Subject Admission", href: "/dashboard/sales-user/admit-subject", icon: "BookOpen" },
  { label: "Students", href: "/dashboard/sales-user/students", icon: "GraduationCap" },
];
```

Icon `BookOpen` is already in the Sidebar's `iconMap` — no import changes needed.

---

## 6. Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SUBJECT-WISE ADMISSION FLOW                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STEP 3 (UI)                                                        │
│  ┌─────────────┐    BRANCH_MAP     ┌─────────────┐                 │
│  │ Branch       │ ──────────────── │ branch key  │                 │
│  │ "Smart Up    │                   │ "Vennala"   │                 │
│  │  Vennala"    │                   └──────┬──────┘                 │
│  └─────────────┘                           │                        │
│                                  getSubjectsForBranch()             │
│                                            │                        │
│  ┌─────────────┐                   ┌───────▼──────┐                │
│  │ Subject      │ ◄────────────── │ [Physics,    │                 │
│  │ "Physics"    │                   │  Chemistry,  │                │
│  └──────┬──────┘                   │  Maths, ...] │                │
│         │                           └──────────────┘                │
│         │                                                           │
│  ┌──────▼──────┐    getStudentGroups()  ┌──────────────┐           │
│  │ HSS Program  │ ──────────────────── │ Student      │           │
│  │ "11th Sci    │    (filter HSS only)  │ Groups       │           │
│  │  State"      │                       │ → Batches    │           │
│  └──────┬──────┘                       └──────────────┘           │
│         │                                                           │
│  STEP 4 (Fee Lookup)                                                │
│  ┌──────▼──────────────────────────────────────────────┐           │
│  │ GET /api/fee-config?company=...&subject=Physics      │           │
│  │                     &plan=Basic                       │           │
│  │                                                       │           │
│  │ API builds key: "Vennala|Basic|Physics"               │           │
│  │ Returns FeeConfigEntry (otp=14750, quarterly=18000..) │           │
│  └──────┬──────────────────────────────────────────────┘           │
│         │                                                           │
│  ┌──────▼──────────────────────────┐                               │
│  │ getAllPaymentOptions(feeConfig)  │                               │
│  │ → 1/4/6/8 instalment schedules  │                               │
│  │ → Due dates + amounts           │                               │
│  └──────┬──────────────────────────┘                               │
│         │                                                           │
│  SUBMISSION (admitStudent)                                          │
│  ┌──────▼──────────────────────────────────────────────┐           │
│  │ Stage 1: Guardian creation                           │           │
│  │ Stage 2: Parent user creation                        │           │
│  │ Stage 3: Student record (branch, SRR ID)             │           │
│  │ Stage 4: Program Enrollment                          │           │
│  │          program = "11th Science State" (NOT Physics) │           │
│  │          batch = "Vennala 26-27"                      │           │
│  │ Stage 5: Batch assign → same Student Group           │           │
│  │ Stage 6: Sales Order                                 │           │
│  │          item = "11th Science State Tuition Fee"      │           │
│  │          rate = subject fee from instalment schedule  │           │
│  │ Stage 7: Invoices (per instalment, subject amounts)  │           │
│  └─────────────────────────────────────────────────────┘           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 7. Key Architectural Decisions

### Q: What Program is used for enrollment?
**A:** The real HSS program (e.g. "11th Science State"), NOT "Physics".
The `subject` only affects the fee calculation. The student sits in the
same batch, same Student Group, same Program Enrollment as full-program students.

### Q: What Tuition Fee Item is used for the Sales Order?
**A:** The regular HSS tuition item (e.g. "11th Science State Tuition Fee").
`getTuitionFeeItem(form.program)` will resolve correctly since `form.program`
is still "11th Science State". No new Items needed in Frappe.

### Q: What Fee Structure is used for enrollment?
**A:** The regular HSS Fee Structure (e.g. "SU VNL-11th Science State-Basic-4").
These exist in Frappe already. The fee amounts in the Fee Structure don't matter
for invoicing — the actual amounts come from the subject-wise FeeConfigEntry via
the instalment schedule passed to `admitStudent()`.

### Q: Does the SO rate match the subject fee or the full program fee?
**A:** The **subject fee**. The admission form passes `instalmentSchedule` to
`admitStudent()`, and Stage 6 calculates `soRate = scheduleSum / numInstalments`.
Since the schedule contains subject-specific amounts (e.g. Physics prices),
the SO and invoices will have the correct lower amounts.

### Q: Do we need new Frappe backend records?
**A:** **No.** No new Programs, Student Groups, Fee Structures, or Items.
The only data change is merging 46 entries into the fee config JSON file.

---

## 8. File Change Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `docs/fee_structure_parsed.json` | EDIT | Merge 46 subject-wise entries (93→139) |
| 2 | `src/lib/utils/feeSchedule.ts` | EDIT | Add `SUBJECT_BY_BRANCH`, `HSS_PROGRAMS`, `buildSubjectFeeConfigKey()`, `getSubjectsForBranch()` |
| 3 | `src/app/api/fee-config/route.ts` | EDIT | Accept `subject` query param, build subject key when present |
| 4 | `src/lib/validators/subjectStudent.ts` | CREATE | New Zod schema with `subject` field |
| 5 | `src/lib/api/enrollment.ts` | EDIT | Add `custom_subject?: string` to `AdmitStudentForm` |
| 6 | `src/lib/utils/constants.ts` | EDIT | Add nav item to `SALES_USER_NAV` |
| 7 | `src/app/dashboard/sales-user/admit-subject/page.tsx` | CREATE | New 4-step subject admission form |

### Lines of Code Estimate

| File | Lines |
|------|------:|
| fee_structure_parsed.json (data merge) | ~800 |
| feeSchedule.ts (new constants + functions) | ~30 |
| fee-config/route.ts (subject param handling) | ~15 |
| subjectStudent.ts (new validator) | ~35 |
| enrollment.ts (type addition) | ~2 |
| constants.ts (nav item) | ~1 |
| admit-subject/page.tsx (new form page) | ~600 |
| **Total** | **~1,483** |

Of that, ~600 lines is the new form page (mostly copied from existing admit page
with Step 3 modifications), and ~800 lines is JSON data. Only ~83 lines of new logic.

---

## 9. Step 3 UI Layout (Subject Admission)

```
┌────────────────────────────────────────────────┐
│ Academic & Subject Details                      │
│ Select the branch, subject, and batch           │
│                                                  │
│ ┌──────────────────┐ ┌──────────────────┐       │
│ │ Branch *         │ │ Subject *        │       │
│ │ [Smart Up Vnla ▼]│ │ [Physics      ▼] │       │
│ └──────────────────┘ └──────────────────┘       │
│                                                  │
│ ┌──────────────────┐ ┌──────────────────┐       │
│ │ HSS Program *    │ │ Academic Year *  │       │
│ │ [11th Sci St  ▼] │ │ [2026-2027   ▼] │       │
│ └──────────────────┘ └──────────────────┘       │
│                                                  │
│ ┌──────────────────┐ ┌──────────────────┐       │
│ │ Enrollment Date  │ │ SRR ID           │       │
│ │ [2026-03-25] 🔒  │ │ [551] 🔒         │       │
│ └──────────────────┘ └──────────────────┘       │
│                                                  │
│ ┌──────────────────────────────────────┐        │
│ │ Batch *                              │        │
│ │ [Vennala-11th Science State-A   ▼]   │        │
│ └──────────────────────────────────────┘        │
│                                                  │
│ ┌──────────────────────────────────────┐        │
│ │ ℹ 1 batch available for 11th Sci    │        │
│ │   State at Vennala                    │        │
│ │   [Vennala-11th Science State-A]     │        │
│ └──────────────────────────────────────┘        │
└────────────────────────────────────────────────┘
```

---

## 10. Verification Checklist (for after implementation)

- [ ] Nav item "Subject Admission" appears in Sales User sidebar
- [ ] Branch dropdown only shows branches with subject-wise data (not Moolamkuzhi)
- [ ] Subject dropdown filters correctly per branch
- [ ] Thoppumpady / Tier 1 only show Phy-Chem
- [ ] HSS program auto-populates from Student Groups
- [ ] Batch dropdown shows same batches as regular HSS admission
- [ ] Fee config returns correct subject-wise pricing
- [ ] Only Basic + Advanced plans shown (no Intermediate)
- [ ] All 4 instalment options work (1/4/6/8)
- [ ] Instalment amounts match subject pricing (not full program)
- [ ] Student enrolled in HSS program (not "Physics")
- [ ] Student assigned to same batch as regular HSS students
- [ ] Sales Order uses HSS Tuition Fee item
- [ ] SO rate matches subject-wise instalment schedule
- [ ] Invoices have correct subject-wise amounts
- [ ] Post-admission payment dialog works (Cash + Online)
- [ ] TypeScript compiles clean (`npx tsc --noEmit`)
