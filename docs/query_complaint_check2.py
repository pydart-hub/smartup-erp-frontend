import requests, json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

# 1. Check Issue doctype structure (Frappe Support module)
print("=" * 60)
print("ISSUE DOCTYPE (Frappe Support Module)")
print("=" * 60)
r = requests.get(f'{BASE}/api/resource/DocType/Issue', headers=HEADERS)
if r.status_code == 200:
    d = r.json().get('data', {})
    print(f"Module: {d.get('module')}")
    print(f"Is Submittable: {d.get('is_submittable')}")
    print(f"Track Changes: {d.get('track_changes')}")
    print(f"\nFields ({len(d.get('fields', []))}):")
    for f in d.get('fields', []):
        fn = f.get('fieldname', '')
        ft = f.get('fieldtype', '')
        lb = f.get('label', '')
        opts = f.get('options', '')
        reqd = '*' if f.get('reqd') else ' '
        if ft not in ('Column Break', 'Section Break', 'Tab Break'):
            print(f"  {reqd} {fn:35s} {ft:15s} {lb:30s} {opts}")
    perms = d.get('permissions', [])
    print(f'\nPermissions ({len(perms)}):')
    for p in perms:
        print(f"  Role: {p.get('role'):25s} Read:{p.get('read')} Write:{p.get('write')} Create:{p.get('create')} Delete:{p.get('delete')}")
else:
    print(f'Issue doctype not found: {r.status_code}')

# 2. Check Student Branch Transfer custom doctype structure
print("\n" + "=" * 60)
print("STUDENT BRANCH TRANSFER DOCTYPE (Custom Education)")
print("=" * 60)
r2 = requests.get(f'{BASE}/api/resource/DocType/Student Branch Transfer', headers=HEADERS)
if r2.status_code == 200:
    d2 = r2.json().get('data', {})
    print(f"Module: {d2.get('module')}")
    print(f"Custom: {d2.get('custom')}")
    print(f"Autoname: {d2.get('autoname')}")
    print(f"\nFields ({len(d2.get('fields', []))}):")
    for f in d2.get('fields', []):
        fn = f.get('fieldname', '')
        ft = f.get('fieldtype', '')
        lb = f.get('label', '')
        opts = f.get('options', '')
        reqd = '*' if f.get('reqd') else ' '
        if ft not in ('Column Break', 'Section Break', 'Tab Break'):
            print(f"  {reqd} {fn:35s} {ft:15s} {lb:30s} {opts}")
    perms = d2.get('permissions', [])
    print(f'\nPermissions ({len(perms)}):')
    for p in perms:
        print(f"  Role: {p.get('role'):25s} Read:{p.get('read')} Write:{p.get('write')} Create:{p.get('create')}")
else:
    print(f'Student Branch Transfer not found: {r2.status_code}')

# 3. Check existing Issue Types (if any configured)
print("\n" + "=" * 60)
print("EXISTING ISSUE TYPES")
print("=" * 60)
r3 = requests.get(f'{BASE}/api/resource/Issue Type', params={
    'fields': json.dumps(['name']),
    'limit_page_length': 50
}, headers=HEADERS)
types = r3.json().get('data', [])
print(f"Issue Types ({len(types)}):")
for t in types:
    print(f"  {t['name']}")

# 4. Check existing Issue Priorities
r4 = requests.get(f'{BASE}/api/resource/Issue Priority', params={
    'fields': json.dumps(['name']),
    'limit_page_length': 20
}, headers=HEADERS)
priorities = r4.json().get('data', [])
print(f"\nIssue Priorities ({len(priorities)}):")
for p in priorities:
    print(f"  {p['name']}")

# 5. Check if any Issues already exist
r5 = requests.get(f'{BASE}/api/resource/Issue', params={
    'fields': json.dumps(['name', 'subject', 'status']),
    'limit_page_length': 5
}, headers=HEADERS)
issues = r5.json().get('data', [])
print(f"\nExisting Issues ({len(issues)}):")
for i in issues:
    print(f"  {i['name']}: {i.get('subject', '')} [{i.get('status', '')}]")
