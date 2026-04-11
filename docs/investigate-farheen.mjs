const F = 'https://smartup.m.frappe.cloud';
const A = 'token 03330270e330d49:9c2261ae11ac2d2';
const h = { Authorization: A, 'Content-Type': 'application/json' };

// 1. Check comments on the invoice
console.log("=== Comments on ACC-SINV-2026-03233 ===");
const commRes = await fetch(
  `${F}/api/resource/Comment?filters=[["reference_doctype","=","Sales Invoice"],["reference_name","=","ACC-SINV-2026-03233"]]&fields=["name","content","comment_type","creation"]&limit=20&order_by=creation desc`,
  { headers: h }
);
const comments = (await commRes.json()).data || [];
if (comments.length === 0) console.log("  (no comments found)");
else comments.forEach(c => console.log(`  [${c.creation}] ${c.comment_type}: ${c.content?.substring(0, 200)}`));

// 2. Check Sales Order linked to this student
console.log("\n=== Sales Orders for Farheen Anwar ===");
const soRes = await fetch(
  `${F}/api/resource/Sales Order?filters=[["customer_name","like","%Farheen%"]]&fields=["name","customer","customer_name","company","transaction_date","grand_total","status"]&limit=5`,
  { headers: h }
);
const sos = (await soRes.json()).data || [];
sos.forEach(so => console.log(`  ${so.name} — ${so.customer_name} — ${so.company} — ₹${so.grand_total} — ${so.status}`));

// 3. Find the student admission date and check activity log around that time
console.log("\n=== Student Details ===");
const stuRes = await fetch(
  `${F}/api/resource/Student/STU-SU PLR-26-014?fields=["name","student_name","joining_date","student_email_id","student_mobile_number","custom_guardian_phone","custom_guardian_email"]`,
  { headers: h }
);
const stu = (await stuRes.json()).data;
console.log(JSON.stringify(stu, null, 2));

// 4. Check recent Payment Entries on this student/customer
console.log("\n=== All Payment Entries referencing Farheen ===");
const peRes = await fetch(
  `${F}/api/resource/Payment Entry?filters=[["party_name","like","%Farheen%"]]&fields=["name","paid_amount","reference_no","reference_date","docstatus","creation","mode_of_payment"]&order_by=creation desc&limit=10`,
  { headers: h }
);
const pes = (await peRes.json()).data || [];
if (pes.length === 0) console.log("  (none besides the one we just created)");
else pes.forEach(pe => console.log(`  ${pe.name} — ₹${pe.paid_amount} — ref: ${pe.reference_no} — ${pe.mode_of_payment} — docstatus: ${pe.docstatus} — ${pe.creation}`));

// 5. Check Activity Log for any payment API traces
console.log("\n=== Recent Activity Logs (Comment) mentioning razorpay or pay_SazWF5 ===");
const logRes = await fetch(
  `${F}/api/resource/Comment?filters=[["content","like","%pay_SazWF5%"]]&fields=["name","reference_doctype","reference_name","content","creation"]&limit=10`,
  { headers: h }
);
const logs = (await logRes.json()).data || [];
if (logs.length === 0) console.log("  (no comments mentioning this payment ID)");
else logs.forEach(l => console.log(`  [${l.creation}] ${l.reference_doctype}/${l.reference_name}: ${l.content?.substring(0, 200)}`));
