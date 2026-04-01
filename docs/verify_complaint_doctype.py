import requests, json
BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}
r = requests.get(f'{BASE}/api/resource/DocType/Complaint', headers=HEADERS)
d = r.json()['data']
print("Name:", d["name"], "| Autoname:", d["autoname"], "| Module:", d["module"])
print("Fields:", len(d["fields"]))
for f in d['fields']:
    fn = f.get('fieldname','')
    ft = f.get('fieldtype','')
    if ft not in ('Column Break','Section Break'):
        print("  %-30s %-15s" % (fn, ft))
print("Permissions:", len(d["permissions"]))
for p in d['permissions']:
    print("  %s: R=%s, W=%s, C=%s" % (p["role"], p.get("read"), p.get("write"), p.get("create")))

# Test creating a complaint
print("\nTest: Creating a test complaint...")
r2 = requests.post(f'{BASE}/api/resource/Complaint', headers={**HEADERS, 'Content-Type': 'application/json'}, json={
    "subject": "Test Complaint",
    "category": "Academic",
    "description": "This is a test complaint to verify the doctype works.",
    "student": "EDU-STU-2025-00236",
    "branch": "Smart Up Chullickal",
    "branch_abbr": "CHL",
    "guardian_email": "test@example.com",
    "priority": "Medium",
    "status": "Open",
})
if r2.status_code in (200, 201):
    c = r2.json()['data']
    print("Created:", c['name'], "| Status:", c['status'])
    # Now delete it
    r3 = requests.delete(f'{BASE}/api/resource/Complaint/{c["name"]}', headers=HEADERS)
    print("Cleaned up test record:", r3.status_code)
else:
    print("Create failed:", r2.status_code, r2.text[:500])
