#!/usr/bin/env node
/**
 * study-june-fee-students.mjs
 *
 * Study script: Fetch all data for students who enrolled before June
 * new fee revision and need conversion to June new fees.
 *
 * 9th Grade:
 *   1. Ann saya sebin
 *   2. Mary Aliya
 *   3. Alfin
 *   4. Miguel (basic - sibling offer)
 *   5. Nathan (basic - sibling offer)
 *
 * 8th Grade:
 *   6. Nila
 *
 * Goal: Understand current SO, invoices, payments and determine
 *       what the new fee structure should be.
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

// Student name fragments to search
const STUDENT_NAMES = [
  "Ann saya sebin",
  "Mary Aliya",
  "Alfin",
  "Miguel",
  "Nathan",
  "Nila",
];

async function searchStudents() {
  console.log("🔍 Searching for students by name...\n");
  const results = {};
  
  for (const name of STUDENT_NAMES) {
    const nameWords = name.toLowerCase().split(" ");
    // Search by student_name containing the name
    const url = `/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([
      ["student_name", "like", `%${nameWords[0]}%`]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "student_name", "customer", "custom_branch"
    ]))}&limit_page_length=20`;
    
    const students = await get(url);
    results[name] = students || [];
    console.log(`  "${name}": found ${(students || []).length} candidates`);
    for (const s of (students || [])) {
      console.log(`    → ${s.name} | ${s.student_name} | Branch: ${s.custom_branch}`);
    }
  }
  return results;
}

async function getStudentFullData(studentId, studentName) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📋 STUDENT: ${studentName} (${studentId})`);
  console.log("=".repeat(70));
  
  // 1. Student doc
  const student = await get(`/api/resource/Student/${encodeURIComponent(studentId)}`);
  console.log(`  Name: ${student.student_name}`);
  console.log(`  Branch: ${student.custom_branch}`);
  console.log(`  Customer: ${student.customer}`);
  
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
  
  console.log(`\n  Program Enrollments (${(enrollments || []).length}):`);
  for (const pe of (enrollments || [])) {
    console.log(`    ${pe.name}`);
    console.log(`      Program: ${pe.program} | AY: ${pe.academic_year}`);
    console.log(`      Plan: ${pe.custom_plan} | Instalments: ${pe.custom_no_of_instalments}`);
    console.log(`      Fee Structure: ${pe.custom_fee_structure}`);
    console.log(`      Enrollment Date: ${pe.enrollment_date} | Status: ${pe.docstatus}`);
    console.log(`      Category: ${pe.student_category || "(none)"}`);
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
    console.log(`    ${so.name} | ₹${so.grand_total} | ${so.billing_status}`);
    console.log(`      Company: ${so.company} | Date: ${so.transaction_date}`);
    console.log(`      Plan: ${so.custom_plan} | Instalments: ${so.custom_no_of_instalments}`);
    console.log(`      Docstatus: ${so.docstatus}`);
    
    // Get SO items
    const soDetail = await get(`/api/resource/Sales Order/${encodeURIComponent(so.name)}`);
    for (const item of (soDetail.items || [])) {
      console.log(`      Item: ${item.item_code} | qty=${item.qty} | rate=₹${item.rate} | amount=₹${item.amount}`);
    }
  }
  
  // 4. Sales Invoices
  const invoices = await get(
    `/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([
      ["student", "=", studentId],
      ["docstatus", "!=", 2]
    ]))}&fields=${encodeURIComponent(JSON.stringify([
      "name", "grand_total", "outstanding_amount", "paid_amount",
      "posting_date", "due_date", "status", "docstatus", "sales_order"
    ]))}&order_by=due_date asc&limit_page_length=20`
  );
  
  console.log(`\n  Sales Invoices (${(invoices || []).length}):`);
  let totalBilled = 0;
  let totalPaid = 0;
  for (const inv of (invoices || [])) {
    totalBilled += Number(inv.grand_total || 0);
    totalPaid += Number(inv.paid_amount || 0);
    const paymentStatus = Number(inv.outstanding_amount) === 0 ? "✅ PAID" : `⏳ OUTSTANDING ₹${inv.outstanding_amount}`;
    console.log(`    ${inv.name} | ₹${inv.grand_total} | ${paymentStatus}`);
    console.log(`      Due: ${inv.due_date} | Posting: ${inv.posting_date} | Status: ${inv.status}`);
    console.log(`      SO: ${inv.sales_order || "(none)"}`);
  }
  console.log(`  TOTAL BILLED: ₹${totalBilled} | TOTAL PAID: ₹${totalPaid}`);
  
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
  let totalPaymentAmount = 0;
  for (const pe of (payments || [])) {
    totalPaymentAmount += Number(pe.paid_amount || 0);
    console.log(`    ${pe.name} | ₹${pe.paid_amount} | ${pe.posting_date}`);
    console.log(`      Mode: ${pe.mode_of_payment} | Ref: ${pe.reference_no || "(none)"}`);
    
    // Get PE references to see which invoice it's linked to
    const peDetail = await get(`/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`);
    for (const ref of (peDetail.references || [])) {
      console.log(`      → Links to: ${ref.reference_doctype} ${ref.reference_name} | allocated ₹${ref.allocated_amount}`);
    }
  }
  console.log(`  TOTAL PAYMENTS: ₹${totalPaymentAmount}`);
  
  return { student, enrollments, salesOrders, invoices, payments };
}

async function main() {
  console.log("🔍 JUNE FEE CONVERSION — STUDENT STUDY");
  console.log("=".repeat(70));
  console.log(`Backend: ${BASE}\n`);
  
  // Step 1: Search for students
  const searchResults = await searchStudents();
  
  console.log("\n" + "=".repeat(70));
  console.log("🎯 Now fetching full data for each student...");
  console.log("=".repeat(70));
  
  // Step 2: Prompt user to provide exact student IDs based on search results
  // For now, let's try to auto-identify by looking at the search results
  // and fetching details for students matching the expected branch

  // We'll need to investigate based on what's returned
  // This script is for STUDY only - all student IDs will be printed above
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
