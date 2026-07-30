require('dotenv').config({ path: '.env.local' });
const { NEXT_PUBLIC_FRAPPE_URL, FRAPPE_API_KEY, FRAPPE_API_SECRET } = process.env;

(async () => {
  try {
    const url = `${NEXT_PUBLIC_FRAPPE_URL}/api/resource/Assessment Result?fields=["assessment_plan"]&group_by=assessment_plan&limit=1000`;
    console.log("URL:", url);
    const res = await fetch(url, {
      headers: { 'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}` }
    });
    const json = await res.json();
    console.log("Unique plans count:", json.data?.length);
    console.log("Plans sample:", json.data?.slice(0, 10));
  } catch(e) {
    console.error("Error:", e.message);
  }
})();
