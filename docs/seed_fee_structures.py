"""
Create all missing Fee Structure documents in Frappe.

Reads from docs/fee_structure_parsed.json and creates Fee Structures
for every (company, program, plan, instalment) combination.

Naming convention: {ABBR}-{Program}-{Plan}-{Instalments}
Example: SU CHL-11th Science State-Basic-1

Each FS has:
- company, program, academic_year (2026-2027)
- custom_plan, custom_no_of_instalments, custom_branch_abbr
- total_amount (correct amount for that instalment option)
- components[] with 1 fee component (the tuition fee)
- receivable_account (Debtors - {ABBR})

After creation, each FS is submitted (docstatus=1).
"""

import requests
import json
import time
import sys

BASE = 'https://smartup.m.frappe.cloud'
HEADERS = {
    'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
    'Content-Type': 'application/json',
}
ACADEMIC_YEAR = '2026-2027'

# ── Mappings ──

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

INST_TO_AMOUNT = {
    '1': 'otp',
    '4': 'quarterly_total',
    '6': 'inst6_total',
    '8': 'inst8_total',
}

# Fee category (and item) for each program
PROGRAM_FEE_CATEGORY = {
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

PROGRAM_FEE_ITEM = {
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

def get_existing():
    """Get all existing Fee Structures as a set of (company, program, plan, inst) keys."""
    r = requests.get(BASE + '/api/resource/Fee Structure', params={
        'fields': json.dumps(['name', 'program', 'company', 'custom_plan', 'custom_no_of_instalments']),
        'limit_page_length': 2000
    }, headers=HEADERS)
    r.raise_for_status()
    existing = set()
    for fs in r.json()['data']:
        key = (fs['company'], fs['program'], fs.get('custom_plan', ''), str(fs.get('custom_no_of_instalments', '')))
        existing.add(key)
    return existing


def create_fee_structure(company, program, plan, inst, amount, abbr):
    """Create a Fee Structure and submit it."""
    name_str = abbr + '-' + program + '-' + plan + '-' + inst
    fee_cat = PROGRAM_FEE_CATEGORY[program]
    fee_item = PROGRAM_FEE_ITEM[program]
    recv_acct = RECEIVABLE_ACCOUNTS[company]

    payload = {
        'doctype': 'Fee Structure',
        'program': program,
        'academic_year': ACADEMIC_YEAR,
        'company': company,
        'receivable_account': recv_acct,
        'custom_plan': plan,
        'custom_no_of_instalments': inst,
        'custom_branch_abbr': abbr,
        'components': [
            {
                'doctype': 'Fee Component',
                'fees_category': fee_cat,
                'amount': amount,
            }
        ],
    }

    # Create (draft)
    r = requests.post(BASE + '/api/resource/Fee Structure', 
                      headers=HEADERS, json=payload)
    if r.status_code >= 400:
        return False, 'CREATE FAILED: ' + str(r.status_code) + ' ' + r.text[:200]
    
    doc_name = r.json()['data']['name']
    
    # Submit (docstatus=1)
    r2 = requests.put(BASE + '/api/resource/Fee Structure/' + requests.utils.quote(doc_name, safe=''),
                      headers=HEADERS, json={'docstatus': 1})
    if r2.status_code >= 400:
        return False, 'SUBMIT FAILED: ' + str(r2.status_code) + ' ' + r2.text[:200]
    
    return True, doc_name


def main():
    # Load XLSX data
    xlsx = json.load(open('docs/fee_structure_parsed.json'))
    
    # Get existing
    print('Fetching existing Fee Structures...')
    existing = get_existing()
    print('Existing:', len(existing))
    
    # Build required list
    to_create = []
    for entry in xlsx.values():
        branch = entry['branch']
        plan = entry['plan']
        xlsx_class = entry['class']
        
        companies = BRANCH_TO_COMPANIES[branch]
        programs = CLASS_TO_PROGRAMS[xlsx_class]
        
        for company in companies:
            abbr = COMPANY_ABBR[company]
            for program in programs:
                for inst in ['1', '4', '6', '8']:
                    key = (company, program, plan, inst)
                    if key not in existing:
                        amount_field = INST_TO_AMOUNT[inst]
                        amount = entry[amount_field]
                        to_create.append({
                            'company': company,
                            'program': program,
                            'plan': plan,
                            'inst': inst,
                            'amount': amount,
                            'abbr': abbr,
                        })
    
    print('To create:', len(to_create))
    
    if not to_create:
        print('Nothing to create — all Fee Structures exist!')
        return
    
    # Confirm
    if '--yes' not in sys.argv:
        answer = input('Proceed? (y/n): ')
        if answer.lower() != 'y':
            print('Aborted.')
            return
    
    # Create
    created = 0
    failed = 0
    errors = []
    
    for i, item in enumerate(to_create):
        ok, result = create_fee_structure(
            item['company'], item['program'], item['plan'],
            item['inst'], item['amount'], item['abbr']
        )
        if ok:
            created += 1
            print(f"  [{i+1}/{len(to_create)}] CREATED: {result} | amt={item['amount']}")
        else:
            failed += 1
            errors.append(result)
            print(f"  [{i+1}/{len(to_create)}] FAILED: {item['company']}|{item['program']}|{item['plan']}|{item['inst']} -> {result}")
        
        # Small delay to avoid rate limiting
        if (i + 1) % 10 == 0:
            time.sleep(0.5)
    
    print(f'\n=== DONE ===')
    print(f'Created: {created}')
    print(f'Failed: {failed}')
    if errors:
        print('\nErrors:')
        for e in errors:
            print('  ' + e)

if __name__ == '__main__':
    main()
