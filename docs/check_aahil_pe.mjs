const h = { Authorization: "token 03330270e330d49:9c2261ae11ac2d2" };
const base = "https://smartup.m.frappe.cloud/api/resource/Payment%20Entry";

for (const pe of ["ACC-PAY-2026-04037", "ACC-PAY-2026-04038"]) {
  const r = await (await fetch(`${base}/${pe}`, { headers: h })).json();
  console.log(`\n${pe}:`);
  console.log("  Amount:", r.data.paid_amount, "Mode:", r.data.mode_of_payment);
  console.log("  References:", JSON.stringify(
    r.data.references?.map(ref => ({
      doctype: ref.reference_doctype,
      name: ref.reference_name,
      allocated: ref.allocated_amount,
    })),
    null, 2
  ));
}
