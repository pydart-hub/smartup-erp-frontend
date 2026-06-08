import json,re

target=json.load(open('docs/fee_structure_2026_27.json'))
current=json.load(open('docs/fee_structure_parsed copy.json'))

def canon(s):
    return re.sub(r'[^a-z0-9]','', s.lower()).replace('edapally','edappally').replace('kadavanthara','kadavanthra')

t={}
for b in target['branches']:
    bb=canon(b['branch'])
    for c in b['fee_categories']:
        if c['fee_category'] not in ('Basic','Intermediate'):
            continue
        for cls in c['classes']:
            key=bb+'|'+c['fee_category']+'|'+cls['class']
            t[key]={'annual':cls['annual_fees'],'otp':cls['payment_plans']['one_time_payment'],'q':cls['payment_plans']['quarterly']['total_after_5pct_discount'],'inst6':cls['payment_plans']['6_installment']['total_after_2_5pct_discount'],'inst8':cls['payment_plans']['8_installment']['total']}

cur={}
for k,v in current.items():
    if v['plan'] in ('Basic','Intermediate'):
        cur[canon(v['branch'])+'|'+v['plan']+'|'+v['class']]=v

for prefix in ['kadavanthra|basic','kadavanthra|intermediate','edappally|basic','edappally|intermediate']:
    diffs=[]
    for k,v in t.items():
        if k.startswith(prefix+'|'):
            c=cur.get(k)
            if not c:
                diffs.append(('MISSING',k,v))
            elif (c['annual_fee'],c['otp'],c['quarterly_total'],c['inst6_total'],c['inst8_total'])!=(v['annual'],v['otp'],v['q'],v['inst6'],v['inst8']):
                diffs.append(('DIFF',k,{'current':(c['annual_fee'],c['otp'],c['quarterly_total'],c['inst6_total'],c['inst8_total']),'target':(v['annual'],v['otp'],v['q'],v['inst6'],v['inst8'])}))
    print('\n==',prefix.upper(),'==')
    print('COUNT',len(diffs))
    for item in diffs[:10]:
        print(item)
