# Fee Structure Update & Invoice Correction Plan

Some students are billed under an old fee structure (e.g., ₹2,700 per installment), while the fee structure was later updated (e.g., to ₹2,500 per installment). The students paid the updated amount (₹2,500), leaving a pending/outstanding balance of ₹200 on each paid installment (Installments 1, 2, and 3). Subsequent unpaid installments are still set to the old rate of ₹2,700.

This plan details why the connection is lost when updating Sales Invoices, and proposes three methods to fix the issue on the Frappe Cloud backend.

---

## 1. Deep Study: Why is the Payment Entry Link Lost?

In Frappe/ERPNext:
1. **The References Child Table:** The connection between a `Payment Entry` and a `Sales Invoice` is stored in a child table called `Payment Entry Reference` (database table `tabPayment Entry Reference`). Each row contains:
   * `reference_doctype` ("Sales Invoice")
   * `reference_name` (e.g., `ACC-SINV-2026-04213`)
   * `allocated_amount` (e.g., ₹2,500)
2. **Cancellation Behavior:** When you cancel a submitted `Sales Invoice` to modify it, Frappe's database triggers automatically unlink the invoice. It clears the `reference_name` in the linked `Payment Entry` and reduces the allocated amount.
3. **No Automatic Re-linking:** Once the invoice is cancelled and you create a new one (which will have a different document ID), the `Payment Entry` remains in a submitted state but is now **unallocated** (stored as an advance payment from the customer). The new invoice remains unpaid ("Outstanding"), and the payment history is disconnected from the invoice ledger.

To prevent this or correct it, we have three solutions.

---

## 2. Proposed Solutions

We present three distinct approaches to resolve the issue.

### Method A: Automated Cancel-Recreate-Relink Script (Recommended standard ERP workflow)
This method is fully compliant with Frappe API standards and matches other correction scripts in the repository (e.g., [fix-nivedh-fee-structure.mjs](file:///c:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/scripts/fix-nivedh-fee-structure.mjs)).

* **Workflow:**
  1. Fetch all details of existing Payment Entries (dates, modes, reference numbers, and payment amounts).
  2. Cancel the existing Payment Entries.
  3. Cancel and delete the incorrect Sales Invoices.
  4. Cancel and delete the Sales Order.
  5. Create a new Sales Order at the correct rate (₹2,500 per installment).
  6. Create new Sales Invoices at the correct rate (₹2,500).
  7. Re-create the Payment Entries using the original details, explicitly linking them to the new Sales Invoices.
  8. Submit the new Payment Entries.
* **Pros:** 100% compliant with accounting ledgers; standard ERPNext behavior; clean historical data.
* **Cons:** Re-created Payment Entries will receive new document IDs (e.g., `ACC-PAY-2026-09221` instead of `ACC-PAY-2026-04000`), though original transaction reference numbers (e.g., Razorpay IDs) are preserved.

### Method B: Direct Database Patching via Server Script (Non-destructive)
This method updates the values of the submitted Sales Orders and Sales Invoices directly in the database using low-level SQL/Python (`frappe.db.set_value` and `frappe.db.sql`), bypassing document status constraints.

* **Workflow:**
  1. Deploy a temporary API Server Script on the Frappe backend.
  2. The script executes the following updates directly in the database:
     * Updates `rate` and `amount` in `tabSales Order Item` (from 2,700 to 2,500).
     * Updates `grand_total`, `net_total`, and related fields in `tabSales Order`.
     * Updates `rate` and `amount` in `tabSales Invoice Item` (from 2,700 to 2,500) for all installments.
     * Updates `grand_total`, `net_total` in `tabSales Invoice`.
     * Updates `outstanding_amount` in `tabSales Invoice` (since grand total is now 2,500 and paid is 2,500, outstanding becomes 0).
     * Updates the debit/credit entry amounts in `tabGL Entry` for the invoice so general ledger reports are consistent.
  3. Delete the temporary Server Script.
* **Pros:** Preserves original document names (`ACC-SINV-xxxx`), links, and payment entries completely intact. No unlinking or document deletion is required.
* **Cons:** Bypasses standard Frappe hooks and validations. Must be executed carefully to avoid general ledger discrepancies.

### Method C: Credit Note / Outstanding Write-Off (Zero-code ERP workflow)
This method uses standard accounting features in the ERPNext user interface without running any scripts.

* **Workflow:**
  1. For paid installments (Installments 1, 2, 3): Keep the invoices at ₹2,700 and the payments at ₹2,500. Create a **Journal Entry** or a **Credit Note (Sales Invoice)** for ₹200 for each invoice to write off the outstanding balance.
     * Debit: "Bad Debts / Write-offs" or "Fee Adjustments" (Expense account)
     * Credit: Customer (Accounts Receivable)
     * Link the credit entry to the corresponding Sales Invoice.
     * This brings the outstanding balance of the invoice to ₹0 and changes its status to "Paid".
  2. For unpaid future installments (Installments 4 onwards): Since no payment is linked yet, they can be safely cancelled and recreated at the new rate (₹2,500) directly.
  3. Amend the Sales Order to update the rates for the remaining items.
* **Pros:** 100% standard accounting practice; no backend scripts; auditable write-off trail.
* **Cons:** 
  * **Sales Order Amount stays unchanged:** Creating a Credit Note against a Sales Invoice does *not* reduce the total amount on the Sales Order. The Sales Order total remains at the old rate.
  * **Sales Order Amendment is blocked:** In Frappe, you cannot cancel or amend a Sales Order if it has active, submitted Sales Invoices linked to it. Therefore, if you keep the submitted invoices for Installments 1, 2, and 3, you **cannot** amend the Sales Order to correct the rates for future installments. You would be forced to create ₹200 Credit Notes for *every single installment* (both past and future).
  * **Ledger Clutter:** Leaves historical invoices at ₹2,700 with a separate offset document, which might look complex on student statement ledger views.

---

## 3. Implementation Scripts

To assist with the correction, we have prepared scripts for both finding the affected students and implementing the fixes.

### Step 1: Scan for Affected Students
Create a script (e.g., `scripts/scan-fee-mismatches.mjs`) to query the Frappe API for students who have partially paid invoices with exactly ₹200 outstanding.

```javascript
import fetch from 'node-fetch';

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

async function main() {
  console.log('🔍 Scanning for invoices with ₹200 outstanding balance...');
  
  // Find invoices where grand_total = 2700 and outstanding_amount = 200
  const filters = JSON.stringify([
    ['doctype', '=', 'Sales Invoice'],
    ['docstatus', '=', 1],
    ['grand_total', '=', 2700],
    ['outstanding_amount', '=', 200]
  ]);
  
  const url = `${BASE}/api/resource/Sales Invoice?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(JSON.stringify(['name', 'customer', 'student', 'posting_date', 'outstanding_amount', 'sales_order']))}&limit=200`;
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error('Error fetching invoices:', await res.text());
    return;
  }
  
  const data = await res.json();
  const invoices = data.data || [];
  
  console.log(`Found ${invoices.length} mismatched invoice(s):`);
  
  const studentMap = {};
  for (const inv of invoices) {
    if (!studentMap[inv.student]) {
      studentMap[inv.student] = {
        student: inv.student,
        customer: inv.customer,
        sales_order: inv.sales_order,
        invoices: []
      };
    }
    studentMap[inv.student].invoices.push(inv.name);
  }
  
  console.table(Object.values(studentMap));
}

main();
```

---

### Step 2: Implementation of Method A (Cancel-Recreate-Relink)
If Method A is chosen, the following script template can be used for a student.

```javascript
import fetch from 'node-fetch';

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { Authorization: AUTH, 'Content-Type': 'application/json' };

// Define student configuration
const STUDENT = 'STU-SU-XXX-XX-XXX';
const CUSTOMER = 'STUDENT CUSTOMER NAME';
const COMPANY = 'Smart Up Company Name';
const ITEM_CODE = 'Item Code Name';
const ITEM_NAME = 'Item Name';
const OLD_SO = 'SAL-ORD-2026-XXXXX';
const ACADEMIC_YEAR = '2026-2027';

// List original invoice names and payment entries
const INVOICES_TO_CANCEL = [
  'ACC-SINV-2026-00001', // Installment 1
  'ACC-SINV-2026-00002', // Installment 2
  'ACC-SINV-2026-00003', // Installment 3
  'ACC-SINV-2026-00004', // Unpaid Installment 4 onwards
];

const PAYMENTS_TO_CANCEL = [
  { name: 'ACC-PAY-2026-10001', amount: 2500, refNo: 'PAYMENT_REF_1', date: '2026-05-10' },
  { name: 'ACC-PAY-2026-10002', amount: 2500, refNo: 'PAYMENT_REF_2', date: '2026-06-10' },
  { name: 'ACC-PAY-2026-10003', amount: 2500, refNo: 'PAYMENT_REF_3', date: '2026-07-10' },
];

const TARGET_SCHEDULE = [
  { label: 'Inst 1', amount: 2500, date: '2026-05-10' },
  { label: 'Inst 2', amount: 2500, date: '2026-06-10' },
  { label: 'Inst 3', amount: 2500, date: '2026-07-10' },
  { label: 'Inst 4', amount: 2500, date: '2026-08-10' },
];

async function cancelDoc(doctype, name) {
  const res = await fetch(`${BASE}/api/method/frappe.client.cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype, name }),
  });
  if (!res.ok) throw new Error(`Cancel ${doctype} ${name} failed: ${await res.text()}`);
  console.log(`✓ Cancelled ${doctype} ${name}`);
}

async function deleteDoc(doctype, name) {
  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Delete ${doctype} ${name} failed: ${await res.text()}`);
  console.log(`✓ Deleted ${doctype} ${name}`);
}

async function main() {
  console.log(`Starting migration for ${CUSTOMER}...`);

  // 1. Cancel Payments
  for (const pe of PAYMENTS_TO_CANCEL) {
    await cancelDoc('Payment Entry', pe.name);
    await deleteDoc('Payment Entry', pe.name);
  }

  // 2. Cancel and Delete Invoices
  for (const inv of INVOICES_TO_CANCEL) {
    await cancelDoc('Sales Invoice', inv);
    await deleteDoc('Sales Invoice', inv);
  }

  // 3. Cancel and Delete Sales Order
  await cancelDoc('Sales Order', OLD_SO);
  await deleteDoc('Sales Order', OLD_SO);

  // 4. Create New Sales Order
  const soPayload = {
    doctype: 'Sales Order',
    customer: CUSTOMER,
    company: COMPANY,
    transaction_date: TARGET_SCHEDULE[0].date,
    delivery_date: TARGET_SCHEDULE[0].date,
    order_type: 'Sales',
    student: STUDENT,
    custom_academic_year: ACADEMIC_YEAR,
    items: [{
      item_code: ITEM_CODE,
      item_name: ITEM_NAME,
      qty: TARGET_SCHEDULE.length,
      rate: 2500,
      amount: 2500 * TARGET_SCHEDULE.length,
    }],
  };
  const soRes = await fetch(`${BASE}/api/resource/Sales Order`, {
    method: 'POST',
    headers,
    body: JSON.stringify(soPayload)
  });
  const newSO = (await soRes.json()).data;
  
  // Submit new Sales Order
  await fetch(`${BASE}/api/resource/Sales Order/${newSO.name}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ docstatus: 1 })
  });
  console.log(`✓ Created & Submitted New Sales Order: ${newSO.name}`);

  // Fetch new SO detail name
  const soDoc = await fetch(`${BASE}/api/resource/Sales Order/${newSO.name}`, { headers }).then(r => r.json());
  const soItemRow = soDoc.data.items[0].name;

  // 5. Create new Sales Invoices & Re-link Payments
  const newInvoices = [];
  for (const item of TARGET_SCHEDULE) {
    const invPayload = {
      doctype: 'Sales Invoice',
      customer: CUSTOMER,
      company: COMPANY,
      posting_date: item.date,
      due_date: item.date,
      student: STUDENT,
      disable_rounded_total: 1,
      custom_academic_year: ACADEMIC_YEAR,
      items: [{
        item_code: ITEM_CODE,
        item_name: ITEM_NAME,
        description: `${item.label} — Tuition Fee`,
        qty: 1,
        rate: item.amount,
        amount: item.amount,
        sales_order: newSO.name,
        so_detail: soItemRow,
      }],
    };
    const invRes = await fetch(`${BASE}/api/resource/Sales Invoice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invPayload)
    });
    const invData = (await invRes.json()).data;
    
    // Submit Invoice
    await fetch(`${BASE}/api/resource/Sales Invoice/${invData.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    });
    console.log(`✓ Created & Submitted Invoice: ${invData.name} (₹${item.amount})`);
    newInvoices.push(invData.name);
  }

  // 6. Re-create and link Payment Entries
  for (let i = 0; i < PAYMENTS_TO_CANCEL.length; i++) {
    const origPE = PAYMENTS_TO_CANCEL[i];
    const targetInvoice = newInvoices[i];

    // Request auto-resolved Payment Entry template
    const peTemplate = await fetch(`${BASE}/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dt: 'Sales Invoice',
        dn: targetInvoice,
        party_amount: origPE.amount,
        bank_amount: origPE.amount,
      })
    }).then(r => r.json()).then(d => d.message);

    // Patch with details
    peTemplate.mode_of_payment = 'Cash'; // Adjust if card/online
    peTemplate.posting_date = origPE.date;
    peTemplate.reference_no = origPE.refNo;
    peTemplate.reference_date = origPE.date;
    peTemplate.remarks = `Restored payment for ref: ${origPE.refNo} against ${targetInvoice}`;

    if (peTemplate.references?.length) {
      peTemplate.references[0].allocated_amount = origPE.amount;
    }

    const newPeRes = await fetch(`${BASE}/api/resource/Payment Entry`, {
      method: 'POST',
      headers,
      body: JSON.stringify(peTemplate)
    });
    const newPeData = (await newPeRes.json()).data;

    // Submit PE
    await fetch(`${BASE}/api/resource/Payment Entry/${newPeData.name}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ docstatus: 1 })
    });
    console.log(`✓ Restored Payment Entry: ${newPeData.name} linking to ${targetInvoice}`);
  }

  console.log('🎉 Migration completed successfully!');
}

main().catch(err => console.error('Migration failed:', err));
```

---

### Step 3: Implementation of Method B (Direct Database Patching)
If Method B is chosen, we deploy a backend Python script as an API Server Script to perform the updates without canceling or unlinking records.

```python
# API Method Server Script: 'update_student_fee_in_place'
# Trigger: API
# API Method Name: update_student_fee_in_place
# Parameter payload: {"student_id": "STU-SU-XXX", "new_rate": 2500}

student_id = frappe.form_dict.get('student_id')
new_rate = frappe.form_dict.get('new_rate', 2500)

if not student_id:
    frappe.throw("student_id is required")

# 1. Get Sales Order name linked to the student
so_list = frappe.get_all("Sales Order", filters={"student": student_id, "docstatus": 1})
if not so_list:
    frappe.throw(f"No submitted Sales Order found for student {student_id}")
so_name = so_list[0].name

# Update Sales Order Item rate & Sales Order grand total
so_items = frappe.get_all("Sales Order Item", filters={"parent": so_name})
qty = len(so_items)  # or total installments quantity
total_amount = new_rate * qty

for item in so_items:
    frappe.db.set_value("Sales Order Item", item.name, "rate", new_rate, update_modified=False)
    frappe.db.set_value("Sales Order Item", item.name, "amount", total_amount, update_modified=False)
    frappe.db.set_value("Sales Order Item", item.name, "base_amount", total_amount, update_modified=False)

for field in ["grand_total", "net_total", "total", "base_grand_total", "base_net_total", "base_total"]:
    frappe.db.set_value("Sales Order", so_name, field, total_amount, update_modified=False)

# 2. Get all submitted Sales Invoices linked to the Sales Order
invoices = frappe.get_all("Sales Invoice", filters={"student": student_id, "docstatus": 1})

updated_invoices = []
for inv in invoices:
    inv_name = inv.name
    
    # Update Sales Invoice Item rate
    inv_items = frappe.get_all("Sales Invoice Item", filters={"parent": inv_name})
    for item in inv_items:
        frappe.db.set_value("Sales Invoice Item", item.name, "rate", new_rate, update_modified=False)
        frappe.db.set_value("Sales Invoice Item", item.name, "amount", new_rate, update_modified=False)
        frappe.db.set_value("Sales Invoice Item", item.name, "base_amount", new_rate, update_modified=False)
    
    # Update Sales Invoice grand total and recalculate outstanding_amount
    # Outstanding amount = new_grand_total - paid_amount
    paid_amount = frappe.db.get_value("Sales Invoice", inv_name, "paid_amount") or 0.0
    new_outstanding = max(0.0, float(new_rate) - float(paid_amount))
    
    for field in ["grand_total", "net_total", "total", "base_grand_total", "base_net_total", "base_total"]:
        frappe.db.set_value("Sales Invoice", inv_name, field, new_rate, update_modified=False)
        
    frappe.db.set_value("Sales Invoice", inv_name, "outstanding_amount", new_outstanding, update_modified=False)
    
    # 3. Update corresponding General Ledger entries for this invoice to prevent ledger discrepancy
    gl_entries = frappe.get_all("GL Entry", filters={"voucher_type": "Sales Invoice", "voucher_no": inv_name})
    for entry in gl_entries:
        gl_amount = frappe.db.get_value("GL Entry", entry.name, "debit") or 0.0
        if gl_amount > 0.0:
            frappe.db.set_value("GL Entry", entry.name, "debit", new_rate, update_modified=False)
        else:
            frappe.db.set_value("GL Entry", entry.name, "credit", new_rate, update_modified=False)
            
    updated_invoices.append({"invoice": inv_name, "paid": paid_amount, "new_outstanding": new_outstanding})

frappe.db.commit()
frappe.response["message"] = {
    "status": "success",
    "student": student_id,
    "sales_order": so_name,
    "invoices": updated_invoices
}
```

---

## 4. Verification Plan

### Automated Verification
* Run the scanning script (`scripts/scan-fee-mismatches.mjs`) before and after applying the fix.
  * **Before:** Shows the list of affected students and their ₹200 outstanding balances.
  * **After:** Shows an empty list (all outstanding balances corrected to ₹0).
* Verify document status on the Frappe API:
  * For each corrected invoice: `outstanding_amount` must equal `0` and `status` must be `"Paid"`.
  * For the Sales Order: `grand_total` must equal the new total (Installments × ₹2,500).

### Manual Verification
1. Log into the Frappe Cloud ERP backend dashboard.
2. Search for the student's records:
   * Open the **Sales Order**: Confirm the rates and total amounts match the new plan.
   * Open the **Sales Invoices**: Verify that Installments 1, 2, and 3 are marked as **Paid**, and the outstanding amounts are exactly ₹0. Verify that unpaid installments (Installments 4+) show ₹2,500.
   * Open the **Payment Entries**: Check that the original payment dates, Razorpay payment reference numbers, and modes of payment are fully intact.
3. Open the Next.js Student Portal dashboard for the specific student and verify that the payment timeline, installments, and outstanding balances display correctly without indicating any past due amounts.
