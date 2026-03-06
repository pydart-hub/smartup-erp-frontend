"""Check Vennala Fee Structure coverage."""
import requests
import json
from collections import defaultdict

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

r = requests.get(BASE + '/api/resource/Fee Structure', params={
    'fields': json.dumps(['name','program','custom_plan','custom_no_of_instalments','total_amount']),
    'filters': json.dumps([['company','=','Smart Up Vennala']]),
    'limit_page_length': 500,
    'order_by': 'program asc, custom_plan asc, custom_no_of_instalments asc'
}, headers=HEADERS)

data = r.json()['data']
print('Vennala Fee Structures: ' + str(len(data)))

# Group by program
by_prog = defaultdict(list)
for fs in data:
    by_prog[fs['program']].append(fs)

all_expected_programs = [
    '8th State', '8th CBSE',
    '9th State', '9th CBSE',
    '10th State', '10th CBSE',
    '11th State', '11th Science State', '11th Science CBSE',
    '12th Science State', '12th Science CBSE',
]

all_plans = ['Basic', 'Intermediate', 'Advanced']
all_insts = ['1', '4', '6', '8']

print('\n=== VENNALA COVERAGE MATRIX ===')
print('Program'.ljust(25) + '  '.join(p[:5] + '-' + i for p in all_plans for i in all_insts))

for prog in all_expected_programs:
    row = prog.ljust(25)
    items = by_prog.get(prog, [])
    lookup = {}
    for fs in items:
        k = (fs.get('custom_plan',''), str(fs.get('custom_no_of_instalments','')))
        lookup[k] = fs['total_amount']
    for plan in all_plans:
        for inst in all_insts:
            amt = lookup.get((plan, inst))
            if amt:
                row += str(int(amt)).rjust(7)
            else:
                row += '  MISS '
    print(row)

# Count missing
missing = []
for prog in all_expected_programs:
    items = by_prog.get(prog, [])
    lookup = set()
    for fs in items:
        lookup.add((fs.get('custom_plan',''), str(fs.get('custom_no_of_instalments',''))))
    for plan in all_plans:
        for inst in all_insts:
            if (plan, inst) not in lookup:
                missing.append((prog, plan, inst))

print('\nTotal present: ' + str(len(data)))
print('Total missing: ' + str(len(missing)))
if missing:
    print('\nMissing entries:')
    for m in missing:
        print('  ' + m[0] + ' | ' + m[1] + ' | inst=' + m[2])
