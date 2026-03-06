"""
Cross-verify: Every XLSX entry must exist in Frappe. Nothing missing.
Checks all 93 XLSX entries × all Frappe companies × all payment options.
"""
import requests
import json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

# Load XLSX parsed data
xlsx = json.load(open('docs/fee_structure_parsed.json'))

# Mappings (same as seeding script)
CLASS_TO_PROGRAMS = {
    '8 State':   ['8th State'],
    '8 Cbse':    ['8th CBSE'],
    '9 State':   ['9th State'],
    '9 Cbse':    ['9th CBSE'],
    '10 State':  ['10th State'],
    '10 Cbse':   ['10th CBSE'],
    'Plus One':  ['11th State', '11th Science State', '11th Science CBSE'],
    'Plus Two':  ['12th Science State', '12th Science CBSE'],
}

BRANCH_TO_COMPANIES = {
    'Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)': [
        'Smart Up Chullickal', 'Smart Up Fortkochi', 'Smart Up Eraveli', 'Smart Up Palluruthy'
    ],
    'Thoppumpady': ['Smart Up Thopumpadi'],
    'Moolamkuzhi': ['Smart Up Moolamkuzhi'],
    'Kadavanthra': ['Smart Up Kadavanthara'],
    'Vennala':     ['Smart Up Vennala'],
    'Edappally':   ['Smart Up Edappally'],
}

INST_TO_AMOUNT = {
    '1': 'otp',
    '4': 'quarterly_total',
    '6': 'inst6_total',
    '8': 'inst8_total',
}

# Fetch ALL Fee Structures from Frappe
print('Fetching all Fee Structures from Frappe...')
r = requests.get(BASE + '/api/resource/Fee Structure', params={
    'fields': json.dumps(['name','program','company','custom_plan','custom_no_of_instalments','total_amount','docstatus']),
    'limit_page_length': 2000,
}, headers=HEADERS)
r.raise_for_status()
all_fs = r.json()['data']
print('Total in Frappe: ' + str(len(all_fs)))

# Build lookup: (company, program, plan, inst) -> {name, total_amount, docstatus}
frappe_lookup = {}
for fs in all_fs:
    key = (fs['company'], fs['program'], fs.get('custom_plan',''), str(fs.get('custom_no_of_instalments','')))
    frappe_lookup[key] = fs

# Now check every XLSX entry
print('\n' + '='*80)
print('CROSS-VERIFICATION: XLSX vs Frappe')
print('='*80)

total_checks = 0
ok_count = 0
missing_count = 0
wrong_amount_count = 0
not_submitted_count = 0
errors = []

for xlsx_key, entry in sorted(xlsx.items()):
    branch = entry['branch']
    plan = entry['plan']
    xlsx_class = entry['class']
    
    companies = BRANCH_TO_COMPANIES[branch]
    programs = CLASS_TO_PROGRAMS[xlsx_class]
    
    for company in companies:
        for program in programs:
            for inst in ['1', '4', '6', '8']:
                total_checks += 1
                amount_field = INST_TO_AMOUNT[inst]
                expected_amount = entry[amount_field]
                
                key = (company, program, plan, inst)
                fs = frappe_lookup.get(key)
                
                short_co = company.replace('Smart Up ', '')
                label = short_co + ' | ' + program + ' | ' + plan + ' | inst=' + inst
                
                if fs is None:
                    missing_count += 1
                    errors.append('MISSING: ' + label + ' (expected amt=' + str(expected_amount) + ')')
                elif abs(fs['total_amount'] - expected_amount) > 0.01:
                    wrong_amount_count += 1
                    errors.append('WRONG AMT: ' + label + ' | expected=' + str(expected_amount) + ' got=' + str(fs['total_amount']) + ' | doc=' + fs['name'])
                elif fs.get('docstatus') != 1:
                    not_submitted_count += 1
                    errors.append('NOT SUBMITTED: ' + label + ' | doc=' + fs['name'] + ' | docstatus=' + str(fs.get('docstatus')))
                else:
                    ok_count += 1

print('\nXLSX entries: ' + str(len(xlsx)))
print('Total checks (company x program x plan x inst): ' + str(total_checks))
print()
print('  OK (correct amount + submitted): ' + str(ok_count))
print('  MISSING from Frappe:             ' + str(missing_count))
print('  WRONG AMOUNT:                    ' + str(wrong_amount_count))
print('  NOT SUBMITTED:                   ' + str(not_submitted_count))
print()

if errors:
    print('ERRORS:')
    for e in errors:
        print('  ' + e)
else:
    print('*** ALL ' + str(total_checks) + ' CHECKS PASSED — XLSX IS 100% REPRESENTED IN FRAPPE ***')

# Also verify reverse: every XLSX entry is accounted for
print('\n' + '='*80)
print('XLSX ENTRY-LEVEL SUMMARY')
print('='*80)

branches_order = [
    'Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)',
    'Thoppumpady', 'Moolamkuzhi', 'Kadavanthra', 'Vennala', 'Edappally'
]

for branch in branches_order:
    entries = [(k, v) for k, v in xlsx.items() if v['branch'] == branch]
    entries.sort(key=lambda x: (x[1]['plan'], x[1]['class']))
    
    short = branch.split('(')[0].strip() if '(' in branch else branch
    print('\n--- ' + short + ' (' + str(len(entries)) + ' XLSX entries) ---')
    
    for k, e in entries:
        classes_in_xlsx = e['class']
        print('  ' + classes_in_xlsx.ljust(12) + ' | ' + e['plan'].ljust(15) + 
              ' | Annual=' + str(e['annual_fee']).rjust(6) + 
              ' | OTP=' + str(e['otp']).rjust(6) + 
              ' | Q=' + str(e['quarterly_total']).rjust(6) + 
              ' | 6I=' + str(e['inst6_total']).rjust(6) + 
              ' | 8I=' + str(e['inst8_total']).rjust(6))
