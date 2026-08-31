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

  console.log("Fetching recent sales invoice name...");
  const invRes = await fetch(`${url}/api/resource/Sales Invoice?limit=1&order_by=creation+desc`, {
    headers: { Authorization: auth }
  });
  const invData = await invRes.json();
  const realName = invData.data?.[0]?.name;
  console.log("Real Invoice Name:", realName);

  if (realName) {
    const printUrl = `${url}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(realName)}&format=SmartUp+Invoice&no_letterhead=1`;
    const res = await fetch(printUrl, {
      headers: { Authorization: auth }
    });
    console.log("PDF download status with 'SmartUp Invoice':", res.status, res.headers.get("content-type"));

    const printUrlStd = `${url}/api/method/frappe.utils.print_format.download_pdf?doctype=Sales+Invoice&name=${encodeURIComponent(realName)}&no_letterhead=1`;
    const resStd = await fetch(printUrlStd, {
      headers: { Authorization: auth }
    });
    console.log("PDF download status without custom format:", resStd.status, resStd.headers.get("content-type"));
  }
}

run();
