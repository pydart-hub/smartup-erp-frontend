import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_FRAPPE_URL;
const key = process.env.FRAPPE_API_KEY;
const secret = process.env.FRAPPE_API_SECRET;
const headers = {
  Authorization: `token ${key}:${secret}`,
  "Content-Type": "application/json",
};

async function checkPhoneSources() {
  const stuId = "STU-SU VYT-26-019";
  const res = await fetch(`${url}/api/resource/Student/${encodeURIComponent(stuId)}`, { headers });
  const data = (await res.json()).data;
  console.log("Student fields:", {
    name: data.name,
    student_name: data.first_name,
    mobile: data.student_mobile_number,
    custom_phone: data.custom_phone_number,
    guardians: data.guardians,
  });
}

checkPhoneSources();
