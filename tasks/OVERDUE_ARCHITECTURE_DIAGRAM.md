# Overdue Page - Architecture & Flow Diagram

## 🏗️ CURRENT vs REQUIRED ARCHITECTURE

### ❌ CURRENT (WRONG)
```
┌─────────────────────────────────────────────┐
│  Branch Manager Fees Page                   │
│  ├─ Total Fees Card                         │
│  ├─ Collected Card                          │
│  ├─ Pending Card → /fees/pending ✓          │
│  ├─ Overdue Card → /fees/pending ❌ WRONG   │
│  ├─ Collection Rate Card                    │
│  └─ Forfeited Card                          │
└─────────────────────────────────────────────┘
                         ↓
         /dashboard/branch-manager/fees/pending
                         ↓
              Shows BOTH Pending AND Overdue
              (No separation by status)
```

### ✅ REQUIRED (CORRECT)
```
┌────────────────────────────────────────────────┐
│  Branch Manager Fees Page                      │
│  ├─ Total Fees Card                            │
│  ├─ Collected Card                             │
│  ├─ Pending Card → /fees/pending ✓             │
│  ├─ Overdue Card → /fees/overdue ✅ NEW        │
│  ├─ Collection Rate Card                       │
│  └─ Forfeited Card                             │
└────────────────────────────────────────────────┘
           ↓                          ↓
   /fees/pending            /fees/overdue (NEW)
      ↓                           ↓
  Class List                  Class List
  (Pending only)           (Overdue only)
      ↓                           ↓
  [classId]/                [classId]/
      ↓                           ↓
  Batch List                  Batch List
      ↓                           ↓
  [batchId]/                [batchId]/
      ↓                           ↓
  Invoice Details           Invoice Details
```

---

## 📁 FILE STRUCTURE TREE

### Files to CREATE (New Overdue Pages)
```
src/app/dashboard/branch-manager/fees/overdue/
├── page.tsx                           ← ClassOverdueFeesPage (NEW)
│   ├── getClassOverdueSummary()
│   ├── Filter by search
│   ├── Show class-wise overdue breakdown
│   └── Link to [classId]/page.tsx
│
├── [classId]/
│   └── page.tsx                       ← BatchOverdueFeesPage (NEW)
│       ├── getBatchOverdueSummary()
│       ├── Show batch-wise overdue
│       └── Link to [batchId]/page.tsx
│
└── [classId]/[batchId]/
    └── page.tsx                       ← StudentOverdueFeesPage (NEW)
        ├── getSalesInvoices() with overdue filter
        ├── Show individual invoices
        └── Sort by days_overdue

src/app/api/fees/
├── class-overdue-summary/route.ts     ← Backend API (NEW)
│   └── Filters: docstatus=1, outstanding>0, due_date<today
│   └── Groups by: item_code (class)
│
└── batch-overdue-summary/route.ts     ← Backend API (NEW)
    └── Filters: same + classId
    └── Groups by: batch
```

### Files to MODIFY (Existing)
```
src/app/dashboard/branch-manager/fees/page.tsx
  └── Change: StatsCard href="/fees/pending" → "/fees/overdue"

src/lib/api/fees.ts
  └── Add: getClassOverdueSummary()
  └── Add: getBatchOverdueSummary()

src/lib/types/fee.ts
  └── Add: ClassOverdueSummary interface
  └── Add: BatchOverdueSummary interface
```

---

## 🔄 DATA FLOW DIAGRAM

### Overdue Data Flow
```
Frontend (Overdue Page)
        ↓
getClassOverdueSummary(company)
        ↓
GET /api/fees/class-overdue-summary?company=X
        ↓
Backend Route Handler
    ├─ Fetch all Sales Invoices
    ├─ Filter: docstatus=1, outstanding_amount>0, due_date<TODAY
    ├─ Group by item_code (class)
    ├─ Calculate: student_count, total_outstanding, days_overdue
    └─ Return ClassOverdueSummary[]
        ↓
Frontend receives array
    ├─ Render class cards/table
    ├─ Each row is clickable
    └─ On click: navigate to [classId]/page.tsx

[classId]/page.tsx
    ├─ getBatchOverdueSummary(classId, company)
    ├─ GET /api/fees/batch-overdue-summary?class=X&company=Y
    └─ Display batches with overdue breakdown

[classId]/[batchId]/page.tsx
    ├─ getSalesInvoices({
    │   outstanding_only: true,
    │   docstatus: 1,
    │   due_date_filter: "< today",
    │   class: classId,
    │   batch: batchId
    │ })
    └─ Display individual invoices sorted by days_overdue
```

---

## 🎯 COMPARISON: PENDING vs OVERDUE

### Pending Page Filter
```typescript
// Get pending invoices (no due date yet or not overdue)
activePendingFees.filter(inv => 
  inv.outstanding_amount > 0 
  // No due date filter - includes everything not collected
)
```

### Overdue Page Filter
```typescript
// Get ONLY overdue invoices (past due)
activePendingFees.filter(inv => 
  inv.outstanding_amount > 0 
  && inv.due_date < today
)
```

---

## 📊 API RESPONSE STRUCTURE

### Class Overdue Summary Response
```json
[
  {
    "item_code": "CLASS-001",
    "item_name": "Grade 10-A",
    "student_count": 5,
    "total_outstanding": 45000,
    "days_overdue": 15
  },
  {
    "item_code": "CLASS-002",
    "item_name": "Grade 11-B",
    "student_count": 3,
    "total_outstanding": 25000,
    "days_overdue": 8
  }
]
```

### Batch Overdue Summary Response
```json
[
  {
    "batch_code": "BATCH-001",
    "batch_name": "2024-Jan Batch",
    "student_count": 3,
    "total_outstanding": 20000,
    "days_overdue": 12
  },
  {
    "batch_code": "BATCH-002",
    "batch_name": "2024-Feb Batch",
    "student_count": 2,
    "total_outstanding": 25000,
    "days_overdue": 8
  }
]
```

### Student Invoice Response (Filtered)
```json
{
  "data": [
    {
      "name": "SI-2024-001",
      "customer_name": "Student A",
      "due_date": "2024-04-10",
      "outstanding_amount": 15000,
      "days_overdue": 17,
      "invoice_date": "2024-03-10"
    },
    {
      "name": "SI-2024-002",
      "customer_name": "Student B",
      "due_date": "2024-04-15",
      "outstanding_amount": 10000,
      "days_overdue": 12,
      "invoice_date": "2024-03-15"
    }
  ]
}
```

---

## 🔍 KEY DIFFERENCES (Pending vs Overdue)

| Component | Pending | Overdue |
|-----------|---------|---------|
| **Purpose** | Show invoices not yet collected | Show invoices that are past due date |
| **Filter Logic** | `outstanding_amount > 0` | `outstanding_amount > 0 AND due_date < today` |
| **Calculation** | Only checks for outstanding amount | Compares due_date with today |
| **Impact** | Invoices with/without due dates | Only invoices with due dates that passed |
| **Card Color** | Warning (Yellow) | Error (Red) |
| **Urgency** | Medium | High (Past due) |
| **API Endpoints** | `/api/fees/class-summary` | `/api/fees/class-overdue-summary` (NEW) |

---

## 🛠️ IMPLEMENTATION ORDER

### Phase 1: Backend Setup
1. Create `/api/fees/class-overdue-summary/route.ts`
2. Create `/api/fees/batch-overdue-summary/route.ts`
3. Ensure Frappe queries are correct

### Phase 2: Frontend Utilities
4. Add types to `src/lib/types/fee.ts`
5. Add API functions to `src/lib/api/fees.ts`

### Phase 3: UI Pages
6. Create `overdue/page.tsx` (Class List)
7. Create `overdue/[classId]/page.tsx` (Batch List)
8. Create `overdue/[classId]/[batchId]/page.tsx` (Invoice Details)

### Phase 4: Integration
9. Update `fees/page.tsx` StatsCard href
10. Test end-to-end flow

---

## ✨ BENEFITS OF CORRECT STRUCTURE

✅ **Clear Separation:** Pending vs Overdue are distinct views  
✅ **Better UX:** Users know exactly what status each invoice is in  
✅ **Faster Navigation:** Dedicated overdue page with optimized queries  
✅ **Scalability:** Can easily add more status filters (e.g., "Due Today", "Due This Week")  
✅ **Follows Pattern:** Matches existing pending page structure  
✅ **Priority Visibility:** Overdue items are highlighted separately in red

