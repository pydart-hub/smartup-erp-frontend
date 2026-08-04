async function main() {
  const FRAPPE_URL = "https://smartup.m.frappe.cloud";
  const API_KEY = "03330270e330d49";
  const API_SECRET = "9c2261ae11ac2d2";
  const AUTH = `token ${API_KEY}:${API_SECRET}`;

  const student = "STU-SU CHL-26-244";
  const url = `${FRAPPE_URL}/api/resource/Fee Follow Up?filters=[["student","=","${student}"]]&fields=["name","student","student_name","call_status","payment_received","amount_received","invoice_ref","creation","called_by"]&order_by=creation desc`;
  
  const res = await fetch(url, {
    headers: {
      Authorization: AUTH,
      Accept: "application/json"
    }
  });
  
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Follow up logs for", student);
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
