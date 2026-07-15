#!/usr/bin/env node
/**
 * study-june-fee-students-v2.mjs
 *
 * Deep study: Fetch all data for specific student IDs found in previous search.
 * All from Smart Up Moolamkuzhi (MMK) branch.
 *
 * 9th Grade students (MMK):
 *   - MARY ALIYA P J   → STU-SU MMK-26-060
 *   - ALFIN THOMAS     → STU-SU MMK-26-061
 *   - MIGUEL JOSEPH    → STU-SU MMK-26-063 (basic - sibling offer)
 *   - NATHAN JOSEPH    → STU-SU MMK-26-064 (basic - sibling offer)
 *
 * 8th Grade students (MMK):
 *   - NILA PRASANTH    → STU-SU MMK-26-062
 *
 * NOTE: "Ann saya sebin" not found at MMK — need broader search
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE = process.env.NEXT_PUBLIC_FRAPPE_URL;
const API_KEY = process.env.FRAPPE_API_KEY;
const API_SECRET = process.env.FRAPPE_API_SECRET;

const AUTH_HEADERS = {
  Authorization: `token ${API_KEY}:${API_SECRET}`,
  "Content-Type": "application/json",
};

async function api(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: AUTH_HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text.slice(0, 500)}`);
  return json.data ?? json.message ?? json;
}

const get = (path) => api("GET", path);

async function getStudentFullData(studentId) {
  console.log(`\n${"=".repeat(70)}`);
  
  // 1. Student doc
  const student = await get(`/api/resource/Student/${encodeURIComponent(studentId)}`);
  console.log(`📋 STUDENT: ${student.student_name} (${student.name})`);
  console.log(`   Branch: ${student.custom_branch} | Customer: ${student.customer}`);
  
  // 2. Program Enrollments
  const enrollments = await get(
    `/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "program", "academic_year", "custom_plan",
      "custom_no_of_instalments", "custom_fee_structure",
      "enrollment_date", "docstatus", "student_category"
    ]))}&limit_page_length=10`
  );
  
  console.log(`\n  Program Enrollments:`);
  for (const pe of (enrollments || [])) {
    console.log(`    ${pe.name} | ${pe.program} | AY: ${pe.academic_year}`);
    console.log(`    Plan: "${pe.custom_plan}" | Instalments: ${pe.custom_no_of_instalments} | Fee Structure: ${pe.custom_fee_structure}`);
    console.log(`    Enrollment Date: ${pe.enrollment_date} | Docstatus: ${pe.docstatus} | Category: ${pe.student_category || "(none)"}`);
  }
  
  // 3. Sales Orders
  const salesOrders = await get(
    `/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId],
      ["docstatus", "!=", 2]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "grand_total", "billing_status", "transaction_date",
      "custom_plan", "custom_no_of_instalments", "docstatus", "creation",
      "customer", "company", "advance_paid"
    ]))}&order_by=creation desc&limit_page_length=10`
  );
  
  console.log(`\n  Sales Orders (${(salesOrders || []).length}):`);
  for (const so of (salesOrders || [])) {
    console.log(`    SO: ${so.name} | ₹${so.grand_total} | ${so.billing_status} | Company: ${so.company}`);
    console.log(`       Date: ${so.transaction_date} | Plan: ${so.custom_plan} | Inst: ${so.custom_no_of_instalments}`);
    
    // Get SO items
    const soDetail = await get(`/api/resource/Sales Order/${encodeURIComponent(so.name)}`);
    for (const item of (soDetail.items || [])) {
      console.log(`       Item: ${item.item_code} | qty=${item.qty} | rate=₹${item.rate} | amount=₹${item.amount}`);
      console.log(`       SO Item Name (so_detail): ${item.name}`);
    }
  }
  
  // 4. Sales Invoices
  const invoices = await get(
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId],
      ["docstatus", "!=", 2]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "grand_total", "outstanding_amount", "paid_amount",
      "posting_date", "due_date", "status", "docstatus"
    ]))}&order_by=due_date asc&limit_page_length=20`
  );
  
  console.log(`\n  Sales Invoices (${(invoices || []).length}):`);
  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  for (const inv of (invoices || [])) {
    totalBilled += Number(inv.grand_total || 0);
    totalPaid += Number(inv.paid_amount || 0);
    totalOutstanding += Number(inv.outstanding_amount || 0);
    const paid = Number(inv.outstanding_amount) === 0;
    const marker = paid ? "✅" : "⏳";
    // Fetch invoice detail to get sales_order
    const invDetail = await get(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}`);
    const soLink = invDetail.items?.[0]?.sales_order || "(none)";
    console.log(`    ${marker} ${inv.name} | ₹${inv.grand_total} | Paid:₹${inv.paid_amount} | Outstd:₹${inv.outstanding_amount} | ${inv.status}`);
    console.log(`       Due: ${inv.due_date} | Posting: ${inv.posting_date} | SO: ${soLink}`);
  }
  console.log(`  TOTALS → Billed: ₹${totalBilled} | Paid: ₹${totalPaid} | Outstanding: ₹${totalOutstanding}`);
  
  // 5. Payment Entries
  const payments = await get(
    `/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([
      ["party", "=", student.customer],
      ["docstatus", "=", 1]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "paid_amount", "posting_date", "mode_of_payment",
      "reference_no", "party", "party_name"
    ]))}&order_by=posting_date asc&limit_page_length=20`
  );
  
  console.log(`\n  Payment Entries (${(payments || []).length}):`);
  let totalPE = 0;
  for (const pe of (payments || [])) {
    totalPE += Number(pe.paid_amount || 0);
    console.log(`    ${pe.name} | ₹${pe.paid_amount} | ${pe.posting_date} | Mode: ${pe.mode_of_payment} | Ref: ${pe.reference_no || "none"}`);
    
    // Get PE references to see which invoice it's linked to
    const peDetail = await get(`/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`);
    for (const ref of (peDetail.references || [])) {
      console.log(`      → Links to: ${ref.reference_name} | allocated ₹${ref.allocated_amount}`);
    }
  }
  console.log(`  TOTAL PAYMENT ENTRIES: ₹${totalPE}`);
  
  return { student, enrollments, salesOrders, invoices, payments };
}

async function searchAnnSaya() {
  console.log("\n🔍 Searching for 'Ann saya sebin' more broadly...");
  // Try "sebin" as search term
  const url1 = `/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([
    ["student_name", "like", "%sebin%"]
  ]))}&fields=${encodeURIComponent(JSON.stringify([
    "name", "student_name", "customer", "custom_branch"
  ]))}&limit_page_length=20`;
  const r1 = await get(url1);
  console.log(`  By 'sebin': ${(r1 || []).length} candidates`);
  for (const s of (r1 || [])) console.log(`    → ${s.name} | ${s.student_name} | ${s.custom_branch}`);
  
  // Try "saya"
  const url2 = `/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([
    ["student_name", "like", "%saya%"]
  ]))}&fields=${encodeURIComponent(JSON.stringify([
    "name", "student_name", "customer", "custom_branch"
  ]))}&limit_page_length=20`;
  const r2 = await get(url2);
  console.log(`  By 'saya': ${(r2 || []).length} candidates`);
  for (const s of (r2 || [])) console.log(`    → ${s.name} | ${s.student_name} | ${s.custom_branch}`);
}

async function main() {
  console.log("🔍 JUNE FEE CONVERSION — DEEP STUDY v2");
  console.log("=".repeat(70));
  
  // Search for Ann saya sebin first
  await searchAnnSaya();
  
  // Known student IDs from first search (all MMK - Moolamkuzhi)
  const STUDENTS = [
    "STU-SU MMK-26-059",  // ANN SAYA SEBIN
    "STU-SU MMK-26-060",  // MARY ALIYA P J
    "STU-SU MMK-26-061",  // ALFIN THOMAS
    "STU-SU MMK-26-062",  // NILA PRASANTH (8th)
    "STU-SU MMK-26-063",  // MIGUEL JOSEPH (sibling)
    "STU-SU MMK-26-064",  // NATHAN JOSEPH (sibling)
  ];
  
  for (const id of STUDENTS) {
    await getStudentFullData(id);
  }
  
  console.log("\n" + "=".repeat(70));
  console.log("✅ STUDY COMPLETE");
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
