const h = { Authorization: "token 03330270e330d49:9c2261ae11ac2d2" };
const r = await fetch("https://smartup.m.frappe.cloud/api/resource/Payment%20Entry/ACC-PAY-2026-04038", { headers: h });
const d = await r.json();
console.log("docstatus:", d.data.docstatus, "(2=cancelled)");
