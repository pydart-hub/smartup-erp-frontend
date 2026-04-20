/**
 * Setup General Manager role on Frappe backend:
 * 1. Create the "General Manager" role (if not exists)
 * 2. Assign the role to nebilnavas@gmail.com
 * 3. Add User Permission for all 9 branches (companies)
 *
 * Usage: node scripts/setup-gm-role.mjs
 */

const BASE = "https://smartup.m.frappe.cloud";
const TOKEN = "03330270e330d49:9c2261ae11ac2d2";

const headers = {
  Authorization: `token ${TOKEN}`,
  "Content-Type": "application/json",
};

async function api(method, endpoint, body) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const json = await res.json();
  if (!res.ok && res.status !== 409) {
    console.error(`  ❌ ${method} ${endpoint}:`, res.status, JSON.stringify(json));
  }
  return { status: res.status, data: json };
}

async function main() {
  console.log("=== Setting up General Manager role ===\n");

  // 1. Create role
  console.log("1. Creating 'General Manager' role...");
  const roleRes = await api("POST", "/api/resource/Role", {
    role_name: "General Manager",
    desk_access: 1,
    is_custom: 1,
  });
  if (roleRes.status === 200 || roleRes.status === 201) {
    console.log("   ✅ Role created");
  } else if (roleRes.status === 409) {
    console.log("   ⏭ Role already exists");
  }

  // 2. Assign role to nebilnavas@gmail.com
  console.log("\n2. Assigning 'General Manager' role to nebilnavas@gmail.com...");

  // First check current roles
  const userRes = await api("GET", "/api/resource/User/nebilnavas@gmail.com");
  const currentRoles = (userRes.data?.data?.roles || []).map(r => r.role);
  console.log("   Current roles:", currentRoles.join(", "));

  if (currentRoles.includes("General Manager")) {
    console.log("   ⏭ Already has General Manager role");
  } else {
    // Add the role
    const newRoles = [...(userRes.data?.data?.roles || []), { role: "General Manager" }];
    const updateRes = await api("PUT", "/api/resource/User/nebilnavas@gmail.com", {
      roles: newRoles,
    });
    if (updateRes.status === 200) {
      console.log("   ✅ Role assigned");
    }
  }

  // 3. Add User Permissions for all 9 companies
  console.log("\n3. Adding User Permissions for all 9 branches...");
  const companies = [
    "Smart Up Chullickal",
    "Smart Up Edappally",
    "Smart Up Eraveli",
    "Smart Up Fortkochi",
    "Smart Up Kadavanthara",
    "Smart Up Moolamkuzhi",
    "Smart Up Palluruthy",
    "Smart Up Thopumpadi",
    "Smart Up Vennala",
  ];

  for (const company of companies) {
    // Check if permission already exists
    const checkRes = await api(
      "GET",
      `/api/resource/User Permission?filters=[["user","=","nebilnavas@gmail.com"],["allow","=","Company"],["for_value","=","${encodeURIComponent(company)}"]]&limit_page_length=1`
    );
    const existing = checkRes.data?.data?.length > 0;

    if (existing) {
      console.log(`   ⏭ ${company} — already permitted`);
    } else {
      const permRes = await api("POST", "/api/resource/User Permission", {
        user: "nebilnavas@gmail.com",
        allow: "Company",
        for_value: company,
        apply_to_all_doctypes: 1,
      });
      if (permRes.status === 200 || permRes.status === 201) {
        console.log(`   ✅ ${company} — permission added`);
      }
    }
  }

  console.log("\n=== Done! ===");
}

main().catch(console.error);
