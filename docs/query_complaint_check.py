import requests, json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

# 1. Check if Complaint doctype exists
r = requests.get(f'{BASE}/api/resource/DocType/Complaint', headers=HEADERS)
print('Complaint DocType Status:', r.status_code)
if r.status_code == 200:
    d = r.json().get('data', {})
    print('EXISTS! Module:', d.get('module'))
    for f in d.get('fields', []):
        fn = f.get('fieldname', '')
        ft = f.get('fieldtype', '')
        lb = f.get('label', '')
        print(f'  {fn:30s} {ft:15s} {lb}')
    perms = d.get('permissions', [])
    print('\nPermissions:')
    for p in perms:
        print(f'  Role: {p.get("role")}, Read: {p.get("read")}, Write: {p.get("write")}, Create: {p.get("create")}')
else:
    print('Complaint DocType does NOT exist')

# 2. Search for complaint/grievance/feedback doctypes
for term in ['omplaint', 'rievance', 'eedback', 'icket', 'ssue']:
    r2 = requests.get(f'{BASE}/api/resource/DocType', params={
        'filters': json.dumps([['name', 'like', f'%{term}%']]),
        'fields': json.dumps(['name', 'module']),
        'limit_page_length': 20
    }, headers=HEADERS)
    results = r2.json().get('data', [])
    if results:
        print(f'\nFound doctypes matching "*{term}*":')
        for item in results:
            print(f'  {item["name"]} (module: {item.get("module", "?")})')

# 3. Check what custom doctypes exist (Education module)
r3 = requests.get(f'{BASE}/api/resource/DocType', params={
    'filters': json.dumps([['module', '=', 'Education'], ['custom', '=', 1]]),
    'fields': json.dumps(['name', 'module']),
    'limit_page_length': 50
}, headers=HEADERS)
custom_edu = r3.json().get('data', [])
print(f'\nCustom Education doctypes ({len(custom_edu)}):')
for item in custom_edu:
    print(f'  {item["name"]}')

# 4. Check what permissions exist for Parent role on any doctype
r4 = requests.get(f'{BASE}/api/resource/DocType', params={
    'filters': json.dumps([['DocPerm', 'role', '=', 'Parent']]),
    'fields': json.dumps(['name', 'module']),
    'limit_page_length': 50
}, headers=HEADERS)
parent_perms = r4.json().get('data', [])
print(f'\nDoctypes with Parent role permissions ({len(parent_perms)}):')
for item in parent_perms:
    print(f'  {item["name"]} (module: {item.get("module", "?")})')
