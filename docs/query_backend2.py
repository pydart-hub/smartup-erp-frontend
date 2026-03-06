"""Query remaining backend data - customers, items, payment modes, etc."""
import requests, json

BASE = 'https://smartup.m.frappe.cloud'
H = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

# 3. Customers (use method approach for permission)
print('=== CUSTOMERS (sample) ===')
r3 = requests.get(BASE + '/api/resource/Customer', params={
    'fields': json.dumps(['name','customer_name','customer_group']),
    'limit_page_length': 10,
    'order_by': 'creation desc'
}, headers=H)
if 'data' in r3.json():
    for c in r3.json()['data']:
        print(json.dumps(c))
else:
    print('Error:', r3.status_code, r3.text[:200])

# 4. Items (Fee Component)
print('\n=== ITEMS (Fee Component group) ===')
r4 = requests.get(BASE + '/api/resource/Item', params={
    'fields': json.dumps(['name','item_name','item_group']),
    'filters': json.dumps([['item_group','=','Fee Component']]),
    'limit_page_length': 50,
}, headers=H)
if 'data' in r4.json():
    for i in r4.json()['data']:
        print(json.dumps(i))
else:
    print('Error:', r4.status_code, r4.text[:200])

# 5. Mode of Payment
print('\n=== MODES OF PAYMENT ===')
r5 = requests.get(BASE + '/api/resource/Mode of Payment', params={
    'fields': json.dumps(['name','type']),
    'limit_page_length': 20,
}, headers=H)
if 'data' in r5.json():
    for m in r5.json()['data']:
        print(json.dumps(m))
else:
    print('Error:', r5.status_code, r5.text[:200])

# 6. Email Accounts
print('\n=== EMAIL ACCOUNTS ===')
r6 = requests.get(BASE + '/api/resource/Email Account', params={
    'fields': json.dumps(['name','email_id','enable_outgoing','default_outgoing']),
    'limit_page_length': 10,
}, headers=H)
if 'data' in r6.json():
    for e in r6.json()['data']:
        print(json.dumps(e))
else:
    print('No email data or error')

# 7. Payment Terms Templates
print('\n=== PAYMENT TERMS TEMPLATES ===')
r7 = requests.get(BASE + '/api/resource/Payment Terms Template', params={
    'fields': json.dumps(['name']),
    'limit_page_length': 20,
}, headers=H)
if 'data' in r7.json():
    for t in r7.json()['data']:
        print(t['name'])
else:
    print('No payment terms templates')

# 8. Print Formats
print('\n=== PRINT FORMATS ===')
r8 = requests.get(BASE + '/api/resource/Print Format', params={
    'filters': json.dumps([['doc_type','in',['Sales Invoice','Fees','Sales Order']]]),
    'fields': json.dumps(['name','doc_type','disabled']),
    'limit_page_length': 20,
}, headers=H)
if 'data' in r8.json():
    for pf in r8.json()['data']:
        print(json.dumps(pf))
else:
    print('No print formats')

# 9. Program Enrollment sample
print('\n=== PROGRAM ENROLLMENT (recent 5) ===')
r9 = requests.get(BASE + '/api/resource/Program Enrollment', params={
    'fields': json.dumps(['name','student','student_name','program','academic_year','custom_fee_structure','custom_plan','custom_no_of_instalments','custom_batch_name','docstatus']),
    'limit_page_length': 5,
    'order_by': 'creation desc'
}, headers=H)
if 'data' in r9.json():
    for pe in r9.json()['data']:
        print(json.dumps(pe))
else:
    print('Error:', r9.text[:200])

# 10. Check Sales Order detail (with items)
print('\n=== SALES ORDER DETAIL (latest) ===')
r10 = requests.get(BASE + '/api/resource/Sales Order/SAL-ORD-2026-00044', headers=H)
if 'data' in r10.json():
    d = r10.json()['data']
    print('customer:', d.get('customer'))
    print('company:', d.get('company'))
    print('student:', d.get('student'))
    print('custom_plan:', d.get('custom_plan'))
    print('custom_no_of_instalments:', d.get('custom_no_of_instalments'))
    print('custom_academic_year:', d.get('custom_academic_year'))
    print('grand_total:', d.get('grand_total'))
    print('payment_schedule:')
    for ps in d.get('payment_schedule', []):
        print('  due_date:', ps.get('due_date'), 'invoice_portion:', ps.get('invoice_portion'), 'payment_amount:', ps.get('payment_amount'))
    print('items:')
    for item in d.get('items', []):
        print('  item_code:', item.get('item_code'), 'qty:', item.get('qty'), 'rate:', item.get('rate'), 'amount:', item.get('amount'))
else:
    print('Error:', r10.text[:200])

# 11. Check Sales Invoice detail (if any)
print('\n=== SALES INVOICES (recent 5) ===')
r11 = requests.get(BASE + '/api/resource/Sales Invoice', params={
    'fields': json.dumps(['name','customer','company','grand_total','outstanding_amount','status','student','custom_academic_year','custom_class']),
    'limit_page_length': 5,
    'order_by': 'creation desc'
}, headers=H)
if 'data' in r11.json():
    for si in r11.json()['data']:
        print(json.dumps(si))
else:
    print('Error:', r11.text[:200])

# 12. Check Fees (Education) records
print('\n=== FEES RECORDS (recent 5) ===')
r12 = requests.get(BASE + '/api/resource/Fees', params={
    'fields': json.dumps(['name','student','program','fee_structure','grand_total','outstanding_amount','docstatus']),
    'limit_page_length': 5,
    'order_by': 'creation desc'
}, headers=H)
if 'data' in r12.json():
    for f in r12.json()['data']:
        print(json.dumps(f))
else:
    print('No Fees records or error')

# 13. Customer Groups
print('\n=== CUSTOMER GROUPS ===')
r13 = requests.get(BASE + '/api/resource/Customer Group', params={
    'fields': json.dumps(['name']),
    'limit_page_length': 20,
}, headers=H)
if 'data' in r13.json():
    for cg in r13.json()['data']:
        print(cg['name'])
else:
    print('Error')
