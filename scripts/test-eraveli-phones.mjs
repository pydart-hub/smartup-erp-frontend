import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${key}:${secret}`,
  "Content-Type": "application/json",
};

async function checkPhoneOnline(phone, label) {
  const p = phone.replace(/\D/g, "").slice(-10);
  const res = await fetch(`https://smartuplearning.net/api/public-exam/history?phone=${p}`);
  if (res.ok) {
    const data = await res.json();
    console.log(`${label} (${p}) attempts:`, data.attempts?.length || 0);
    if (data.attempts?.length > 0) {
      console.log(`  Titles:`, data.attempts.map((a) => a.examTitle));
    }
  }
}

async function testEraveliPhones() {
  await checkPhoneOnline("8089684858", "AFNA C mobile");
  // check guardian
  const gRes = await fetch(`${url}/api/resource/Guardian/EDU-GRD-2026-00161`, { headers });
  const gData = (await gRes.json()).data;
  console.log("AFNA C guardian mobile:", gData.mobile_number);
  if (gData.mobile_number) await checkPhoneOnline(gData.mobile_number, "AFNA C guardian mobile");

  await checkPhoneOnline("9497526517", "FAIZAAN mobile");
}

testEraveliPhones();
