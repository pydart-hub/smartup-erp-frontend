/**
 * Adds role permissions to the Fee Follow Up doctype
 * using Frappe's Permission Manager API (bypasses DocType edit restrictions).
 */

const FRAPPE_URL = "https://smartup.m.frappe.cloud";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";

async function callMethod(method, params = {}) {
  const body = new URLSearchParams({ cmd: method, ...params });
  const res = await fetch(`${FRAPPE_URL}/api/method/${method}`, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} → ${res.status}: ${text.slice(0, 400)}`);
  return JSON.parse(text);
}

// Role → permissions to grant
const ROLE_PERMISSIONS = [
  { role: "System Manager",  read: 1, write: 1, create: 1, delete: 1, report: 1, export: 1 },
  { role: "Sales User",      read: 1, write: 1, create: 1, delete: 0, report: 1, export: 0 },
  { role: "Director",        read: 1, write: 0, create: 0, delete: 0, report: 1, export: 1 },
  { role: "Branch Manager",  read: 1, write: 0, create: 0, delete: 0, report: 1, export: 1 },
];

async function main() {
  const DOCTYPE = "Fee Follow Up";

  // First reset all permissions on the doctype
  console.log(`Resetting permissions on "${DOCTYPE}"...`);
  try {
    await callMethod("frappe.core.page.permission_manager.permission_manager.reset", {
      doctype: DOCTYPE,
    });
    console.log("  ✓ Reset done");
  } catch (e) {
    console.log("  ⚠ Reset failed (may not exist yet):", e.message.slice(0, 100));
  }

  // Add permissions for each role
  for (const rp of ROLE_PERMISSIONS) {
    console.log(`Adding permissions for role: ${rp.role}`);
    try {
      await callMethod("frappe.core.page.permission_manager.permission_manager.add", {
        doctype: DOCTYPE,
        role: rp.role,
        permlevel: "0",
        parent: DOCTYPE,
      });

      // Now update the specific permission flags
      const updates = [
        { ptype: "read",   value: rp.read },
        { ptype: "write",  value: rp.write },
        { ptype: "create", value: rp.create },
        { ptype: "delete", value: rp.delete },
        { ptype: "report", value: rp.report },
        { ptype: "export", value: rp.export },
      ];

      for (const upd of updates) {
        await callMethod("frappe.core.page.permission_manager.permission_manager.update", {
          doctype: DOCTYPE,
          role: rp.role,
          permlevel: "0",
          ptype: upd.ptype,
          value: upd.value.toString(),
        });
      }

      const granted = Object.entries(rp)
        .filter(([k, v]) => k !== "role" && v === 1)
        .map(([k]) => k)
        .join(", ");
      console.log(`  ✓ ${rp.role}: ${granted}`);
    } catch (e) {
      console.log(`  ✗ ${rp.role}: ${e.message.slice(0, 150)}`);
    }
  }

  console.log("\n✓ Done. Fee Follow Up doctype permissions are now configured.");
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
