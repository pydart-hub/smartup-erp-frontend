const baseUrl = process.env.NEXT_PUBLIC_FRAPPE_URL || "https://smartup.m.frappe.cloud";
const apiKey = process.env.FRAPPE_API_KEY || "03330270e330d49";
const apiSecret = process.env.FRAPPE_API_SECRET || "9c2261ae11ac2d2";
const auth = `token ${apiKey}:${apiSecret}`;

const peName = "PEN-10th--056";
const batchName = "Chullickal 26-27";

const patch = await fetch(`${baseUrl}/api/resource/Program Enrollment/${encodeURIComponent(peName)}`, {
  method: "PUT",
  headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ student_batch_name: batchName }),
});
console.log("patch", patch.status, await patch.text());

const submit = await fetch(`${baseUrl}/api/resource/Program Enrollment/${encodeURIComponent(peName)}`, {
  method: "PUT",
  headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
  body: JSON.stringify({ docstatus: 1 }),
});
console.log("submit", submit.status, await submit.text());
