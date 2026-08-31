import fs from "fs";
import path from "path";

async function run() {
  const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
  const get = (k) => {
    const m = env.match(new RegExp(k + "=(.*)"));
    return m ? m[1].trim() : "";
  };

  const url = get("NEXT_PUBLIC_FRAPPE_URL");
  const key = get("FRAPPE_API_KEY");
  const secret = get("FRAPPE_API_SECRET");
  const auth = `token ${key}:${secret}`;

  console.log("Checking print format 'SmartUp Invoice' on Frappe...");
  const printUrl = `${url}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=ACC-SINV-2026-00042&format=SmartUp+Invoice&no_letterhead=1`;
  const res = await fetch(printUrl, {
    headers: { Authorization: auth }
  });
  console.log("Status with 'SmartUp Invoice':", res.status, res.headers.get("content-type"));
  
  if (!res.ok) {
    console.log("Testing default/Standard print format...");
    const printUrlStd = `${url}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=ACC-SINV-2026-00042&no_letterhead=1`;
    const resStd = await fetch(printUrlStd, {
      headers: { Authorization: auth }
    });
    console.log("Status with Standard format:", resStd.status, resStd.headers.get("content-type"));
  }
}

run();
