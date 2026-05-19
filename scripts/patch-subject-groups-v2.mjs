/**
 * patch-subject-groups-v2.mjs
 * Uses frappe.client.set_value to bypass REST schema cache.
 */
import https from "https";

const AUTH = "token 03330270e330d49:9c2261ae11ac2d2";

const SUBJECT_MAP = {
  "Kadavanthara-Physics-11-A":    "Physics",
  "Kadavanthara-Chemistry-11-A":  "Chemistry",
  "Kadavanthara-Maths-11-A":      "Maths",
  "Kadavanthara-Physics-12-A":    "Physics",
  "Kadavanthara-Chemistry-12-A":  "Chemistry",
  "Kadavanthara-Maths-12-A":      "Maths",
  "Vennala-Physics-11-A":         "Physics",
  "Vennala-Chemistry-11-A":       "Chemistry",
  "Vennala-Maths-11-A":           "Maths",
  "Vennala-Phy-Chem-11-A":        "Phy-Chem",
  "Vennala-Phy-Maths-11-A":       "Phy-Maths",
  "Vennala-Chem-Maths-11-A":      "Chem-Maths",
  "Vennala-Physics-12-A":         "Physics",
  "Vennala-Chemistry-12-A":       "Chemistry",
  "Vennala-Maths-12-A":           "Maths",
  "Vennala-Phy-Chem-12-A":        "Phy-Chem",
  "Vennala-Phy-Maths-12-A":       "Phy-Maths",
  "Vennala-Chem-Maths-12-A":      "Chem-Maths",
  "Edappally-Physics-11-A":       "Physics",
  "Edappally-Chemistry-11-A":     "Chemistry",
  "Edappally-Maths-11-A":         "Maths",
  "Edappally-Phy-Chem-11-A":      "Phy-Chem",
  "Edappally-Phy-Maths-11-A":     "Phy-Maths",
  "Edappally-Chem-Maths-11-A":    "Chem-Maths",
  "Edappally-Physics-12-A":       "Physics",
  "Edappally-Chemistry-12-A":     "Chemistry",
  "Edappally-Maths-12-A":         "Maths",
  "Edappally-Phy-Chem-12-A":      "Phy-Chem",
  "Edappally-Phy-Maths-12-A":     "Phy-Maths",
  "Edappally-Chem-Maths-12-A":    "Chem-Maths",
  "Thopumpadi-Phy-Chem-11-A":     "Phy-Chem",
  "Thopumpadi-Phy-Chem-12-A":     "Phy-Chem",
  "Chullickal-Phy-Chem-11-A":     "Phy-Chem",
  "Chullickal-Phy-Chem-12-A":     "Phy-Chem",
  "Fortkochi-Phy-Chem-11-A":      "Phy-Chem",
  "Fortkochi-Phy-Chem-12-A":      "Phy-Chem",
  "Palluruthy-Phy-Chem-11-A":     "Phy-Chem",
  "Palluruthy-Phy-Chem-12-A":     "Phy-Chem",
  "Eraveli-Phy-Chem-11-A":        "Phy-Chem",
  "Eraveli-Phy-Chem-12-A":        "Phy-Chem",
};

function post(path, body) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const r = https.request(
      {
        hostname: "smartup.m.frappe.cloud",
        path,
        method: "POST",
        headers: {
          Authorization: AUTH,
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try { resolve({ s: res.statusCode, d: JSON.parse(d) }); }
          catch { resolve({ s: res.statusCode, d }); }
        });
      }
    );
    r.on("error", reject);
    r.write(payload);
    r.end();
  });
}

let ok = 0, fail = 0;
const entries = Object.entries(SUBJECT_MAP);
console.log(`\nPatching ${entries.length} groups via frappe.client.set_value...\n`);

for (const [name, subject] of entries) {
  const res = await post("/api/method/frappe.client.set_value", {
    doctype: "Student Group",
    name,
    fieldname: "custom_subject",
    value: subject,
  });

  if (res.s === 200 && res.d?.message) {
    console.log(`  ✓  ${name}  →  "${subject}"`);
    ok++;
  } else {
    const err = res.d?.exc_type ?? res.d?.exception ?? `HTTP ${res.s}`;
    console.log(`  ✗  ${name}  →  ${err}`);
    fail++;
  }

  await new Promise((r) => setTimeout(r, 150));
}

console.log(`\nDone. OK: ${ok}  Failed: ${fail}\n`);
