# Overdue Fee Page Structure - Deep Analysis

## 🔴 CURRENT ISSUE

**Problem:** When clicking the **Overdue** card in the Branch Manager fee page, it redirects to the **Pending** page instead of an **Overdue-specific** page.

### Current Flow (WRONG)
```
Fees Page → Overdue Card (href="/dashboard/branch-manager/fees/pending") 
  ↓
Shows ALL Pending Fees (both pending & overdue mixed)
```

### Required Flow (CORRECT)
```
Fees Page → Overdue Card (href="/dashboard/branch-manager/fees/overdue") 
  ↓
Overdue Fees by Class Page (only overdue)
  ↓
Can click class → Batch-wise Overdue Breakdown
```

---

## 📊 CURRENT STRUCTURE (Pending = Reference Model)

### 1. **Main Fees Page**
- **File:** `src/app/dashboard/branch-manager/fees/page.tsx`
- **Calculates:**
  - `overdueInvoices` = invoices with `due_date < today`
  - `overdueTotal` = sum of outstanding amounts
- **Card Definition:**
  ```typescript
  href="/dashboard/branch-manager/fees/pending" // ❌ WRONG - Should be "/overdue"
  ```

### 2. **Pending Page Structure (REFERENCE MODEL)**
```
/dashboard/branch-manager/fees/
├── pending/
│   ├── page.tsx (ClassPendingFeesPage)
│   │   ├── Fetches: getClassPendingSummary() → ClassPendingSummary[]
│   │   ├── Shows: class-wise pending breakdown
│   │   └── Links to: [classId]/page.tsx
│   │
│   └── [classId]/
│       └── page.tsx (BatchPendingFeesPage)
│           ├── Fetches: getBatchPendingSummary(classId)
│           ├── Shows: batch-wise breakdown per class
│           └── Links to: [batchId]/page.tsx
│
│       └── [classId]/[batchId]/
│           └── page.tsx (StudentPendingFeesPage)
│               ├── Fetches: individual student invoices
│               └── Shows: all pending invoices for batch
```

### 3. **API Endpoints Used by Pending**
```typescript
// File: src/lib/api/fees.ts
getClassPendingSummary(company)
  → GET /api/fees/class-summary?company=X
  → Returns: ClassPendingSummary[] with pending data

getBatchPendingSummary(classId, company)
  → GET /api/fees/batch-summary?class=X&company=Y
  → Returns: BatchPendingSummary[] with pending data
```

### 4. **Data Types (Pending)**
```typescript
// File: src/lib/types/fee.ts
interface ClassPendingSummary {
  item_code: string;           // Class ID
  item_name: string;           // Class name
  student_count: number;       // Students in this class
  total_outstanding: number;   // Pending amount
}

interface BatchPendingSummary {
  batch_code: string;
  batch_name: string;
  student_count: number;
  total_outstanding: number;
}
```

---

## 🔧 REQUIRED CHANGES

### Change 1: Update StatsCard Overdue href
**File:** `src/app/dashboard/branch-manager/fees/page.tsx` (Line ~330)

**Current:**
```typescript
<StatsCard
  title="Overdue Invoices"
  value={...}
  icon={<Clock className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/pending"  // ❌ WRONG
  color="error"
/>
```

**New:**
```typescript
<StatsCard
  title="Overdue Invoices"
  value={...}
  icon={<Clock className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/overdue"  // ✅ CORRECT
  color="error"
/>
```

---

### Change 2: Add API Filter for Overdue
**File:** `src/lib/api/fees.ts`

**Add New Function:**
```typescript
// Fetch class-wise OVERDUE fee summary
export async function getClassOverdueSummary(company?: string): Promise<ClassOverdueSummary[]> {
  const params = new URLSearchParams();
  if (company) params.append("company", company);
  
  const response = await fetch(
    `/api/fees/class-overdue-summary?${params}`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to fetch overdue summary");
  return response.json();
}

// Fetch batch-wise OVERDUE fee summary
export async function getBatchOverdueSummary(
  classId: string,
  company?: string
): Promise<BatchOverdueSummary[]> {
  const params = new URLSearchParams({ class: classId });
  if (company) params.append("company", company);
  
  const response = await fetch(
    `/api/fees/batch-overdue-summary?${params}`,
    { credentials: "include" }
  );
  if (!response.ok) throw new Error("Failed to fetch batch overdue summary");
  return response.json();
}
```

---

### Change 3: Add Data Types
**File:** `src/lib/types/fee.ts`

**Add New Types:**
```typescript
interface ClassOverdueSummary {
  item_code: string;           // Class ID
  item_name: string;           // Class name
  student_count: number;       // Students with overdue
  total_outstanding: number;   // Overdue amount
  days_overdue: number;        // Max days overdue in class
}

interface BatchOverdueSummary {
  batch_code: string;
  batch_name: string;
  student_count: number;       // Students with overdue in batch
  total_outstanding: number;   // Overdue amount in batch
  days_overdue: number;
}
```

---

### Change 4: Create Overdue Pages Structure
```
NEW STRUCTURE:
src/app/dashboard/branch-manager/fees/
└── overdue/
    ├── page.tsx (ClassOverdueFeesPage) ← NEW
    │   ├── Title: "Overdue Fees by Class"
    │   ├── Fetches: getClassOverdueSummary()
    │   ├── Shows: class-wise overdue breakdown
    │   └── Links to: [classId]/page.tsx
    │
    ├── [classId]/
    │   └── page.tsx (BatchOverdueFeesPage) ← NEW
    │       ├── Title: "Overdue Fees - [ClassName]"
    │       ├── Fetches: getBatchOverdueSummary(classId)
    │       ├── Shows: batch-wise overdue breakdown
    │       └── Links to: [batchId]/page.tsx
    │
    └── [classId]/[batchId]/
        └── page.tsx (StudentOverdueFeesPage) ← NEW
            ├── Title: "Overdue Student Invoices"
            ├── Fetches: pending invoices filtered by due_date < today
            └── Shows: all overdue invoices for batch
```

---

### Change 5: Backend API Routes
**New Files to Create:**

#### `src/app/api/fees/class-overdue-summary/route.ts` ← NEW
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get("company");

  // Call Frappe backend:
  // GET /api/resource/Sales Invoice with filters:
  // - docstatus = 1 (submitted)
  // - outstanding_amount > 0
  // - due_date < TODAY

  // Group by item_code (class)
  // Count unique customers (students with overdue)
  // Sum outstanding_amount
  // Calculate max days overdue per class

  return Response.json(classOverdueSummaries);
}
```

#### `src/app/api/fees/batch-overdue-summary/route.ts` ← NEW
```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("class");
  const company = searchParams.get("company");

  // Similar to class summary but filtered by classId
  // Group by batch_id from item_group or reference

  return Response.json(batchOverdueSummaries);
}
```

---

## 📈 COMPLETE NEW FILE STRUCTURE

### 1. **Class Overdue List Page** `src/app/dashboard/branch-manager/fees/overdue/page.tsx`

**Features:**
- Shows all classes with overdue invoices
- Displays: Class Name, Student Count (with overdue), Total Overdue Amount, Days Overdue
- Filterable/searchable by class name
- Click class → go to batch breakdown

**Data Flow:**
```
useEffect → getClassOverdueSummary(company) → setState → render table/cards
```

### 2. **Batch Overdue List Page** `src/app/dashboard/branch-manager/fees/overdue/[classId]/page.tsx`

**Features:**
- Shows all batches in a class with overdue invoices
- Displays: Batch Name, Student Count (with overdue), Total Overdue Amount
- Click batch → go to student invoice details

### 3. **Student Overdue Invoices Page** `src/app/dashboard/branch-manager/fees/overdue/[classId]/[batchId]/page.tsx`

**Features:**
- Shows all individual overdue invoices for students in the batch
- Displays: Student Name, Invoice Number, Due Date, Days Overdue, Outstanding Amount
- Sortable by days overdue (highest first)

---

## 🔄 FILTER LOGIC COMPARISON

### Pending vs Overdue Calculation

**Pending:** `outstanding_amount > 0` (No due date filter)
```typescript
const pendingInvoices = invoices.filter(inv => inv.outstanding_amount > 0);
```

**Overdue:** `outstanding_amount > 0 AND due_date < TODAY`
```typescript
const overdueInvoices = invoices.filter(
  inv => inv.outstanding_amount > 0 && inv.due_date && inv.due_date < today
);
```

---

## 📊 SUMMARY TABLE

| Aspect | Pending | Overdue |
|--------|---------|---------|
| **URL Root** | `/dashboard/.../fees/pending` | `/dashboard/.../fees/overdue` |
| **API Endpoint** | `/api/fees/class-summary` | `/api/fees/class-overdue-summary` |
| **Filter** | `outstanding_amount > 0` | `outstanding_amount > 0 AND due_date < today` |
| **Card Icon** | `AlertTriangle` (yellow) | `Clock` (red) |
| **Color Scheme** | `warning` | `error` |
| **Card Href** | - | Should point to `/overdue` |

---

## ✅ IMPLEMENTATION CHECKLIST

- [ ] Update `StatsCard` href in fees page (Line 330)
- [ ] Add `getClassOverdueSummary()` to `src/lib/api/fees.ts`
- [ ] Add `getBatchOverdueSummary()` to `src/lib/api/fees.ts`
- [ ] Add `ClassOverdueSummary` type to `src/lib/types/fee.ts`
- [ ] Add `BatchOverdueSummary` type to `src/lib/types/fee.ts`
- [ ] Create `src/app/api/fees/class-overdue-summary/route.ts`
- [ ] Create `src/app/api/fees/batch-overdue-summary/route.ts`
- [ ] Create `src/app/dashboard/branch-manager/fees/overdue/page.tsx` (Class List)
- [ ] Create `src/app/dashboard/branch-manager/fees/overdue/[classId]/page.tsx` (Batch List)
- [ ] Create `src/app/dashboard/branch-manager/fees/overdue/[classId]/[batchId]/page.tsx` (Invoice Details)
- [ ] Test flow: Click Overdue → See Classes → Click Class → See Batches → Click Batch → See Invoices

