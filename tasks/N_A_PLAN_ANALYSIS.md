# N/A Plan Count Analysis — Kadavanthra Branch

## 📊 Issue Summary
The Kadavanthra branch shows **"+ 2 N/A"** count in the Student Plans distribution. This represents active students who don't have a clearly defined enrollment plan.

---

## 🔍 Data Structure & Calculation

### Formula
```javascript
const branchKnownPlanTotal = 
  (planCounts.advanced ?? 0) +
  (planCounts.intermediate ?? 0) +
  (planCounts.basic ?? 0) +
  (planCounts.freeAccess ?? 0) +
  (planCounts.demo ?? 0);

const branchNaPlanCount = Math.max(0, (activeCount ?? 0) - branchKnownPlanTotal);
```

### What It Means
**N/A Count = Total Active Students − (Advanced + Intermediate + Basic + Free Access + Demo)**

---

## 📋 Data Sources & Logic

### 1. **Active Student Count** (`activeCount`)
**Source:** Direct Student doctype query
- **Filters:** 
  - `custom_branch = "Kadavanthra"`
  - `enabled = 1`
- **What it gets:** Total count of enabled (active) students for the branch

**API Call:** 
```
GET /resource/Student
filters: [["custom_branch", "=", "Kadavanthra"], ["enabled", "=", 1]]
```

---

### 2. **Plan Counts** (`planCounts`) — The Known Plans
**Source:** Program Enrollment doctype (latest enrollment per student)

#### Counting Logic:
For each active student, fetch their **latest submitted Program Enrollment record** and extract:
- `custom_plan` → Maps to: "advanced" | "intermediate" | "basic" | (null/blank)
- `student_category` → Maps to: "Free Access" | "Demo" | (null/blank)

#### Categories:
| Plan Type | Source Field | Condition |
|-----------|-------------|-----------|
| **Advanced** | `custom_plan` | Equals "advanced" (case-insensitive) |
| **Intermediate** | `custom_plan` | Equals "intermediate" (case-insensitive) |
| **Basic** | `custom_plan` | Equals "basic" (case-insensitive) |
| **Free Access** | `student_category` | Equals "Free Access" |
| **Demo** | `student_category` | Equals "Demo" |

**API Call:**
```
GET /resource/Program Enrollment
fields: ["student", "custom_plan", "student_category"]
filters: [
  ["docstatus", "=", 1],
  ["student", "in", [student_ids]],
]
order_by: "enrollment_date desc"
```
*Note: Only the latest enrollment per student is counted*

---

## ❓ Why Are There N/A Students?

### Root Cause Analysis
A student appears in the **N/A (2 students for Kadavanthra)** when:

#### Scenario 1: **No Program Enrollment Record**
- Student is **enabled** in the Student doctype
- Student has **NO Program Enrollment record** (docstatus=1)
- Therefore: Cannot be categorized into any plan

#### Scenario 2: **Incomplete Program Enrollment**
- Student **has a Program Enrollment record**, but:
  - `custom_plan` is **null/blank** AND
  - `student_category` is **null/blank**
- Record is submitted (docstatus=1) but lacks both plan info

#### Scenario 3: **Invalid Plan Value**
- Student has Program Enrollment with a `custom_plan` value that doesn't match:
  - "advanced"
  - "intermediate"  
  - "basic"
- And `student_category` is also not "Free Access" or "Demo"

---

## 🏗️ UI Component Hierarchy

### Where N/A Count Is Displayed

**File:** [src/app/dashboard/director/students/page.tsx](src/app/dashboard/director/students/page.tsx#L169)

**Component:** `BranchCard` (branch-level view)

**Rendering Logic:**
```tsx
{branchNaPlanCount > 0 && (
  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 rounded-full px-2 py-0.5">
    <span className="w-1 h-1 rounded-full bg-cyan-500" />
    {branchNaPlanCount} N/A  <!-- Cyan colored badge -->
  </span>
)}
```

**Display Context:**
- Shows only if `branchNaPlanCount > 0`
- Cyan color badge (#06B6D4 family)
- Appears after Advanced/Intermediate/Basic grid
- Also shown with Free Access and Demo badges

---

## 🔗 API Flow

### Frontend → Backend Data Flow

```
DirectorStudentsPage
│
├─ getActiveStudentCountForBranch("Kadavanthra")
│  └─ Returns: 13 (total active)
│
├─ getStudentCountByPlanForBranch("Kadavanthra")
│  ├─ Fetch all active student IDs
│  ├─ For each student ID batch:
│  │  └─ Query latest Program Enrollment
│  │     └─ Group by custom_plan & student_category
│  ├─ Count each category
│  └─ Returns: {advanced: 2, intermediate: 0, basic: 9, freeAccess: 0, demo: 0}
│     (Total counted = 11)
│
└─ Calculate N/A:
   branchNaPlanCount = 13 - 11 = 2 ✓
```

---

## 📊 Kadavanthra Branch Current State

**Observed Values (from screenshot):**
- Total Active: **13**
- Advanced: **2**
- Intermediate: **0**
- Basic: **9**
- Free Access: **0**
- Demo: **0**
- **N/A: 2** ← 2 students unaccounted for

**Status:**
- 11 students have defined plans
- **2 students have NO program enrollment OR incomplete enrollment data**

---

## 🛠️ Diagnostic Steps (Backend)

To find which students are N/A for Kadavanthra:

### Query 1: Get all active students in Kadavanthra
```sql
SELECT name FROM `tabStudent` 
WHERE custom_branch = "Kadavanthra" 
AND enabled = 1
LIMIT 500;
```

### Query 2: Get all students WITH Program Enrollments
```sql
SELECT DISTINCT student FROM `tabProgram Enrollment`
WHERE docstatus = 1 
AND student IN (
  SELECT name FROM `tabStudent` 
  WHERE custom_branch = "Kadavanthra" AND enabled = 1
);
```

### Query 3: Find the N/A Students (set difference)
**Students in Query 1 but NOT in Query 2** = **N/A Students**

---

## 🎯 The N/A Count Represents

| Aspect | Details |
|--------|---------|
| **Name** | N/A Plan Students |
| **Definition** | Active students without categorized enrollment |
| **Count for Kadavanthra** | 2 students |
| **Data Source** | Calculated from Student + Program Enrollment |
| **When it shows** | Only if count > 0 |
| **Color** | Cyan (#06B6D4) |
| **Why it exists** | Data quality issue — missing or incomplete enrollment records |

---

## 📁 Relevant Code Files

| File | Purpose |
|------|---------|
| [src/app/dashboard/director/students/page.tsx](src/app/dashboard/director/students/page.tsx#L65) | N/A calculation logic |
| [src/lib/api/director.ts](src/lib/api/director.ts#L221) | `getStudentCountByPlanForBranch()` function |
| [src/app/api/director/branch-academics/route.ts](src/app/api/director/branch-academics/route.ts#L141) | Backend plan count calculation |

---

## ✅ Next Steps (Awaiting Your Command)

1. **Investigate:** Query backend to identify which 2 students are N/A
2. **Fix Options:**
   - Create missing Program Enrollment records
   - Update incomplete Program Enrollment records with valid plan
   - Or hide N/A if it's not relevant to your use case

*Ready to implement once you confirm the approach.*
