# Demo Student System — Complete Architecture Plan

> Status: STUDY ONLY — Do not implement until approved
> Date: 2026-04-13 (revised)

---

## 1. EXECUTIVE SUMMARY

**Goal:** Allow SmartUp branches to admit "demo students" — trial/probation students who:
- Pay a **small, flat fee** (e.g., ₹2,000–₹5,000 one-time) — no complex instalment plans
- Fully participate in **attendance, exams, schedules, topic coverage** — zero feature restrictions
- Are tracked **separately** in reports so they don't inflate regular student metrics
- Can be **converted to regular students** seamlessly if they decide to continue

**Key Design Principle:** Demo students are *real students* in every technical sense. Same batch, same classes, same exams. The system distinguishes them via a **category flag**, not by building a parallel system. The only real difference is the fee — a single small payment instead of the full annual fee.

---

## 2. WHY THIS WORKS WITH THE EXISTING ARCHITECTURE

Every SmartUp feature (attendance, exams, schedules, topics) connects to the student through **one chain**:

```
Student → Program Enrollment → Student Group (Batch)
                                     ↓
                           ┌─────────┼─────────┐
                           │         │         │
                    Attendance   Exams   Course Schedule
                                         (Topics)
```

**If a demo student has a valid Program Enrollment and is in a Student Group, they automatically get:**
- ✅ Attendance marking (batch-based bulk marking)
- ✅ Exam participation (Assessment Plan targets Student Group)
- ✅ Course Schedules (linked to Student Group)
- ✅ Topic Coverage tracking (via Course Schedule)
- ✅ Parent Dashboard (fees, attendance, report card)
- ✅ Instructor visibility (Student Group members list)

**What's different for demo students:**
- 🔄 Small flat fee (₹2K–5K) instead of ₹35K–₹80K annual fee
- 🔄 **Single invoice** — no instalment plans at all
- 🔄 Flagged as "Demo" in student record
- 🔄 Filtered separately in reports and dashboards
- 🔄 Conversion workflow to become "Regular" student

---

## 3. DATA MODEL CHANGES

### 3.1 Frappe Backend — Student Category (Native Field)

Frappe Education already has a **Student Category** doctype. It is a master-data table where you define categories. Both `Program Enrollment` and `Fee Structure` already have a `student_category` field.

**Action:** Create a new Student Category record in Frappe:
```
Student Category: "Demo"
```

This is the **cleanest approach** because:
- `Fee Structure.student_category` already supports category-specific fee matching
- `Program Enrollment.student_category` already supports category on enrollment
- No custom field creation needed on the Frappe backend — just a master data record

### 3.2 Student Record — Type Extension

**Current values:** `custom_student_type: "Fresher" | "Existing" | "Rejoining"`

**Proposed:** Add `"Demo"` as a fourth value:
```typescript
custom_student_type?: "Fresher" | "Existing" | "Rejoining" | "Demo";
```

This gives us:
- Easy filtering in UI (Director student list already filters by `custom_student_type`)
- Clear identification in all student list pages
- Searchable/queryable via existing patterns

### 3.3 Fee Structure — Demo-Specific

Create **one Fee Structure record per branch × program** for demo students:

**Naming convention:** `{BRANCH_ABBR}-{PROGRAM}-Demo-1`
**Example:** `SU ERV-8th State-Demo-1`

| Field | Value |
|-------|-------|
| `program` | Same as regular (e.g., "8th State") |
| `academic_year` | Same (e.g., "2026-2027") |
| `student_category` | **"Demo"** |
| `custom_plan` | **"Demo"** (new plan type) |
| `custom_no_of_instalments` | **"1"** (always — single payment) |
| `total_amount` | Small demo fee (e.g., ₹2,000 or ₹3,000) |
| `company` | Branch company |

**Why always "1" instalment?**
- Demo fee is a small flat amount (₹2K–5K range)
- No need for quarterly/6/8 splits on such a small number
- One Sales Order (qty=1) → one Sales Invoice → one payment
- Keeps the billing pipeline identical but dramatically simpler

### 3.4 Demo Fee — No Instalment Plans

**Comparison with regular fee flow:**

| Aspect | Regular Student | Demo Student |
|--------|----------------|--------------|
| **Fee range** | ₹34,000 – ₹80,000+ | ₹2,000 – ₹5,000 |
| **Plan selection** | Basic / Intermediate / Advanced | None — flat "Demo" |
| **Instalment options** | 1 / 4 / 6 / 8 | **Always 1** (single payment) |
| **Schedule generation** | Complex (quarterly/bi-monthly dates) | **Immediate** — due on enrollment date |
| **Fee config source** | XLSX → JSON (`fee_structure_parsed.json`) | Frappe Fee Structure record |
| **Sales Order** | qty = numInstalments, rate = avg | qty = 1, rate = demo fee amount |
| **Sales Invoices** | 1 per instalment (up to 8) | **Exactly 1** |
| **Payment** | Cash / Online, partial supported | Cash / Online, full amount |

**The fee step in the admission form is drastically simplified:**
- No plan radio buttons (Basic/Intermediate/Advanced)
- No instalment radio buttons (1/4/6/8)
- No instalment schedule table
- Just: *"Demo Fee: ₹X,XXX"* + payment mode (Cash/Online)

---

## 4. ADMISSION FLOW FOR DEMO STUDENTS

### 4.1 Entry Point

**Route:** Same pages, query param flag (like sibling's `?referred=true`):
```
/dashboard/branch-manager/students/new?demo=true
/dashboard/sales-user/admit?demo=true
```

**Detection in page.tsx:**
```typescript
const isDemo = searchParams.get("demo") === "true";
```

**Sidebar navigation:** Add "Demo Admission" link (like "Siblings Admission") that redirects to `?demo=true`.

### 4.2 Demo Admission Form — Side-by-Side Comparison

| Step | Regular Admission | Demo Admission |
|------|------------------|----------------|
| **Step 1: Student Info** | Full name, DOB, gender, blood group, email, mobile, Aadhaar | **Same — all fields identical** |
| **Step 2: Guardian** | Name, relation, mobile, email, password | **Same — guardian + parent user created** |
| **Step 3: Academic** | Branch, program, batch, SRR ID, enrollment date | **Same — demo student joins a REAL batch** |
| **Step 4: Fees** | Plan radio (B/I/A), Instalment radio (1/4/6/8), schedule table, mode | **Stripped down:** Just shows demo fee amount + mode (Cash/Online) |

#### Step 4 Detail: Demo Fee Step UI

```
┌─────────────────────────────────────────────────┐
│  💡 Demo Admission — Flat Demo Fee              │
│                                                 │
│  Demo Fee for "8th State" at "Smart Up Vennala" │
│                                                 │
│  ┌─────────────────────────────────────┐        │
│  │  Fee Amount:  ₹ 3,000              │        │
│  │  Due Date:    April 13, 2026       │        │
│  │  (Single payment — no instalments)  │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  Mode of Payment:                               │
│  ● Cash    ○ Online                             │
│                                                 │
│  [← Back]                      [Submit →]       │
└─────────────────────────────────────────────────┘
```

**What's removed from Step 4 for demo:**
- ❌ Plan selection (Basic/Intermediate/Advanced) → hardcoded as "Demo"
- ❌ Instalment selection (1/4/6/8) → hardcoded as "1"
- ❌ Instalment schedule table → single row, single amount
- ❌ Referral/sibling discount logic → not applicable
- ❌ Fee config XLSX lookup → fee comes from Frappe Fee Structure

**What stays:**
- ✅ Mode of payment (Cash / Online)
- ✅ Payment action (Pay Now / Send to Parent) if Online
- ✅ Post-admission payment dialog

### 4.3 Backend Stages (admitStudent with demo flag)

The admission orchestrator (`admitStudent()` in `enrollment.ts`) runs 7 stages. For demo students, **all 7 stages still run**:

| Stage | What Happens | Demo-Specific Changes |
|-------|-------------|----------------------|
| 1. Guardian | Creates Guardian record | None |
| 2. Parent User | Creates Frappe User (Parent role) | None — parent can log in |
| 3. Student | Creates Student record | Sets `custom_student_type = "Demo"` |
| 4. Program Enrollment | Creates & submits PE | `student_category = "Demo"`, `custom_plan = "Demo"`, `custom_no_of_instalments = "1"`, `custom_fee_structure` = demo fee structure |
| 5. Batch Assignment | Adds to Student Group | None — **joins a real batch** |
| 6. Sales Order | Creates & submits SO | `qty = 1`, `rate = demo_fee_amount` (e.g., ₹3,000) |
| 7. Invoices | Creates Sales Invoice(s) | **Exactly 1 invoice**, `due_date = enrollment_date`, `amount = demo_fee_amount` |

**Critical:** Demo students join the **same real batches** as regular students. They sit in the same class, attend the same schedules, take the same exams.

### 4.4 Fee Resolution for Demo — How the Amount Is Determined

**Regular students:** Amount comes from XLSX → JSON lookup (`fee_structure_parsed.json`) keyed by `branch|plan|class`.

**Demo students:** Amount comes from **Frappe Fee Structure record** with `student_category = "Demo"`.

**Lookup logic:**
```typescript
// In the admission form, when isDemo=true:
// 1. Skip XLSX fee-config fetch entirely
// 2. Instead, query Frappe for demo fee structure:
const demoFeeStructure = feeStructures.find(
  (fs) =>
    fs.student_category === "Demo" &&
    fs.program === selectedProgram &&
    fs.company === selectedBranch
);

// 3. The total_amount IS the demo fee — no plan/instalment variations
const demoFeeAmount = demoFeeStructure.total_amount; // e.g., 3000

// 4. Generate a trivial single-instalment schedule
const demoSchedule: InstalmentEntry[] = [
  { index: 1, label: "Demo Fee", amount: demoFeeAmount, dueDate: enrollmentDate }
];
```

**Why Fee Structure records in Frappe?**
- Can be updated by admin without any code change
- Different amounts per branch × program (e.g., higher classes may cost more for demo)
- Uses the existing `student_category` field — no new fields needed
- The `getFeeStructures()` API already exists, just needs an extra filter

**Example Fee Structure records to create:**

| Name | Program | Company | student_category | custom_plan | custom_no_of_instalments | total_amount |
|------|---------|---------|-----------------|-------------|--------------------------|-------------|
| SU ERV-8th State-Demo-1 | 8th State | Smart Up Vennala | Demo | Demo | 1 | ₹3,000 |
| SU ERV-9th CBSE-Demo-1 | 9th CBSE | Smart Up Vennala | Demo | Demo | 1 | ₹3,500 |
| SU CHL-8th State-Demo-1 | 8th State | Smart Up Chullickal | Demo | Demo | 1 | ₹2,500 |
| SU EDP-10th Grade-Demo-1 | 10th Grade | Smart Up Edappally | Demo | Demo | 1 | ₹4,000 |
| ... | ... | ... | Demo | Demo | 1 | ... |

*One record per branch × program combination. ~50-60 records total across all branches/programs.*

### 4.5 Form Data Flow — Demo vs Regular

```
REGULAR FLOW:
  Branch + Program + Plan → /api/fee-config (XLSX lookup)
    → FeeConfigEntry (annual_fee, otp, quarterly_total, inst6_total, inst8_total)
      → getAllPaymentOptions() → 4 PaymentOptionSummary objects
        → User picks 1 → instalmentSchedule[] (1-8 entries)
          → admitStudent() → SO (qty=N) → N invoices

DEMO FLOW:
  Branch + Program → getFeeStructures({student_category: "Demo"})
    → FeeStructure.total_amount (single number, e.g., ₹3,000)
      → No plan selection, no instalment selection
        → demoSchedule = [{ amount: 3000, dueDate: today, label: "Demo Fee" }]
          → admitStudent() → SO (qty=1) → 1 invoice
```

---

## 5. HOW DEMO STUDENTS CONNECT TO EVERY FEATURE

### 5.1 Attendance — No Changes Needed

**How it works today:**
```
Attendance marking → Fetches Student Group members → Marks each student
```

**For demo students:**
- They are in the Student Group (added in Stage 5 of admission)
- `bulkMarkAttendance()` fetches all active members → demo students included
- Individual attendance works the same way
- Parent dashboard shows attendance for demo child

**No code changes required for attendance.**

### 5.2 Exams — No Changes Needed

**How it works today:**
```
Create Assessment Plan → Target Student Group → All members eligible
Mark Entry → Shows all students in the batch → Enter marks for each
Results → Calculated per student with ranking within batch
Report Card → Generated per student
```

**For demo students:**
- Assessment Plan targets Student Group → demo students are members → they appear in mark entry list
- Marks saved normally, grades calculated normally
- They get a rank within the batch (like any other student)
- Report card works via `/api/exams/report-card?student=X`

**No code changes required for exams.**

### 5.3 Course Schedule — No Changes Needed

**How it works today:**
```
Course Schedule links to Student Group
All members of the group attend that schedule
```

**Demo students are in the group → they're part of the schedule.**

### 5.4 Topic Coverage — No Changes Needed

Topics are tracked per Course Schedule → linked to Student Group. Demo students are members. Coverage tracking works automatically.

### 5.5 Parent Dashboard — No Changes Needed

**How it works today:**
```
Parent logs in → Fetches children via Guardian link
For each child → Fetches enrollments, invoices, attendance
```

**Demo parent:**
- Guardian created at admission
- Parent User created with "Parent" role
- Can log in, see their demo child's attendance, fees (demo fees), report card
- All works because the parent dashboard queries by `student` link, not by category

### 5.6 Instructor View — No Changes Needed

Instructor sees students in their assigned batch. Demo students appear in the batch member list alongside regular students.

---

## 6. WHERE DEMO STUDENTS *DO* NEED SPECIAL HANDLING

### 6.1 Fee Reports — Must Be Filterable

**Problem:** Demo students pay ₹2,000 while regulars pay ₹80,000+. Mixing them inflates student counts and distorts collection rates.

**Solution:** All fee report endpoints (10+ routes in `/api/fees/*`) need a **filter parameter**:

```typescript
// New query param on all /api/fees/* endpoints
?exclude_demo=true   // Default for regular reports
?include_demo=true   // Explicitly include demo students
?demo_only=true      // Show only demo student fees
```

**Implementation approach:**
- Each fee API already fetches Students for discontinuation filtering
- Add: also fetch demo students where `custom_student_type = "Demo"` → get their customer IDs
- Exclude those customer IDs from Sales Invoice aggregations (same pattern as discontinued exclusion)

**Affected routes:**
| Route | Current Discontinuation Filter | Add Demo Filter |
|-------|-------------------------------|-----------------|
| `/api/fees/report-summary` | ✅ Excludes discontinued | Need to exclude demo |
| `/api/fees/class-summary` | ✅ | Need |
| `/api/fees/pending-invoices` | ✅ | Need |
| `/api/fees/collected-summary` | ✅ | Need |
| `/api/fees/collected-by-class` | ✅ | Need |
| `/api/fees/collected-by-mode` | ✅ | Need |
| `/api/fees/dues-till-today` | ✅ | Need |
| `/api/fees/discontinued-summary` | N/A | N/A (only discontinued) |
| `/api/fees/forfeited-detail` | N/A | N/A (only discontinued) |

### 6.2 Student List Pages — Demo Badge + Filter

**Branch Manager students page** (`/dashboard/branch-manager/students/page.tsx`):
- Add "Demo" to the status/type filter dropdown
- Show a "DEMO" badge on demo student cards (like the existing "Discontinued" badge)
- Demo students should appear in the list but be visually distinct

**Director student list** (`/dashboard/director/students/all/page.tsx`):
- Already has `custom_student_type` filter (Fresher/Existing/Rejoining)
- Add "Demo" as a fourth filter option
- Show "DEMO" badge

### 6.3 Dashboard Stats — Separate Demo Metrics

**Branch Manager dashboard:**
- Current: "Total Students: 150, Active: 140"
- New: "Regular Students: 130, Demo Students: 10, Active: 140"
- Or: A separate card/section for demo metrics

**Director dashboard:**
- Current shows stats across branches
- Add demo student count per branch
- Fee collection should separate demo fees from regular fees

### 6.4 Admission Count Tracking

**Director today-admissions** (`/api/director/today-admissions`):
- Currently counts all new admissions
- Should distinguish: "5 regular + 2 demo admissions today"

### 6.5 Demo Duration Tracking

**New concept:** Demo students have a trial period.

**Fields needed on Student (custom):**
| Field | Type | Purpose |
|-------|------|---------|
| `custom_demo_start_date` | Date | When demo period started |
| `custom_demo_end_date` | Date | When demo period expires |
| `custom_demo_duration_weeks` | Int | Duration in weeks (1-4 typical) |
| `custom_demo_status` | Select | "Active" / "Expired" / "Converted" |

**Or simpler approach:** Use `joining_date` as demo start, and track conversion separately.

---

## 7. DEMO → REGULAR CONVERSION WORKFLOW

When a demo student decides to continue as a regular student:

### 7.1 What Needs to Change

| Component | Demo State | Regular State | Action |
|-----------|-----------|---------------|--------|
| `custom_student_type` | "Demo" | "Fresher" | Update field |
| `student_category` on PE | "Demo" | (blank / "Regular") | Cancel old PE, create new PE |
| Fee Structure | Demo fee structure | Regular fee structure | New PE with regular fee |
| Sales Order | Demo SO (₹2,000) | Regular SO (₹80,000+) | Create new SO |
| Sales Invoices | 1 demo SI | 4/6/8 instalment SIs | Create new SIs |
| Student Group | Same batch | Same batch (no change) | No change needed |
| Attendance history | Preserved | Preserved | No change needed |
| Exam results | Preserved | Preserved | No change needed |

### 7.2 Conversion Steps (Proposed Flow)

```
BM clicks "Convert to Regular" on demo student profile
    → Opens a mini-admission form (only Step 4: Fee Details)
    → BM selects: Plan (B/I/A), Instalments (1/4/6/8), Mode
    → System:
        1. Updates Student.custom_student_type → "Fresher"
        2. Clears custom_demo_status → "Converted"
        3. Cancels old demo Program Enrollment (docstatus → 2)
        4. Creates new Program Enrollment with regular fee structure
        5. Submits new PE (docstatus → 1)
        6. (Student Group membership stays — no change needed)
        7. Creates new Sales Order with regular pricing
        8. Creates new Sales Invoices per instalment schedule
        9. Demo SO remains for audit trail (already paid)
```

### 7.3 Fee Credit on Conversion

**Important decision:** Should the demo fee paid count toward the regular fee?

**Option A: No credit** — Demo fee is separate, regular fee starts fresh.
**Option B: Partial credit** — Demo fee deducted from first regular instalment.
**Option C: Pro-rated credit** — Demo fee deducted proportionally across all instalments.

**Recommendation: Option A (No credit)** — simplest, demo fee covers the trial period service. Avoids complex credit note/adjustment logic.

If credit is desired, it would follow the same pattern as branch transfers (`/api/transfer/execute`) — calculate `already_paid` and reduce new SO amount.

---

## 8. DEMO FEE CONFIGURATION — COMPLETE DETAILS

### 8.1 Why It's Simple

Regular students have a complex fee pipeline:
```
XLSX data → 3 plans (B/I/A) × 4 instalment options (1/4/6/8) = 12 pricing variations per branch+class
```

Demo students have **one number per branch × program**:
```
Frappe Fee Structure record → total_amount → done
```

No plans. No instalments. No XLSX. No fee-config API. Just a direct lookup.

### 8.2 Pricing Data Source

**Source:** Frappe Fee Structure records with `student_category = "Demo"`

**Query (from frontend):**
```typescript
// Existing getFeeStructures() with extra filter
const demoStructures = await getFeeStructures({
  program: selectedProgram,       // e.g., "8th State"
  academic_year: "2026-2027",
  company: selectedBranch,        // e.g., "Smart Up Vennala"
  student_category: "Demo",
});
// Returns exactly 1 result → demoStructures[0].total_amount
```

**No new API endpoint needed.** The existing `getFeeStructures()` in `src/lib/api/fees.ts` already supports filters.

### 8.3 Schedule Generation — Trivial

```typescript
// No new utility function needed. Just inline:
const demoSchedule: InstalmentEntry[] = [
  {
    index: 1,
    label: "Demo Fee",
    amount: demoFeeStructure.total_amount,
    dueDate: enrollmentDate,
  },
];
```

- No `generateInstalmentSchedule()` call
- No `INSTALMENT_DUE_DATES` lookup
- No rounding logic
- One entry. Done.

### 8.4 Item Code for Demo Invoices

**Regular students:** Sales Invoice line item = `"{Program} Tuition Fee"` (e.g., "8th State Tuition Fee")

**Demo students:** Use a **single generic** `"Demo Tuition Fee"` Item record.
- One Item for all demo invoices across all programs/branches
- Student + branch identified via invoice's `customer` + `company` fields
- Clean separation in accounting reports

---

## 9. UI CHANGES SUMMARY

### 9.1 New Pages/Routes

| Route | Purpose |
|-------|---------|
| `/dashboard/branch-manager/students/new?demo=true` | Demo admission form |
| `/dashboard/sales-user/admit?demo=true` | Demo admission (sales user) |
| (Reuses existing page with `isDemo` flag, like `isReferred` pattern) | |

### 9.2 Modified Pages

| Page | Changes |
|------|---------|
| **BM Students List** | "Demo" filter option, "DEMO" badge on cards |
| **Director Students List** | "Demo" in type filter dropdown |
| **BM Student Detail** | "Convert to Regular" button for demo students, demo status section |
| **BM Dashboard Stats** | Separate demo student count |
| **Director Dashboard** | Demo vs Regular student metrics |
| **Fee Report Pages** | Toggle to include/exclude demo in stats |

### 9.3 New Components

| Component | Purpose |
|-----------|---------|
| `DemoFeeDisplay` | Read-only display of demo fee amount (no picker — amount comes from Fee Structure) |
| `ConvertToRegularModal` | Mini-form for conversion (plan + instalment selection — same as regular Step 4) |
| `DemoBadge` | Visual badge for demo students in lists |
| `DemoExpiryAlert` | Warning when demo period is expiring |

---

## 10. BACKEND PREREQUISITES (Frappe Admin)

These need to be done in the Frappe backend before frontend work:

| # | Action | Where | Details |
|---|--------|-------|---------|
| 1 | Create Student Category: "Demo" | Student Category doctype | Just a name record |
| 2 | Add allowed value "Demo" to `custom_student_type` | Customize Form → Student | Add to Select options |
| 3 | Add custom fields to Student | Customize Form → Student | `custom_demo_start_date` (Date), `custom_demo_end_date` (Date), `custom_demo_status` (Select: Active/Expired/Converted) |
| 4 | Create Demo Fee Structures | Fee Structure doctype | One per branch × program with `student_category = "Demo"`, `custom_plan = "Demo"`, `custom_no_of_instalments = "1"`, `total_amount = demo fee` |
| 5 | Create "Demo Tuition Fee" Item | Item doctype | Single generic item for all demo invoices |

---

## 11. WHAT IS *NOT* NEEDED (Keep It Simple)

| Temptation | Why It's Unnecessary |
|------------|---------------------|
| Plan selection (B/I/A) for demo | Demo = flat fee. One number. No plans. |
| Instalment options for demo | Always "1". Small amount doesn't need splitting. |
| XLSX/JSON fee config for demo | Fee comes from Frappe Fee Structure, not XLSX |
| generateInstalmentSchedule() for demo | Single-entry array, no generation logic needed |
| Separate Demo Student Group/Batch | Demo students join **real** batches — that's the whole point |
| Separate Demo Program | Same programs (8th State, 9th CBSE, etc.) |
| Separate Demo Attendance/Exam System | Attendance & exams target batches — demo students are in them |
| New Doctype for Demo | Use existing doctypes + `student_category` and `custom_student_type` |
| Demo-specific API routes | Modify existing routes with filters (like discontinued student pattern) |
| New `/api/fee-config` for demo | Not needed — fee comes from Frappe Fee Structure directly |

---

## 12. RISK ANALYSIS

| Risk | Mitigation |
|------|-----------|
| Demo students inflating fee collection stats | Filter by `custom_student_type != "Demo"` in all fee APIs |
| Demo student counted in "total students" KPI | Separate counts: regular vs demo |
| Demo fee structures mixed with regular in lookups | `student_category = "Demo"` filter keeps them separate |
| Expired demo student still in batch | Manual BM action or alert system |
| Demo-to-regular conversion losing history | PE cancel preserves audit; new PE created; attendance/exams untouched |
| Parent confused about demo vs regular fees | Clear "DEMO" labels in parent dashboard, distinct item code on invoices |

---

## 13. IMPLEMENTATION ORDER (When Approved)

| Phase | Scope | Effort |
|-------|-------|--------|
| **Phase 1: Backend Setup** | Create Student Category "Demo", add "Demo" to custom_student_type, create custom fields, create Demo Fee Structures, create Demo Tuition Fee item | Frappe admin |
| **Phase 2: Demo Admission** | Add `?demo=true` flag to admission form, simplified Step 4 (show fee, no plan/instalment pickers), wire admitStudent with demo flag | Frontend |
| **Phase 3: Filters & Badges** | "Demo" filter in BM+Director student lists, "DEMO" badge, exclude demo from all `/api/fees/*` reports by default | Frontend |
| **Phase 4: Conversion** | "Convert to Regular" button on BM student detail → opens regular Step 4 → cancel demo PE/SO, create regular PE/SO/invoices | Frontend |
| **Phase 5: Dashboard Metrics** | Separate demo/regular counts in BM and Director dashboards | Frontend |
| **Phase 6: Expiry Tracking** | Demo end-date alerts, BM notification for expiring demo students | Frontend |

---

## 14. DECISION POINTS FOR USER

Before implementation, the following decisions are needed:

1. **Demo Fee Amounts**: What's the fee per branch × program? Or is it flat across all programs? (e.g., ₹3,000 everywhere?)
2. **Demo Duration**: Fixed (e.g., 1 month)? Or BM decides per student at admission?
3. **Fee Credit on Conversion**: Does the demo fee count toward the regular fee? (Recommend: No — demo fee covers the trial period.)
4. **Expiry Behavior**: When the demo period ends — auto-disable student? Alert BM to follow up? Do nothing (BM handles manually)?
5. **Parent Portal**: Should demo parents see a "DEMO" label? Or identical experience to regular parents?
6. **Maximum Demo Students**: Any limit per batch/branch?
