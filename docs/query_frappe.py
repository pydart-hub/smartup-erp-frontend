"""Query Frappe backend to understand current state."""
import requests
import json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

def get(doctype, fields, limit=50, filters=None):
    params = {'fields': json.dumps(fields), 'limit_page_length': limit}
    if filters:
        params['filters'] = json.dumps(filters)
    r = requests.get(f'{BASE}/api/resource/{doctype}', params=params, headers=HEADERS)
    r.raise_for_status()
    return r.json()['data']

# Programs
print('=== PROGRAMS ===')
progs = get('Program', ['name', 'program_abbreviation'])
for p in progs:
    print(f"  {p['name']} | abbr={p.get('program_abbreviation','')}")

# Companies
print('\n=== COMPANIES ===')
companies = get('Company', ['name', 'abbr'])
for c in companies:
    print(f"  {c['name']} | abbr={c['abbr']}")

# Academic Years
print('\n=== ACADEMIC YEARS ===')
ays = get('Academic Year', ['name', 'year_start_date', 'year_end_date'])
for a in ays:
    print(f"  {a['name']}")

# Existing Fee Structures
print('\n=== EXISTING FEE STRUCTURES ===')
fss = get('Fee Structure', ['name', 'program', 'company', 'custom_plan', 'custom_no_of_instalments', 'total_amount', 'docstatus'], limit=500)
print(f"  Total: {len(fss)}")
for fs in fss:
    print(f"  {fs['name']} | prog={fs.get('program','')} | co={fs.get('company','')} | plan={fs.get('custom_plan','')} | inst={fs.get('custom_no_of_instalments','')} | amt={fs.get('total_amount',0)} | ds={fs.get('docstatus',0)}")

# Fee Categories
print('\n=== FEE CATEGORIES ===')
cats = get('Fee Category', ['name'])
for c in cats:
    print(f"  {c['name']}")

# Check what custom fields exist on Fee Structure
print('\n=== CUSTOM FIELDS ON FEE STRUCTURE ===')
cfs = get('Custom Field', ['name', 'fieldname', 'fieldtype', 'label'], limit=100,
          filters=[['dt', '=', 'Fee Structure']])
for cf in cfs:
    print(f"  {cf['fieldname']} ({cf['fieldtype']}) - {cf.get('label','')}")

# Items with "Tuition" in name
print('\n=== TUITION FEE ITEMS ===')
items = get('Item', ['name', 'item_name', 'item_group'], limit=50,
            filters=[['name', 'like', '%Tuition%']])
for it in items:
    print(f"  {it['name']} | {it.get('item_name','')} | group={it.get('item_group','')}")
