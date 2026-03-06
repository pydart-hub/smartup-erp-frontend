"""Check existing Fee Structures vs XLSX requirements."""
import requests
import json

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

def get(doctype, fields, limit=500, filters=None):
    params = {'fields': json.dumps(fields), 'limit_page_length': limit}
    if filters:
        params['filters'] = json.dumps(filters)
    r = requests.get(BASE + '/api/resource/' + doctype, params=params, headers=HEADERS)
    r.raise_for_status()
    return r.json()['data']

# Load XLSX parsed data
xlsx = json.load(open('docs/fee_structure_parsed.json'))

# XLSX class → Frappe program mapping
# Plus One/Plus Two map to MULTIPLE Frappe programs (State + Science State + Science CBSE)
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

# XLSX branch → Frappe companies
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

# Company abbreviations
COMPANY_ABBR = {
    'Smart Up Chullickal': 'SU CHL',
    'Smart Up Edappally': 'SU EDPLY',
    'Smart Up Eraveli': 'SU ERV',
    'Smart Up Fortkochi': 'SU FKO',
    'Smart Up Kadavanthara': 'SU KDV',
    'Smart Up Moolamkuzhi': 'SU MMK',
    'Smart Up Palluruthy': 'SU PLR',
    'Smart Up Thopumpadi': 'SU THP',
    'Smart Up Vennala': 'SU VYT',
}

# Receivable accounts
RECEIVABLE_ACCOUNTS = {
    'Smart Up Chullickal': 'Debtors - SU CHL',
    'Smart Up Edappally': 'Debtors - SU EDPLY',
    'Smart Up Eraveli': 'Debtors - SU ERV',
    'Smart Up Fortkochi': 'Debtors - SU FKO',
    'Smart Up Kadavanthara': 'Debtors - SU KDV',
    'Smart Up Moolamkuzhi': 'Debtors - SU MMK',
    'Smart Up Palluruthy': 'Debtors - SU PLR',
    'Smart Up Thopumpadi': 'Debtors - SU THP',
    'Smart Up Vennala': 'Debtors - SU VYT',
}

# Instalment → total_amount field mapping
INST_TO_AMOUNT = {
    '1': 'otp',
    '4': 'quarterly_total',
    '6': 'inst6_total',
    '8': 'inst8_total',
}

# Fee category for each program
FEE_CATEGORIES = {
    '8th State': '8th State Tuition Fee',
    '8th CBSE': '8th CBSE Tuition Fee',
    '9th State': '9th State Tuition Fee',
    '9th CBSE': '9th CBSE Tuition Fee',
    '10th State': '10th State Tuition Fee',
    '10th CBSE': '10th CBSE Tuition Fee',
    '11th State': '11th Science State Tuition Fee',
    '11th Science State': '11th Science State Tuition Fee',
    '11th Science CBSE': '11th Science CBSE Tuition Fee',
    '12th Science State': '12th Science State Tuition Fee',
    '12th Science CBSE': '12th Science CBSE Tuition Fee',
}

# Get all existing FS
print('Fetching existing Fee Structures...')
existing = get('Fee Structure', [
    'name', 'program', 'company', 'custom_plan', 
    'custom_no_of_instalments', 'total_amount', 'docstatus'
], limit=2000)

# Build lookup: (company, program, plan, instalments) → FS
existing_map = {}
for fs in existing:
    key = (fs['company'], fs['program'], fs.get('custom_plan',''), str(fs.get('custom_no_of_instalments','')))
    existing_map[key] = fs

print(f'Existing: {len(existing)} Fee Structures')

# Build required list
required = []
for xlsx_key, entry in xlsx.items():
    branch = entry['branch']
    plan = entry['plan']
    xlsx_class = entry['class']
    
    companies = BRANCH_TO_COMPANIES[branch]
    programs = CLASS_TO_PROGRAMS[xlsx_class]
    
    for company in companies:
        for program in programs:
            for inst in ['1', '4', '6', '8']:
                amount_field = INST_TO_AMOUNT[inst]
                amount = entry[amount_field]
                required.append({
                    'company': company,
                    'program': program,
                    'plan': plan,
                    'instalments': inst,
                    'amount': amount,
                    'xlsx_entry': entry,
                })

print(f'Required: {len(required)} Fee Structures')

# Check what's missing vs what exists with wrong amounts
missing = []
wrong_amount = []
correct = []

for req in required:
    key = (req['company'], req['program'], req['plan'], req['instalments'])
    if key in existing_map:
        fs = existing_map[key]
        if abs(fs['total_amount'] - req['amount']) > 0.01:
            wrong_amount.append({
                'name': fs['name'],
                'key': key,
                'expected': req['amount'],
                'actual': fs['total_amount'],
                'docstatus': fs['docstatus'],
            })
        else:
            correct.append(key)
    else:
        missing.append(req)

print(f'\nCorrect: {len(correct)}')
print(f'Wrong amount: {len(wrong_amount)}')
print(f'Missing: {len(missing)}')

if wrong_amount:
    print('\n=== WRONG AMOUNTS ===')
    for w in wrong_amount[:20]:
        print(f"  {w['name']} | {w['key']} | expected={w['expected']} actual={w['actual']} ds={w['docstatus']}")
    if len(wrong_amount) > 20:
        print(f'  ... and {len(wrong_amount)-20} more')

if missing:
    print('\n=== MISSING ===')
    for m in missing[:40]:
        print(f"  {m['company']} | {m['program']} | {m['plan']} | inst={m['instalments']} | amt={m['amount']}")
    if len(missing) > 40:
        print(f'  ... and {len(missing)-40} more')

# Summary by company
print('\n=== MISSING BY COMPANY ===')
from collections import Counter
mc = Counter(m['company'] for m in missing)
for co, cnt in mc.most_common():
    print(f'  {co}: {cnt} missing')

print('\n=== MISSING BY PROGRAM ===')
mp = Counter(m['program'] for m in missing)
for prog, cnt in mp.most_common():
    print(f'  {prog}: {cnt} missing')
