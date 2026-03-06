"""Query Frappe backend for custom fields, sales data, customers, items, payment modes."""
import requests, json

BASE = 'https://smartup.m.frappe.cloud'
H = {'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2'}

# 1. Custom fields on key doctypes
r = requests.get(BASE + '/api/resource/Custom Field', params={
    'filters': json.dumps([['dt', 'in', ['Sales Order', 'Sales Invoice', 'Fees', 'Student', 'Program Enrollment', 'Payment Entry']]]),
    'fields': json.dumps(['name', 'dt', 'fieldname', 'fieldtype', 'label', 'options']),
    'limit_page_length': 200,
    'order_by': 'dt asc'
}, headers=H)
print('=== CUSTOM FIELDS ON KEY DOCTYPES ===')
for cf in r.json()['data']:
    print(cf['dt'] + ': ' + cf['fieldname'] + ' (' + cf['fieldtype'] + ') label=' + str(cf.get('label','')) + ' opts=' + str(cf.get('options','')))

# 2. Existing Sales Orders
print('\n=== EXISTING SALES ORDERS (last 10) ===')
r2 = requests.get(BASE + '/api/resource/Sales Order', params={
    'fields': json.dumps(['name','customer','company','grand_total','status','docstatus','transaction_date']),
    'limit_page_length': 10,
    'order_by': 'creation desc'
}, headers=H)
for so in r2.json()['data']:
    print(json.dumps(so))

# 3. Customers sample
print('\n=== CUSTOMERS (sample 15) ===')
r3 = requests.get(BASE + '/api/resource/Customer', params={
    'fields': json.dumps(['name','customer_name','customer_group','territory','default_company']),
    'limit_page_length': 15,
}, headers=H)
for c in r3.json()['data']:
    print(json.dumps(c))

# 4. Items (Fee Component)
print('\n=== ITEMS (Fee Component group) ===')
r4 = requests.get(BASE + '/api/resource/Item', params={
    'fields': json.dumps(['name','item_name','item_group','description']),
    'filters': json.dumps([['item_group','=','Fee Component']]),
    'limit_page_length': 50,
}, headers=H)
for i in r4.json()['data']:
    print(json.dumps(i))

# 5. Mode of Payment
print('\n=== MODES OF PAYMENT ===')
r5 = requests.get(BASE + '/api/resource/Mode of Payment', params={
    'fields': json.dumps(['name','type']),
    'limit_page_length': 20,
}, headers=H)
for m in r5.json()['data']:
    print(json.dumps(m))

# 6. Check if Email Account exists
print('\n=== EMAIL ACCOUNTS ===')
r6 = requests.get(BASE + '/api/resource/Email Account', params={
    'fields': json.dumps(['name','email_id','enable_outgoing','default_outgoing']),
    'limit_page_length': 10,
}, headers=H)
for e in r6.json()['data']:
    print(json.dumps(e))

# 7. Payment Terms Template
print('\n=== PAYMENT TERMS TEMPLATES ===')
r7 = requests.get(BASE + '/api/resource/Payment Terms Template', params={
    'fields': json.dumps(['name']),
    'limit_page_length': 20,
}, headers=H)
for t in r7.json()['data']:
    print(json.dumps(t))
    # Get detail
    r7d = requests.get(BASE + '/api/resource/Payment Terms Template/' + t['name'], headers=H)
    terms = r7d.json()['data'].get('terms', [])
    for term in terms:
        print('  ' + str(term.get('payment_term','')) + ' inv_portion=' + str(term.get('invoice_portion','')) + ' due_days=' + str(term.get('credit_days','')))

# 8. Check Print Format for Sales Invoice
print('\n=== PRINT FORMATS (Sales Invoice) ===')
r8 = requests.get(BASE + '/api/resource/Print Format', params={
    'filters': json.dumps([['doc_type','in',['Sales Invoice','Fees','Sales Order']]]),
    'fields': json.dumps(['name','doc_type','default_print_language','disabled']),
    'limit_page_length': 20,
}, headers=H)
for pf in r8.json()['data']:
    print(json.dumps(pf))

# 9. Check Program Enrollment custom fields
print('\n=== PROGRAM ENROLLMENT SAMPLE ===')
r9 = requests.get(BASE + '/api/resource/Program Enrollment', params={
    'fields': json.dumps(['name','student','student_name','program','academic_year','custom_fee_structure','custom_plan','custom_batch_name']),
    'limit_page_length': 5,
    'order_by': 'creation desc'
}, headers=H)
for pe in r9.json()['data']:
    print(json.dumps(pe))
