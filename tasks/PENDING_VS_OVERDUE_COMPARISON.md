# Pending vs Overdue - Side-by-Side Comparison

## 🔄 QUICK COMPARISON TABLE

| Aspect | Pending | Overdue |
|--------|---------|---------|
| **Purpose** | Invoices not collected yet | Invoices past due date |
| **URL** | `/fees/pending` | `/fees/overdue` (NEW) |
| **Card Color** | Warning (Yellow) | Error (Red) |
| **Card Icon** | AlertTriangle | Clock |
| **Filter** | `outstanding_amount > 0` | `outstanding_amount > 0 AND due_date < today` |
| **API Endpoint** | `/api/fees/class-summary` | `/api/fees/class-overdue-summary` (NEW) |
| **Data Type** | ClassPendingSummary | ClassOverdueSummary (NEW) |
| **Includes** | All unpaid invoices | Only overdue unpaid invoices |
| **Urgency** | Normal | HIGH (Past Due) |

---

## 📊 FILTER LOGIC DIFFERENCE

### Pending Filter Logic
```typescript
// File: src/app/dashboard/branch-manager/fees/page.tsx (Line 75-76)
const activePendingFees = pendingFees.filter(inv => {
  // No due_date check - includes everything not collected
  return inv.outstanding_amount > 0;
});

// Example: Invoices with pending status are shown
// 1. Invoice with due_date 2026-05-10 (not yet due) → SHOWN
// 2. Invoice with due_date 2026-04-20 (past due) → SHOWN  ← Now on Overdue too!
// 3. Invoice with no due_date → SHOWN
```

### Overdue Filter Logic (NEW)
```typescript
// File: src/app/dashboard/branch-manager/fees/overdue/page.tsx (NEW)
const today = new Date().toISOString().split("T")[0];
const overdueInvoices = activePendingFees.filter(inv => {
  // Only items with due_date < today
  return inv.outstanding_amount > 0 && inv.due_date && inv.due_date < today;
});

// Example: Only overdue invoices are shown
// 1. Invoice with due_date 2026-05-10 (not yet due) → HIDDEN
// 2. Invoice with due_date 2026-04-20 (past due) → SHOWN  ← Overdue!
// 3. Invoice with no due_date → HIDDEN
```

---

## 📁 URL ROUTING STRUCTURE

### Pending Routes (EXISTING)
```
/dashboard/branch-manager/fees
    │
    ├─ /dashboard/branch-manager/fees/pending
    │      ├─ Shows: All classes with pending invoices
    │      └─ Links to: [classId]
    │
    ├─ /dashboard/branch-manager/fees/pending/[classId]
    │      ├─ Shows: All batches in class with pending invoices
    │      └─ Links to: [batchId]
    │
    └─ /dashboard/branch-manager/fees/pending/[classId]/[batchId]
           └─ Shows: All student invoices (pending status)
```

### Overdue Routes (NEW)
```
/dashboard/branch-manager/fees
    │
    ├─ /dashboard/branch-manager/fees/overdue          ← NEW
    │      ├─ Shows: All classes with overdue invoices
    │      └─ Links to: [classId]
    │
    ├─ /dashboard/branch-manager/fees/overdue/[classId]          ← NEW
    │      ├─ Shows: All batches in class with overdue invoices
    │      └─ Links to: [batchId]
    │
    └─ /dashboard/branch-manager/fees/overdue/[classId]/[batchId]  ← NEW
           └─ Shows: All student invoices (overdue only)
```

---

## 🔗 REDIRECTION FLOW

### BEFORE (WRONG) ❌
```
Fees Page
    ↓
Click Overdue Card
    ↓
href="/dashboard/branch-manager/fees/pending"
    ↓
Pending Page (Shows ALL unpaid, not just overdue)
    ↓
Cannot easily see ONLY overdue invoices
```

### AFTER (CORRECT) ✅
```
Fees Page
    ↓
Click Overdue Card
    ↓
href="/dashboard/branch-manager/fees/overdue"
    ↓
Overdue Page (Shows ONLY overdue invoices)
    ↓
User can easily see exactly which invoices are overdue
```

---

## 📋 DATA STRUCTURE COMPARISON

### ClassPendingSummary (EXISTING)
```typescript
interface ClassPendingSummary {
  item_code: string;           // "CLASS-001"
  item_name: string;           // "Grade 10-A"
  student_count: number;       // 45 (all students with pending, including partial)
  total_outstanding: number;   // 450000 (all pending amounts)
}
// This includes BOTH:
// - Due today: 10000
// - Due tomorrow: 20000
// - Overdue 5 days: 30000
```

### ClassOverdueSummary (NEW)
```typescript
interface ClassOverdueSummary {
  item_code: string;           // "CLASS-001"
  item_name: string;           // "Grade 10-A"
  student_count: number;       // 5 (ONLY students with overdue)
  total_outstanding: number;   // 45000 (ONLY overdue amounts)
  days_overdue: number;        // 5 (max days overdue in this class)
}
// This includes ONLY:
// - Overdue 5 days: 30000
// - Overdue 2 days: 15000
// (Everything else filtered out)
```

---

## 🎯 CARD DEFINITIONS

### Pending Card (EXISTING)
```typescript
// src/app/dashboard/branch-manager/fees/page.tsx
<StatsCard
  title="Pending Invoices"
  value={`${pendingInvoices.length} (${formatCurrency(pendingTotal)})`}
  icon={<AlertTriangle className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/pending"  // ✅ Correct
  color="warning"
/>
```

### Overdue Card (EXISTING - WRONG)
```typescript
// BEFORE: src/app/dashboard/branch-manager/fees/page.tsx
<StatsCard
  title="Overdue Invoices"
  value={`${overdueInvoices.length} (${formatCurrency(overdueTotal)})`}
  icon={<Clock className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/pending"  // ❌ WRONG - should be /overdue
  color="error"
/>
```

### Overdue Card (FIXED)
```typescript
// AFTER: src/app/dashboard/branch-manager/fees/page.tsx
<StatsCard
  title="Overdue Invoices"
  value={`${overdueInvoices.length} (${formatCurrency(overdueTotal)})`}
  icon={<Clock className="h-5 w-5" />}
  href="/dashboard/branch-manager/fees/overdue"  // ✅ CORRECT - new route
  color="error"
/>
```

---

## 🔧 API ENDPOINTS COMPARISON

### Pending API (EXISTING)
```
GET /api/fees/class-summary?company=X

Response:
[
  {
    "item_code": "CLASS-001",
    "item_name": "Grade 10-A",
    "student_count": 45,           // All with pending (any status)
    "total_outstanding": 450000    // All unpaid amounts
  }
]
```

### Overdue API (NEW)
```
GET /api/fees/class-overdue-summary?company=X

Response:
[
  {
    "item_code": "CLASS-001",
    "item_name": "Grade 10-A",
    "student_count": 5,            // ONLY with overdue
    "total_outstanding": 45000,    // ONLY overdue amounts
    "days_overdue": 5              // Max days overdue
  }
]
```

---

## 💾 DATABASE QUERY DIFFERENCE

### Pending Query
```sql
-- Get all unpaid invoices
SELECT 
  item_code,
  COUNT(DISTINCT customer) as student_count,
  SUM(outstanding_amount) as total_outstanding
FROM `tabSales Invoice`
WHERE docstatus = 1
  AND outstanding_amount > 0
GROUP BY item_code;
```

### Overdue Query
```sql
-- Get only overdue invoices
SELECT 
  item_code,
  COUNT(DISTINCT customer) as student_count,
  SUM(outstanding_amount) as total_outstanding,
  MAX(DATEDIFF(CURDATE(), due_date)) as days_overdue
FROM `tabSales Invoice`
WHERE docstatus = 1
  AND outstanding_amount > 0
  AND due_date < CURDATE()           -- ← Only overdue
GROUP BY item_code;
```

---

## 📊 EXAMPLE DATA WALKTHROUGH

### Sample Invoices
```
Invoice  | Student | Class      | Due Date   | Outstanding | Status
---------|---------|------------|------------|-------------|----------
SI-001   | Alice   | CLASS-001  | 2026-04-10 | 10000       | Overdue (17 days)
SI-002   | Bob     | CLASS-001  | 2026-04-15 | 12000       | Overdue (12 days)
SI-003   | Charlie | CLASS-001  | 2026-04-20 | 15000       | Overdue (7 days)
SI-004   | David   | CLASS-001  | 2026-05-05 | 8000        | Pending (8 days until due)
SI-005   | Eve     | CLASS-001  | 2026-05-15 | 5000        | Pending (18 days until due)
```

### Pending Page Shows (CURRENT)
```
CLASS-001:
├─ Total Outstanding: 50,000 (all 5 invoices)
├─ Student Count: 5
└─ Invoices Shown: ALL (even ones not yet due)
```

### Overdue Page Shows (NEW)
```
CLASS-001:
├─ Total Outstanding: 37,000 (only SI-001, SI-002, SI-003)
├─ Student Count: 3 (only Alice, Bob, Charlie)
├─ Days Overdue: 17 (max of 17, 12, 7)
└─ Invoices Shown: ONLY overdue (SI-001, SI-002, SI-003)
```

---

## 🎯 EXPECTED USER BEHAVIOR

### Current (WRONG) Flow
1. User sees "Overdue: 3 invoices" in red ⚠️
2. User clicks Overdue card
3. User is taken to `/pending` page
4. User sees: "Pending Fees - Class 1: 45 students, ₹450,000" ❌
5. User is confused: Where are my overdue invoices? This shows everything!

### Fixed (CORRECT) Flow
1. User sees "Overdue: 3 invoices" in red ⚠️
2. User clicks Overdue card
3. User is taken to `/overdue` page ✅
4. User sees: "Overdue Fees - Class 1: 3 students, ₹37,000" ✅
5. User immediately knows exactly which invoices are overdue! 🎯

---

## 🔐 PROTECTED DATA POLICY

✅ **NO backend data is deleted or modified**
- Only new API routes for READ operations
- Only new frontend pages
- Existing pending functionality stays intact
- Only the Overdue card href is changed

---

## ✨ BENEFITS SUMMARY

| Benefit | Impact |
|---------|--------|
| **Clear Separation** | Users see Pending vs Overdue separately |
| **Correct Navigation** | Overdue card now leads to overdue page |
| **Better UX** | No more confusion between statuses |
| **Efficient Filtering** | Server returns only relevant data |
| **Scalability** | Easy to add more status filters later |
| **Professional** | Matches industry standard fee management UIs |
| **No Data Loss** | Zero risk - only adding features |

