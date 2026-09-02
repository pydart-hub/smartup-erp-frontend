import fs from "fs";
import path from "path";

async function run() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const urlMatch = env.match(/NEXT_PUBLIC_FRAPPE_URL=(.*)/);
  const keyMatch = env.match(/FRAPPE_API_KEY=(.*)/);
  const secretMatch = env.match(/FRAPPE_API_SECRET=(.*)/);
  
  const url = urlMatch ? urlMatch[1].trim() : "";
  const key = keyMatch ? keyMatch[1].trim() : "";
  const secret = secretMatch ? secretMatch[1].trim() : "";
  const auth = `token ${key}:${secret}`;

  const headers = {
    Authorization: auth,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  const enrollmentName = "PEN-12sc state-Thopumpadi 26-27-103";

  // Try updating only custom_plan and custom_no_of_instalments
  const setValRes = await fetch(`${url}/api/method/frappe.client.set_value`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      doctype: "Program Enrollment",
      name: enrollmentName,
      fieldname: {
        custom_plan: "Basic",
        custom_no_of_instalments: "8"
      }
    })
  });
  const json = await setValRes.json();
  console.log("Result updating custom_plan & custom_no_of_instalments:", JSON.stringify(json, null, 2));
}

run();
