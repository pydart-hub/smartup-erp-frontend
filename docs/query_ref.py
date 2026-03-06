"""Query key reference data from Frappe."""
import requests
import json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

def get(doctype, fields, limit=50, filters=None):
    params = {'fields': json.dumps(fields), 'limit_page_length': limit}
    if filters:
        params['filters'] = json.dumps(filters)
    r = requests.get(BASE + '/api/resource/' + doctype, params=params, headers=HEADERS)
    r.raise_for_status()
    return r.json()['data']

# Programs
print('=== PROGRAMS ===')
progs = get('Program', ['name', 'program_abbreviation'])
for p in progs:
    print('  ' + p['name'] + ' | abbr=' + str(p.get('program_abbreviation', '')))

# Companies
print('\n=== COMPANIES ===')
companies = get('Company', ['name', 'abbr'])
for c in companies:
    print('  ' + c['name'] + ' | abbr=' + c['abbr'])

# Academic Years
print('\n=== ACADEMIC YEARS ===')
ays = get('Academic Year', ['name'])
for a in ays:
    print('  ' + a['name'])

# Fee Categories
print('\n=== FEE CATEGORIES ===')
cats = get('Fee Category', ['name'])
for c in cats:
    print('  ' + c['name'])

# Custom Fields on Fee Structure
print('\n=== CUSTOM FIELDS ON FEE STRUCTURE ===')
cfs = get('Custom Field', ['name', 'fieldname', 'fieldtype', 'label'], limit=100,
          filters=[['dt', '=', 'Fee Structure']])
for cf in cfs:
    print('  ' + cf['fieldname'] + ' (' + cf['fieldtype'] + ') - ' + str(cf.get('label', '')))

# Items with Tuition
print('\n=== TUITION FEE ITEMS ===')
items = get('Item', ['name', 'item_name', 'item_group'], limit=50,
            filters=[['name', 'like', '%Tuition%']])
for it in items:
    print('  ' + it['name'] + ' | group=' + str(it.get('item_group', '')))

# Count existing Fee Structures
print('\n=== FEE STRUCTURE COUNT ===')
fss = get('Fee Structure', ['count(name) as cnt'], limit=1)
print('  Total: ' + str(fss[0]['cnt']))

# Count by company
print('\n=== FEE STRUCTURES BY COMPANY ===')
fss2 = get('Fee Structure', ['company', 'count(name) as cnt'], limit=50)
# Use reportview for group_by
r = requests.get(BASE + '/api/method/frappe.client.get_list', params={
    'doctype': 'Fee Structure',
    'fields': json.dumps(['company', 'count(name) as cnt']),
    'group_by': 'company',
    'limit_page_length': 50
}, headers=HEADERS)
for row in r.json().get('message', []):
    print('  ' + str(row.get('company', '')) + ': ' + str(row['cnt']))

# Receivable accounts per company
print('\n=== RECEIVABLE ACCOUNTS (first FS per company) ===')
for comp in companies:
    fsr = get('Fee Structure', ['name', 'receivable_account', 'company'], limit=1,
              filters=[['company', '=', comp['name']]])
    if fsr:
        print('  ' + comp['name'] + ' -> ' + str(fsr[0].get('receivable_account', 'NONE')))
    else:
        print('  ' + comp['name'] + ' -> NO FEE STRUCTURES')
