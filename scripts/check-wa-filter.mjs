const BASE = "https://smartup.m.frappe.cloud/api";
const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";
const h = { Authorization: AUTH, Accept: "application/json" };

async function get(p) {
  const r = await fetch(BASE + "/" + p, { headers: h });
  return r.json();
}

(async () => {
  const wa2 = await get("resource/Work%20Assignment/WA-00002");
  console.log("WA-00002 assignments:", JSON.stringify(wa2.data?.assignments, null, 2));

  const filters = encodeURIComponent(JSON.stringify([
    ["docstatus", "=", 1],
    ["Work Assignment Detail", "instructor", "=", "Anju S venu"]
  ]));
  const fields = encodeURIComponent(JSON.stringify(["name", "title", "docstatus"]));
  const list = await get(`resource/Work%20Assignment?filters=${filters}&fields=${fields}&limit_page_length=50`);
  console.log("Child filter result:", JSON.stringify(list.data, null, 2));
})();
