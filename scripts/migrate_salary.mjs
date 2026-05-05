// Migration: Add employee/employee_name fields to SmartUp Salary Record
// and backfill existing records by matching staff_name → Employee

const BASE = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const HEADERS = { Authorization: AUTH, "Content-Type": "application/json" };

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api/${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  if (!res.ok) {
    console.error(`[${method}] ${path} → ${res.status}`, JSON.stringify(data).slice(0, 400));
  }
  return { status: res.status, data };
}

// Step 1: Create custom fields employee + employee_name on SmartUp Salary Record
async function createFields() {
  console.log("\n=== Step 1: Create custom fields ===");
  
  // employee (Link → Employee)
  const f1 = await api("POST", "resource/Custom Field", {
    dt: "SmartUp Salary Record",
    fieldname: "custom_employee",
    label: "Employee",
    fieldtype: "Link",
    options: "Employee",
    insert_after: "staff",
    in_list_view: 0,
  });
  console.log("custom_employee:", f1.status, f1.data?.data?.name || JSON.stringify(f1.data).slice(0,200));

  // employee_name (fetched from Employee)
  const f2 = await api("POST", "resource/Custom Field", {
    dt: "SmartUp Salary Record",
    fieldname: "custom_employee_name",
    label: "Employee Name",
    fieldtype: "Data",
    fetch_from: "custom_employee.employee_name",
    fetch_if_empty: 0,
    insert_after: "custom_employee",
    in_list_view: 0,
  });
  console.log("custom_employee_name:", f2.status, f2.data?.data?.name || JSON.stringify(f2.data).slice(0,200));
}

// Step 2: Fetch all salary records
async function getSalaryRecords() {
  const r = await api("GET", 'resource/SmartUp%20Salary%20Record?fields=["name","staff","staff_name","company","custom_employee"]&limit_page_length=500');
  return r.data?.data || [];
}

// Step 3: Fetch all employees
async function getEmployees() {
  const r = await api("GET", 'resource/Employee?fields=["name","employee_name","company","status"]&limit_page_length=500');
  return r.data?.data || [];
}

// Step 4: Backfill custom_employee on existing salary records
async function backfill(records, employees) {
  console.log(`\n=== Step 2: Backfill ${records.length} salary records ===`);
  
  // Build name → employee doc map
  const byName = {};
  for (const e of employees) {
    byName[e.employee_name?.toLowerCase()?.trim()] = e.name;
  }
  
  let updated = 0, skipped = 0, failed = 0;
  for (const rec of records) {
    if (rec.custom_employee) { skipped++; continue; } // already set
    const key = rec.staff_name?.toLowerCase()?.trim();
    const empId = byName[key];
    if (!empId) {
      console.warn(`  No employee match for staff_name="${rec.staff_name}" (record: ${rec.name})`);
      failed++;
      continue;
    }
    const upd = await api("PUT", `resource/SmartUp%20Salary%20Record/${encodeURIComponent(rec.name)}`, {
      custom_employee: empId,
    });
    if (upd.status === 200) {
      console.log(`  ✓ ${rec.name}: ${rec.staff_name} → ${empId}`);
      updated++;
    } else {
      console.error(`  ✗ ${rec.name}: update failed`);
      failed++;
    }
  }
  console.log(`\nDone: ${updated} updated, ${skipped} already set, ${failed} failed`);
}

async function main() {
  await createFields();
  const [records, employees] = await Promise.all([getSalaryRecords(), getEmployees()]);
  console.log(`Salary records: ${records.length}, Employees: ${employees.length}`);
  await backfill(records, employees);
  console.log("\n=== Migration complete ===");
}

main().catch(console.error);
