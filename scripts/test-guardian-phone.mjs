import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${key}:${secret}`,
  "Content-Type": "application/json",
};

async function testGuardianPhone() {
  const grdId = "EDU-GRD-2026-00327";
  const res = await fetch(`${url}/api/resource/Guardian/${encodeURIComponent(grdId)}`, { headers });
  const data = (await res.json()).data;
  console.log("Guardian data:", {
    name: data.name,
    guardian_name: data.guardian_name,
    mobile_number: data.mobile_number,
    email_address: data.email_address
  });

  if (data.mobile_number) {
    const cleanPhone = data.mobile_number.replace(/\D/g, "").slice(-10);
    const histRes = await fetch(`https://smartuplearning.net/api/public-exam/history?phone=${cleanPhone}`);
    if (histRes.ok) {
      const histData = await histRes.json();
      console.log(`Online attempts for guardian phone ${cleanPhone}:`, histData.attempts?.length || 0);
      if (histData.attempts?.length > 0) {
        console.log("Attempt titles:", histData.attempts.map(a => a.examTitle));
      }
    }
  }
}

testGuardianPhone();
