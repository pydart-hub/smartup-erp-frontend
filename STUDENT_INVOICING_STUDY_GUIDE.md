# Student Invoice Generation System — Complete Study Guide

**Last Updated:** May 11, 2026  
**Status:** 📚 Reference Documentation

---

## 1. SYSTEM OVERVIEW

### High-Level Flow

```
ADMISSION WORKFLOW
├─ Student → Branch Manager → New Student Form
├─ Selects: plan (Basic/Intermediate/Advanced), instalments (1/4/6/8)
├─ Fee config fetched from XLSX (fee amounts per plan + instalment option)
├─ Step 1-7: Create Student, Customer, Program Enrollment, batch assignment
├─ Step 8: Create Sales Order (SO)
│  ├─ Customer: auto-created
│  ├─ Items: 1 item × qty=number_of_instalments × rate=total_fee
│  ├─ Custom fields: plan, instalments, academic_year, student
│  ├─ Status: Submitted (To Deliver and Bill)
│  └─ example: SAL-ORD-2026-00001
│
├─ Step 9: Call /api/admission/create-invoices
│  ├─ Input: SO name + instalment schedule
│  ├─ For each instalment:
│  │  ├─ Create Sales Invoice (SI)
│  │  ├─ qty=1, rate=instalment_amount, due_date=calculated_date
│  │  ├─ Submit SI
│  │  └─ Add to response array
│  ├─ Send WhatsApp to guardian with payment link
│  └─ Returns: { invoices: ["ACC-SINV-2026-00001", ...] }
│
└─ Step 10: Frontend shows success + invoice list
```

### Key Entities

| Entity | Purpose | Example |
|--------|---------|---------|
| **Sales Order (SO)** | Master record for student billing | `SAL-ORD-2026-00660` |
| **Sales Invoice (SI)** | Individual payment due instance | `ACC-SINV-2026-05-0001` |
| **Customer** | Link to student's payment account | Auto-created from student name |
| **Payment Entry (PE)** | Records actual payment received | `PEN-2026-05-0001` |
| **Program Enrollment (PE)** | Student's course registration | Links to batch, plan, fee structure |

---

## 2. FILE-BY-FILE BREAKDOWN

### A. Invoice Creation Endpoints

#### File: `src/app/api/admission/create-invoices/route.ts`

**Purpose:** Creates Sales Invoices from a submitted Sales Order

**Key Function:** `POST /api/admission/create-invoices`

**Input:**
```json
{
  "salesOrderName": "SAL-ORD-2026-00660",
  "schedule": [
    { "label": "Q1", "amount": 9750, "dueDate": "2026-06-30", "discountApplied": 0 },
    { "label": "Q2", "amount": 9750, "dueDate": "2026-09-30", "discountApplied": 0 },
    { "label": "Q3", "amount": 9750, "dueDate": "2026-12-31", "discountApplied": 0 },
    { "label": "Q4", "amount": 9750, "dueDate": "2027-03-31", "discountApplied": 0 }
  ]
}
```

**Flow:**
1. **Fetch SO** — Get full SO document with `customer`, `company`, `student`, `items[0]`
2. **Poll for billing readiness** — Wait up to 4.8 seconds for `billing_status="Not Billed"`
   - Ensures SO is committed to database before creating invoices
   - Retry logic: Check → 500ms wait → Check again
3. **Create SI per instalment** — For each item in schedule:
   ```typescript
   {
     doctype: "Sales Invoice",
     customer: SO.customer,
     company: SO.company,
     posting_date: today,
     due_date: instalment.dueDate,
     student: SO.student,
     custom_academic_year: academicYear,
     items: [{
       item_code: SO_ITEM.item_code,
       item_name: SO_ITEM.item_name,
       qty: 1,
       rate: instalment.amount,  // ← per-instalment amount
       sales_order: SO.name,      // ← link back to SO
       so_detail: SO_ITEM.name    // ← link to SO item line
     }]
   }
   ```
4. **Submit each SI** — Convert from draft to submitted (docstatus 1)
5. **Send WhatsApp** — Guardian gets payment link via `buildInvoiceGenerated()`
6. **Return results**:
   ```json
   {
     "invoices": ["ACC-SINV-2026-05-0001", "ACC-SINV-2026-05-0002", ...],
     "drafts": [], // If submission failed
     "failed": []  // If creation failed
   }
   ```

**Error Handling:**
- **Creation failure** → Added to `failedInstalments[]`, retry once after 2s pause
- **Submission failure** → Left in draft state, admin submits manually
- **SO polling timeout** → Log warning, continue anyway (SO may still work)
- **WhatsApp failure** → Non-blocking (invoice still created)

**Critical Details:**
- Uses `sales_order` and `so_detail` fields to link SI back to SO
- This prevents overbilling (Frappe tracks billed qty)
- Each SI gets `qty=1` so total billed qty = number of invoices
- Due dates must be calculated from enrollment_date + instalment schedule

---

#### File: `src/app/api/one-to-one/regenerate-billing/route.ts`

**Purpose:** Creates/regenerates Sales Orders and Invoices for one-to-one tuition students

**Similar to admission but different:**
- Input: Student ID + action (`"sales-order"` or `"sales-invoice"`)
- Calculates amount from One-to-One Monthly Schedule (planned_classes × rate_per_class)
- Creates SO only if needed (check first)
- Creates SI only if SO exists

**Key Difference:** 
- Admission uses fixed instalment schedule from fee config
- One-to-one uses dynamic schedule from tutor-logged sessions

---

### B. Sales API Utilities

#### File: `src/lib/api/sales.ts`

**Key Functions:**

```typescript
// Get list of Sales Orders
getSalesOrders(params: {
  customer?: string;
  company?: string;
  status?: "Draft" | "Submitted" | "Cancelled";
  search?: string;
})

// Get single SO with full details
getSalesOrder(name: string)

// Create SI from SO (maps fields)
createInvoiceFromOrder(salesOrderName: string)

// List SIs with filters
getSalesInvoices(params: {
  customer?: string;
  sales_order?: string;
  docstatus?: 0 | 1 | 2;
  outstanding_only?: boolean;
})

// Get single SI
getSalesInvoice(name: string)

// Create SI draft (manual)
createSalesInvoice(payload: SalesInvoiceFormData)

// Submit draft SI
submitSalesInvoice(name: string)
```

---

### C. Frontend Components

#### File: `src/app/dashboard/branch-manager/students/[id]/page.tsx`

**What User Sees:**
- List of SOs for this student
- List of SIs linked to each SO
- Regenerate buttons (if missing)
- Payment progress bar
- Invoice detail cards with due dates and amounts

**Key Mutations:**
```typescript
handleRegenerateBilling(action: O2OBillingAction)
  ↓ calls /api/one-to-one/regenerate-billing
  ↓ shows toast: "Sales Order X generated" or "Invoice Y generated"
```

---

## 3. THE INSTALMENT SCHEDULE

### How It's Calculated

**Source:** Fee configuration from XLSX (fetched per branch, plan, academic year)

**Example for "9th CBSE Intermediate 2026-27":**
```json
{
  "plan": "Intermediate",
  "academic_year": "2026-2027",
  "quarterly_total": 39000,
  "instalments": {
    "1": { "amount": 39000, "label": "Full Payment" },
    "4": { 
      "amounts": [9750, 9750, 9750, 9750],
      "labels": ["Q1", "Q2", "Q3", "Q4"],
      "due_dates_relative_days": [90, 180, 270, 360]  // Days from enrollment_date
    },
    "6": { /* ... */ },
    "8": { /* ... */ }
  }
}
```

### Discount Application

**Demo-to-regular students:** 
- Paid as demo earlier (e.g., ₹499)
- Discount applied: First invoice reduced by demo amount
- `discountApplied` field tracks this per instalment

**Admission discounts:**
- Applied retroactively to last instalment(s)
- Tracked in invoice description

---

## 4. SALES ORDER vs SALES INVOICE

### Sales Order (SO) Structure

```
SAL-ORD-2026-00660
├─ Customer: "Ithika Saju"
├─ Company: "Smart Up Fortkochi"
├─ Items (1 row):
│  ├─ Item Code: "10th CBSE Tuition Fee"
│  ├─ Item Name: "10th CBSE Tuition Fee"
│  ├─ Qty: 4 (number of instalments)
│  ├─ Rate: 9750 (per instalment)
│  ├─ Amount: 39000 (total)
│  └─ Status: "Delivered and Billed" (after invoices created)
├─ Custom Fields:
│  ├─ plan: "Intermediate"
│  ├─ instalments: 4
│  ├─ academic_year: "2026-2027"
│  └─ student: "STU-FRESHER-001"
├─ Total: 39000
├─ Status: Submitted (To Deliver and Bill)
└─ billing_status: "Not Billed" (before invoices) → "Billed" (after)
```

### Sales Invoice (SI) Structure

```
ACC-SINV-2026-05-0001 (Quarterly 1)
├─ Customer: "Ithika Saju"
├─ Company: "Smart Up Fortkochi"
├─ Posting Date: 2026-05-11
├─ Due Date: 2026-06-30
├─ Items (1 row):
│  ├─ Item Code: "10th CBSE Tuition Fee"
│  ├─ Qty: 1
│  ├─ Rate: 9750 (instalment amount, NOT 39000)
│  ├─ Amount: 9750
│  ├─ Sales Order: "SAL-ORD-2026-00660" ← Link
│  └─ SO Detail: "[line_id]" ← Link to SO item line
├─ Custom Fields:
│  ├─ student: "STU-FRESHER-001"
│  └─ academic_year: "2026-2027"
├─ Grand Total: 9750
├─ Outstanding Amount: 9750 (until paid)
├─ Status: Submitted
└─ Description: "Q1 — 10th CBSE Tuition Fee"
```

**Key Difference:**
- SO has `qty=4, rate=9750` (total = qty × rate = 39000)
- SI has `qty=1, rate=9750` (total = 39000 ÷ 4 = per-instalment)

This prevents **overbilling** — Frappe tracks billed qty per SO item.

---

## 5. INVOICE CREATION WORKFLOW (STEP-BY-STEP)

### Full Timeline

**Time T=0: User clicks "Admit Student"**
```
Frontend Form → submit
  ├─ /api/admission/create-student (fetch student data)
  ├─ /api/admission/create-customer (create customer)
  ├─ /api/admission/create-program-enrollment (enroll in batch)
  ├─ PUT Student (update custom_student_type, academic_year)
  └─ /api/admission/create-sales-order (create SO, return SO name)
```

**Time T=5s: SO is created, now create invoices**
```
/api/admission/create-invoices called with:
  ├─ salesOrderName: "SAL-ORD-2026-00660"
  └─ schedule: [
      { label: "Q1", amount: 9750, dueDate: "2026-06-30" },
      { label: "Q2", amount: 9750, dueDate: "2026-09-30" },
      ...
    ]
```

**Inside create-invoices:**
```
1. Fetch SO (verify it exists, get customer, company, student, items[0])
2. Poll for billing_status = "Not Billed" (up to 4.8s)
3. For each instalment:
   a. Create SI draft
   b. Submit SI (docstatus 0 → 1)
   c. If fails → add to retry list
4. Retry once for failed SIs
5. Send WhatsApp (optional, non-blocking)
6. Return { invoices: [...], drafts: [...], failed: [...] }
```

**Time T=30s: Invoices created**
```
Response sent to frontend:
{
  "success": true,
  "salesOrderName": "SAL-ORD-2026-00660",
  "invoices": [
    "ACC-SINV-2026-05-0001",
    "ACC-SINV-2026-05-0002",
    "ACC-SINV-2026-05-0003",
    "ACC-SINV-2026-05-0004"
  ],
  "log": [...]
}
```

**SO Status After:**
```
billing_status: "Billed" (because all items billed)
per_billed: 100%
```

---

## 6. ITHIKA SAJU CASE (Demo-to-Regular)

### The Problem

**Student:** Ithika Saju (STU-DEMO-001)  
**Branch:** Fortkochi  
**Demo Fee Paid:** ₹499  
**Conversion to:** Regular (Intermediate plan, 4 instalments)  

**Sales Order Created:** ✅ SAL-ORD-2026-00660  
**Sales Invoices:** ❌ Zero (should be 4)

### Root Cause: Background Task Silent Failure

The `/api/admission/convert-to-regular` endpoint previously used:
```typescript
after(async () => {
  try {
    await fetch('/api/admission/create-invoices', {...});
  } catch (err) {
    console.error(...); // ❌ Only logged to console
  }
});

return NextResponse.json({ success: true, invoices: [] });
```

**The Bug:**
- Response sent to frontend immediately ✅
- Background task runs after response sent
- If background task fails, user never sees error
- Only console logs (if admin checks terminal)

**Why Ithika's Invoices Failed:**
- Most likely: SO polling timeout or network issue
- Or: Frappe API returned transient error
- Or: Customer record not fully committed when creating invoices

---

## 7. THE FIX (Already Implemented)

### Change: Background → Inline

**Before:**
```typescript
after(async () => { /* background */ });
return { success: true, invoices: [] }; // ❌ Always empty
```

**After:**
```typescript
try {
  const invoiceRes = await fetch('/api/admission/create-invoices', {
    signal: AbortController with 60-second timeout
  });
  
  if (invoiceRes.ok) {
    createdInvoices = invoiceData.invoices || [];
    log.push(`✓ Created ${createdInvoices.length} invoices`);
  } else {
    invoiceError = `API error: ${invoiceRes.status}`;
    log.push(`❌ ${invoiceError}`);
  }
} catch (err) {
  invoiceError = `Failed: ${err.message}`;
  log.push(`❌ ${invoiceError}`);
}

return { 
  success: true, 
  invoices: createdInvoices,  // ✅ Actual names
  invoiceError: invoiceError, // ✅ Error reported
  log                          // ✅ Full trace
};
```

**Benefits:**
- User sees errors immediately
- Can retry if it fails
- Complete execution log available
- Invoice names returned if successful

---

## 8. DEBUGGING CHECKLIST

### When invoices aren't created:

1. **Check if SO exists:**
   ```
   Go to: smartup.m.frappe.cloud/app/sales-order/SAL-ORD-2026-00660
   Should show customer, items, status=Submitted
   ```

2. **Check SO status:**
   ```
   billing_status should be "Not Billed" initially
   After invoice creation, should be "Billed"
   If still "Not Billed" → invoices creation failed
   ```

3. **Check SO items:**
   ```
   Should have 1 item with:
   - qty = number of instalments (1, 4, 6, or 8)
   - rate = total fee (e.g., 39000)
   - amount = qty × rate
   ```

4. **Look for invoices:**
   ```
   Filter: Sales Invoice
   Filter: sales_order = "SAL-ORD-2026-00660"
   Filter: docstatus = 1 (submitted only)
   Order by: due_date ascending
   ```

5. **Check log array:**
   ```
   API response should include "log" array
   Shows each step with ✓ or ❌
   Look for invoice creation step
   ```

6. **Verify academic_year:**
   ```
   SO should have custom_academic_year = "2026-2027"
   Each SI should inherit it
   If missing → may cause validation error
   ```

---

## 9. COMMON ISSUES & SOLUTIONS

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| SO created but 0 invoices | Background task failed silently (now fixed) | Try convert again or check logs |
| Some invoices missing (e.g., 2 of 4) | Retry failed for some instalments | Manually create missing invoice |
| Invoices created as drafts (not submitted) | Submission API error | Admin submits manually or retry |
| Wrong due dates | Instalment schedule calculation error | Check fee config, verify enrollment_date |
| Wrong amounts (e.g., all instalments same) | Schedule not properly passed | Check "schedule" in request body |
| WhatsApp not sent | Guardian mobile not found or API error | Non-blocking, admin sends manually |
| SO billing_status stays "Not Billed" | Polling timeout before invoice creation started | Check server logs, retry |

---

## 10. INVOICE STATUS TRACKING

### Sales Invoice Lifecycle

```
1. DRAFT (docstatus=0)
   ├─ Created but not submitted
   ├─ Can still be edited
   └─ Not visible to customer

2. SUBMITTED (docstatus=1) ← NORMAL STATE
   ├─ Finalized, cannot edit
   ├─ Appears in customer portal
   ├─ outstanding_amount = grand_total initially
   └─ Can receive payments

3. PAID
   ├─ outstanding_amount = 0
   ├─ Payment Entry linked
   └─ No further action needed

4. OVERDUE
   ├─ due_date < today AND outstanding_amount > 0
   ├─ Customer sees red alert
   └─ Payment reminder sent

5. CANCELLED (docstatus=2)
   ├─ Reversed via credit note or manual cancellation
   ├─ Original invoice unaffected
   └─ Customer refunded
```

---

## 11. API RESPONSE EXAMPLES

### Success Response

```json
{
  "success": true,
  "salesOrderName": "SAL-ORD-2026-00660",
  "invoices": [
    "ACC-SINV-2026-05-0001",
    "ACC-SINV-2026-05-0002",
    "ACC-SINV-2026-05-0003",
    "ACC-SINV-2026-05-0004"
  ],
  "paidAmount": 499,
  "siblingDiscountAmount": 0,
  "instalments": 4,
  "plan": "Intermediate",
  "log": [
    "✓ Student: STU-DEMO-001, Customer: Ithika Saju",
    "✓ Sales Order created: SAL-ORD-2026-00660 (Total: ₹39,000)",
    "✓ Program Enrollment updated to Intermediate, 4 instalments",
    "✓ Student record updated (custom_student_type: Fresher)",
    "✓ Polling for SO billing status... (3 attempts, 1.5s total)",
    "✓ Created Sales Invoice: ACC-SINV-2026-05-0001 (₹9,751, Q1)",
    "✓ Created Sales Invoice: ACC-SINV-2026-05-0002 (₹9,750, Q2)",
    "✓ Created Sales Invoice: ACC-SINV-2026-05-0003 (₹9,750, Q3)",
    "✓ Created Sales Invoice: ACC-SINV-2026-05-0004 (₹9,749, Q4)",
    "✓ WhatsApp sent to guardian (9876543210)"
  ]
}
```

### Partial Failure Response

```json
{
  "success": true,
  "salesOrderName": "SAL-ORD-2026-00660",
  "invoices": [
    "ACC-SINV-2026-05-0001",
    "ACC-SINV-2026-05-0002"
  ],
  "invoiceError": "Invoice creation failed: Frappe timeout after 60 seconds",
  "log": [
    "✓ Student: STU-DEMO-001, Customer: Ithika Saju",
    "✓ Sales Order created: SAL-ORD-2026-00660",
    "✓ Created Sales Invoice: ACC-SINV-2026-05-0001",
    "✓ Created Sales Invoice: ACC-SINV-2026-05-0002",
    "❌ Invoice creation failed: Frappe timeout after 60 seconds"
  ]
}
```

---

## 12. NEXT STUDY POINTS

- **Payment Processing:** How payments are matched to invoices
- **Sibling Discounts:** How related students' discounts are calculated
- **Fee Structure Queries:** How fee amounts are fetched from Frappe
- **One-to-One Billing:** How tutor-logged sessions convert to invoices
- **Discontinuation Flow:** What happens when student is discontinued while owing fees

---

## 13. KEY FILES TO KNOW

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/api/admission/convert-to-regular/route.ts` | Demo→Regular conversion | 376-717 |
| `src/app/api/admission/create-invoices/route.ts` | Create SIs from SO | 1-354 |
| `src/app/api/one-to-one/regenerate-billing/route.ts` | Regen one-to-one billing | 1-200 |
| `src/lib/api/sales.ts` | Sales API utilities | 1-250 |
| `src/lib/types/sales.ts` | Sales types (SO, SI, etc) | 1-200 |
| `src/lib/api/enrollment.ts` | Admission flow | 1000-1200 |
| `src/app/dashboard/branch-manager/students/[id]/page.tsx` | Student billing UI | 300-800 |

