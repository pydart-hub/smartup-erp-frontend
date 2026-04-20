const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const headers = {
  Authorization: "token 03330270e330d49:9c2261ae11ac2d2",
  "Content-Type": "application/json",
};

const res = await fetch(`${FRAPPE_URL}/api/resource/Sales%20Invoice/ACC-SINV-2026-02680`, { headers });
const d = (await res.json()).data;

// Print all custom_ fields
const customFields = Object.entries(d).filter(([k]) => k.startsWith("custom_"));
console.log("Custom fields on Sales Invoice:");
for (const [k, v] of customFields) {
  if (v !== null && v !== 0 && v !== "") console.log(`  ${k}: ${v}`);
}

console.log("\nKey fields:");
console.log("  company:", d.company);
console.log("  debit_to:", d.debit_to);
console.log("  selling_price_list:", d.selling_price_list);
console.log("  cost_center:", d.cost_center);
console.log("  student:", d.student);

// Also check item so_detail
console.log("\nItem details:");
for (const item of d.items) {
  console.log(`  item_code: ${item.item_code}, so_detail: ${item.so_detail}, income_account: ${item.income_account}, cost_center: ${item.cost_center}`);
}
