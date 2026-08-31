import fs from "fs";
import path from "path";

async function run() {
  try {
    const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const get = (k) => {
      const m = env.match(new RegExp(k + "=(.*)"));
      return m ? m[1].trim() : "";
    };

    const token = get("WHATSAPP_ACCESS_TOKEN");
    const waba = get("WHATSAPP_BUSINESS_ID");
    const phoneId = get("WHATSAPP_PHONE_NUMBER_ID");

    console.log("Phone ID:", phoneId ? phoneId.slice(0, 5) + "..." : "MISSING");
    console.log("WABA ID:", waba ? waba.slice(0, 5) + "..." : "MISSING");
    console.log("Token configured:", !!token);

    if (waba && token) {
      const res = await fetch(`https://graph.facebook.com/v21.0/${waba}/message_templates?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      console.log("\n=== META WHATSAPP TEMPLATES STATUS ===");
      if (data.data) {
        data.data.forEach((t) => {
          console.log(`- Template: "${t.name}" | Status: ${t.status} | Category: ${t.category} | Lang: ${t.language}`);
          if (t.name.includes("payment")) {
            console.log("  Structure:", JSON.stringify(t.components, null, 2));
          }
        });
      } else {
        console.log("Meta API Response:", JSON.stringify(data, null, 2));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
