# Student Branch Transfer — Feasibility Study & Architecture

## 1. FEASIBILITY VERDICT: ✅ FULLY POSSIBLE

No Frappe backend changes required (no custom doctypes needed on server).
Everything can be built with:
- A new **Custom DocType** (`Student Branch Transfer`) on Frappe for audit trail (optional but recommended)
- OR: A **frontend-only approach** using existing APIs + a new Next.js API route

---

## 2. WHAT A TRANSFER ACTUALLY INVOLVES

When a student moves from Branch A → Branch B, **these 10 entities** are affected:

| # | Entity | Current Link | What Changes |
|---|--------|-------------|--------------|
| 1 | **Student.custom_branch** | `Smart Up Chullickal` | → `Smart Up Vennala` |
| 2 | **Student.custom_branch_abbr** | `SU CHL` | → `SU VYT` |
| 3 | **Program Enrollment** | company = old branch, fee_structure = old | Cancel old → Create new PE with new company + new fee structure |
| 4 | **Student Group (Batch)** | Member of old branch batch | Remove from old → Add to new branch batch |
| 5 | **Course Enrollment** | Linked to old PE | Cancel old → Create new CE under new PE |
| 6 | **Sales Order (old)** | company = old branch | Cancel (if unpaid/partially paid) |
| 7 | **Sales Invoices (old)** | company = old branch | Cancel unpaid invoices |
| 8 | **Sales Order (new)** | company = new branch | Create with **adjusted amount** (deduct already paid) |
| 9 | **Sales Invoices (new)** | company = new branch | Create new instalment invoices |
| 10 | **Fee Structure** | Old branch's structure | → New branch's fee structure (different pricing) |

**NOT affected** (stays as-is):
- Guardian / Parent User (same parent, doesn't change)
- Customer record (same customer, used across companies)
- Payment Entries already submitted (historical record, stays linked to old invoices)
- Attendance records (historical, stays)

---

## 3. PAYMENT DEDUCTION LOGIC

### The Core Challenge
> If student already paid ₹15,000 out of ₹40,000 at Branch A, and Branch B's total is ₹45,000, 
> the new SO at Branch B should be for ₹45,000 - ₹15,000 = ₹30,000

### How It Works

```
Old Branch (Sender):
  SO: ₹40,000 (Quarterly, 4 instalments × ₹10,000)
  SI-1: ₹10,000 → Paid ✅ (PE exists, ₹10,000)
  SI-2: ₹10,000 → Paid ✅ (PE exists, ₹5,000 partial)
  SI-3: ₹10,000 → Unpaid ❌
  SI-4: ₹10,000 → Unpaid ❌

Total Paid = ₹15,000 (sum of all PE.paid_amount for this customer's old SIs)

New Branch (Receiver):
  New Fee Structure total = ₹45,000
  Credit from old branch = ₹15,000
  New SO amount = ₹45,000 - ₹15,000 = ₹30,000
  
  If student picks Quarterly (4 instalments):
    Per instalment = ₹30,000 / 4 = ₹7,500
    SI-1: ₹7,500 (due April 15)
    SI-2: ₹7,500 (due July 15) 
    SI-3: ₹7,500 (due Oct 15)
    SI-4: ₹7,500 (due Jan 15)
```

### Calculating "Amount Already Paid"

```javascript
// Query all submitted Payment Entries for the student's customer
// that reference the OLD Sales Order's invoices
const oldSalesInvoices = await getSalesInvoices({
  customer: student.customer,
  company: oldBranch,
  docstatus: 1
});

const totalPaid = oldSalesInvoices.reduce((sum, si) => {
  return sum + (si.grand_total - si.outstanding_amount);
}, 0);

// OR: Sum Payment Entry amounts directly
const paymentEntries = await getPaymentEntries({
  party: student.customer,
  party_type: "Customer",
  docstatus: 1
});
const totalPaid = paymentEntries.reduce((sum, pe) => sum + pe.paid_amount, 0);
```

---

## 4. PROPOSED WORKFLOW

### Flow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    SENDER BRANCH MANAGER                      │
│                                                               │
│  1. Selects student → "Transfer Student" action               │
│  2. Picks target branch (receiver)                            │
│  3. System shows:                                             │
│     - Student details                                         │
│     - Current fees paid / outstanding                         │
│  4. Submits transfer request                                  │
│     → Status: PENDING                                         │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   RECEIVER BRANCH MANAGER                     │
│                                                               │
│  5. Sees notification: "Transfer request from [Branch]"       │
│  6. Reviews request:                                          │
│     - Student info, program, current batch                    │
│     - Amount already paid at old branch                       │
│     - New fee structure at receiving branch                   │
│     - New amount = New Fee - Already Paid                     │
│     - Select payment plan (1/4/6/8 instalments)               │
│     - Select/auto-assign batch                                │
│  7. ACCEPT or REJECT                                          │
│     → If REJECT: Status = REJECTED, sender notified           │
│     → If ACCEPT: Status = APPROVED → triggers transfer        │
└──────────────────┬───────────────────────────────────────────┘
                   │ (on ACCEPT)
                   ▼
┌──────────────────────────────────────────────────────────────┐
│                   AUTOMATIC TRANSFER CHAIN                    │
│                                                               │
│  8.  Cancel unpaid Sales Invoices at old branch               │
│  9.  Cancel old Sales Order (if all SIs cancelled/paid)       │
│  10. Remove student from old Student Group (batch)            │
│  11. Cancel old Course Enrollments                            │
│  12. Cancel old Program Enrollment                            │
│  13. Update Student.custom_branch → new branch                │
│  14. Update Student.custom_branch_abbr → new abbr             │
│  15. Create new Program Enrollment (new branch + fee struct)  │
│  16. Create new Course Enrollments                            │
│  17. Auto-assign to new branch batch (Student Group)          │
│  18. Create new Sales Order (adjusted amount)                 │
│  19. Create new Sales Invoices (instalment schedule)          │
│  20. Status = COMPLETED                                       │
│  21. Notify both BMs + parent (email/WhatsApp)                │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. ARCHITECTURE OPTIONS

### Option A: Custom DocType on Frappe (Recommended)
Create a `Student Branch Transfer` custom doctype on Frappe Cloud to store the request/approval record.

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| student | Link → Student | Student being transferred |
| student_name | Data (read-only) | Auto-fetched |
| from_branch | Link → Company | Sender branch |
| to_branch | Link → Company | Receiver branch |
| requested_by | Link → User | Sender BM |
| approved_by | Link → User | Receiver BM (set on accept) |
| status | Select | Pending / Approved / Rejected / Completed / Failed |
| program | Link → Program | Student's program |
| academic_year | Link → Academic Year | Current academic year |
| old_fee_structure | Link → Fee Structure | Old branch fee structure |
| new_fee_structure | Link → Fee Structure | New branch fee structure |
| old_total_amount | Currency | Total fee at old branch |
| new_total_amount | Currency | Total fee at new branch |
| amount_already_paid | Currency | Sum of payments at old branch |
| adjusted_amount | Currency | new_total - already_paid |
| new_payment_plan | Select | OTP/Quarterly/Bi-monthly/Monthly |
| new_no_of_instalments | Select | 1/4/6/8 |
| old_sales_order | Link → Sales Order | Reference to cancelled SO |
| new_sales_order | Link → Sales Order | Reference to new SO |
| rejection_reason | Small Text | If rejected |
| transfer_log | Long Text | Step-by-step execution log |
| request_date | Date | When request was created |
| completion_date | Date | When transfer completed |

**Pros:**
- Full audit trail in Frappe
- Queryable, filterable, reportable
- Frappe's built-in Notification Log can be used
- Both BMs can see the record in their company scope
- Director can see all transfers across branches

**Cons:**
- Requires creating a custom doctype on Frappe Cloud (one-time setup)

### Option B: Frontend-Only (No Frappe DocType)
Store transfer state in Next.js (localStorage/database) and execute via API calls.

**Pros:** No Frappe changes needed  
**Cons:** No audit trail, no persistence if server restarts, harder to track

### ➡️ RECOMMENDATION: Option A (Custom DocType)

---

## 6. IMPLEMENTATION STRUCTURE

### New Files to Create

```
src/
├── app/
│   ├── api/
│   │   └── transfer/
│   │       ├── request/route.ts          # POST: Create transfer request
│   │       ├── respond/route.ts          # POST: Accept/Reject transfer
│   │       ├── execute/route.ts          # POST: Execute the transfer chain
│   │       ├── list/route.ts             # GET: List transfer requests
│   │       └── [id]/route.ts             # GET: Single transfer details
│   └── dashboard/
│       └── branch-manager/
│           └── transfers/
│               ├── page.tsx              # Transfer list (incoming + outgoing)
│               └── [id]/
│                   └── page.tsx          # Transfer detail + accept/reject
├── components/
│   └── transfers/
│       ├── TransferRequestModal.tsx      # Modal to initiate transfer
│       ├── TransferReviewCard.tsx        # Card to review & accept/reject
│       ├── TransferStatusBadge.tsx       # Status indicator
│       └── TransferTimeline.tsx          # Step-by-step execution log
└── lib/
    └── api/
        └── transfers.ts                  # API helper functions
```

### Existing Files to Modify

```
src/app/dashboard/branch-manager/students/       # Add "Transfer" action button
src/app/dashboard/branch-manager/page.tsx         # Add transfer notifications count
src/components/layout/Sidebar.tsx                 # Add "Transfers" nav item
src/components/layout/NotificationDropdown.tsx    # Show transfer requests
src/lib/types/                                    # Add transfer types
```

### Backend (Frappe) Setup Required

1. **Create Custom DocType** `Student Branch Transfer` (via Frappe UI or API)
2. **Permission Rules:**
   - Branch Manager: Read/Write for own company (from_branch OR to_branch)
   - Director: Read all, Write all
   - Administrator: Full access

---

## 7. API DESIGN

### POST /api/transfer/request
**Who:** Sender Branch Manager  
**Body:**
```json
{
  "student": "STU-00001",
  "to_branch": "Smart Up Vennala",
  "reason": "Parent relocation"      // optional
}
```
**Action:**
1. Validate student belongs to sender's branch
2. Calculate amount_already_paid from existing Payment Entries
3. Look up new fee structure for student's program at target branch
4. Create `Student Branch Transfer` record with status = "Pending"
5. Send notification to receiver BM

### POST /api/transfer/respond
**Who:** Receiver Branch Manager  
**Body:**
```json
{
  "transfer_id": "SBT-00001",
  "action": "accept",                // or "reject"
  "new_fee_structure": "SU VYT-10th State-Advanced-4",
  "new_payment_plan": "Quarterly",
  "new_no_of_instalments": 4,
  "rejection_reason": ""             // if reject  
}
```
**Action (Accept):**
1. Validate receiver BM owns to_branch
2. Update transfer record: status = "Approved", approved_by, new fields
3. Trigger `/api/transfer/execute`

### POST /api/transfer/execute
**Who:** System (internal, called after accept)  
**Body:**
```json
{
  "transfer_id": "SBT-00001"
}
```
**Action:** The 13-step transfer chain (see section 4, steps 8–21)  
Each step logged to `transfer_log` field. If any step fails, status = "Failed" with error details.

### GET /api/transfer/list
**Who:** Branch Manager / Director  
**Query:** `?status=Pending&direction=incoming` or `outgoing` or `all`  
**Returns:** List of transfer records filtered by user's branch

### GET /api/transfer/[id]
**Who:** Branch Manager (sender or receiver) / Director  
**Returns:** Full transfer record with computed fields

---

## 8. SALES ORDER / INVOICE HANDLING (DETAILED)

### Step-by-step for the Financial Transfer

```
PHASE 1: CLOSE OLD BRANCH FINANCIALS
─────────────────────────────────────
1. Fetch all Sales Invoices for student at old branch
   GET Sales Invoice WHERE customer={customer} AND company={old_branch} AND docstatus=1

2. Calculate total_paid:
   For each SI: paid = grand_total - outstanding_amount
   total_paid = SUM(paid for all SIs)

3. Cancel UNPAID invoices (outstanding == grand_total):
   POST /api/resource/Sales Invoice/{name} → Cancel (amend_and_cancel)
   
4. For PARTIALLY PAID invoices:
   - Create a Credit Note (return invoice) for the unpaid portion
   - OR: Leave as-is (the paid amount stays, outstanding stays but SO is cancelled)
   - RECOMMENDED: Cancel the SO, leave paid SIs as historical record

5. Cancel the old Sales Order:
   - If SO has no fully-billed invoices → Cancel directly
   - If SO is partially billed → May need to handle carefully
   - Frappe allows SO cancellation if all linked SIs are cancelled

PHASE 2: CREATE NEW BRANCH FINANCIALS
──────────────────────────────────────
6. Look up new Fee Structure for:
   - program = student's program
   - company = new_branch  
   - academic_year = current
   - plan + instalments = as chosen by receiver BM

7. Calculate adjusted amount:
   new_total = new_fee_structure.total_amount
   adjusted = new_total - total_paid
   if (adjusted <= 0) → Student is fully paid, no SO needed

8. Create Sales Order at new branch:
   {
     customer: student.customer,
     company: new_branch,
     transaction_date: today,
     student: student.name,
     custom_academic_year: current,
     custom_plan: selected_plan,
     custom_no_of_instalments: num_instalments,
     items: [{
       item_code: tuition_fee_item,
       qty: num_instalments,
       rate: adjusted / num_instalments,
       amount: adjusted
     }]
   }
   → Submit SO

9. Generate instalment schedule using feeSchedule.ts logic:
   - Due dates from INSTALMENT_DUE_DATES constant
   - Per-instalment amount = adjusted / num_instalments
   - Handle uneven division (add remainder to last instalment)

10. Create Sales Invoices (one per instalment):
    For each instalment:
    {
      customer, company: new_branch,
      posting_date: due_date,
      due_date: due_date,
      student: student.name,
      items: [{
        item_code: tuition_fee_item,
        qty: 1,
        rate: instalment_amount,
        sales_order: new_so.name,
        so_detail: new_so.items[0].name
      }]
    }
    → Submit each SI
```

### Edge Cases

| Case | Handling |
|------|----------|
| **Student fully paid** (paid >= new total) | No new SO/SI needed. Transfer record notes "Fully Paid — No New Fees" |
| **Student overpaid** (paid > new total) | Flag for director review. Create note on transfer. Manual refund process. |
| **Student has zero payments** | New SO = full new fee amount |
| **Partially paid invoice at old branch** | Leave the paid SI as historical. Only cancel fully-unpaid SIs. |
| **Different program at new branch** | Receiver BM must select the matching fee structure for the student's program |
| **Same fee at both branches** | Adjusted amount = 0 if fully paid, else remainder |
| **Mid-year transfer** | Pro-rating NOT automatic. Receiver BM sets the adjustment manually if needed. |

---

## 9. NOTIFICATION SYSTEM

Using existing Frappe **Notification Log** API:

```javascript
// Create notification for receiver BM
await frappeClient.post('/api/resource/Notification Log', {
  for_user: receiverBM_email,
  type: 'Alert',
  document_type: 'Student Branch Transfer',
  document_name: transfer.name,
  subject: `Transfer Request: ${student.student_name} from ${fromBranch}`,
  email_content: `${senderBM} requests transfer of ${student.student_name} to your branch.`
});
```

Additionally:
- **Email notification** to receiver BM on new request
- **Email notification** to sender BM on accept/reject
- **Email + WhatsApp** to parent on transfer completion

---

## 10. DIRECTOR VISIBILITY

The Director dashboard gets:
- A "Transfers" section showing all transfer requests across branches
- Filter by status (Pending/Approved/Rejected/Completed)
- Ability to override (force-approve/reject)
- Transfer history report

---

## 11. SECURITY CONSIDERATIONS

1. **Sender BM** can only transfer students from their own branch
2. **Receiver BM** can only accept/reject transfers TO their own branch
3. **Director** can see and manage all transfers
4. Transfer execution uses **admin token** (server-side) since it touches multiple companies
5. All financial operations (cancel SI, create SO) go through admin API
6. Transfer log provides full audit trail

---

## 12. SUMMARY

| Aspect | Status |
|--------|--------|
| Frappe API support | ✅ All CRUD operations available |
| Student branch update | ✅ `custom_branch` is a simple Link field, updatable |
| Cancel SO/SI | ✅ Supported via POST cancel workflow |
| Create SO/SI at new branch | ✅ Same as admission flow |
| Payment deduction | ✅ Calculate from existing PE/SI data |
| Cross-branch access | ✅ Admin token handles multi-company operations |
| Notification | ✅ Frappe Notification Log + email |
| Audit trail | ✅ Custom DocType stores full history |
| Director oversight | ✅ Can query all transfer records |

**Estimated new files:** ~12 files  
**Estimated modified files:** ~6 files  
**Frappe setup:** 1 custom doctype creation

---

**⏳ WAITING FOR YOUR COMMAND TO IMPLEMENT**
