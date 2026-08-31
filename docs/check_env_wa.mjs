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
    const phoneId = get("WHATSAPP_PHONE_NUMBER_ID");
    const secret = get("INVOICE_TOKEN_SECRET");
    const appUrl = get("NEXT_PUBLIC_APP_URL");

    console.log("=== CONFIG CHECK ===");
    console.log("INVOICE_TOKEN_SECRET:", secret ? "PRESENT (len=" + secret.length + ")" : "MISSING ❌");
    console.log("NEXT_PUBLIC_APP_URL:", appUrl || "NOT SET (defaults to https://smartuplearning.net)");
    console.log("PHONE_NUMBER_ID:", phoneId ? "PRESENT" : "MISSING");
    console.log("ACCESS_TOKEN:", token ? "PRESENT" : "MISSING");
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
