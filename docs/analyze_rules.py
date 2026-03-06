import json

with open(r'C:\Users\arjun\Desktop\Pydart\smartup-erp-frontend\docs\fee_structure_parsed.json') as f:
    data = json.load(f)

print("=" * 90)
print("DEEP PRICING RULE ANALYSIS")
print("=" * 90)

# 1. Discount percentages — derive from data
print("\n## 1. DISCOUNT PATTERN ANALYSIS (Early Bird vs Annual)")
print("-" * 70)
for key, v in sorted(data.items()):
    ann = v['annual_fee']
    eb = v['early_bird']
    otp = v['otp']
    if ann and eb:
        eb_disc_pct = round((1 - eb/ann) * 100, 2)
        otp_disc_pct = round((1 - otp/ann) * 100, 2) if otp else None
        otp_vs_eb_pct = round((1 - otp/eb) * 100, 2) if otp and eb else None
        q_tot = v.get('quarterly_total', 0) or 0
        q_disc_pct = round((1 - q_tot/eb) * 100, 2) if q_tot and eb else None
        inst6 = v.get('inst6_total', 0) or 0
        inst6_disc_pct = round((1 - inst6/eb) * 100, 2) if inst6 and eb else None
        inst8 = v.get('inst8_total', 0) or 0
        inst8_disc_pct = round((1 - inst8/eb) * 100, 2) if inst8 and eb else None
        
        # Only print if something unusual
        if abs(otp_vs_eb_pct - 8.44) > 1 if otp_vs_eb_pct else False:
            print(f"  {key}: EB%={eb_disc_pct}%, OTP_vs_EB%={otp_vs_eb_pct}%, QDisc%={q_disc_pct}%, 6I%={inst6_disc_pct}%, 8I%={inst8_disc_pct}%")

# Aggregate discount patterns
print("\n## 2. DISCOUNT RULES SUMMARY")
print("-" * 70)

eb_discs = set()
otp_vs_eb_discs = set()
q_vs_eb_discs = set()
inst6_vs_eb_discs = set()
inst8_vs_eb_discs = set()

for key, v in data.items():
    ann = v['annual_fee']
    eb = v['early_bird']
    otp = v['otp']
    q_tot = v.get('quarterly_total', 0)
    inst6 = v.get('inst6_total', 0)
    inst8 = v.get('inst8_total', 0)
    
    if ann and eb:
        eb_discs.add(round((1 - eb/ann) * 100, 1))
    if otp and eb:
        otp_vs_eb_discs.add(round((1 - otp/eb) * 100, 1))
    if q_tot and eb:
        q_vs_eb_discs.add(round((1 - q_tot/eb) * 100, 1))
    if inst6 and eb:
        inst6_vs_eb_discs.add(round((1 - inst6/eb) * 100, 1))
    if inst8 and eb:
        inst8_vs_eb_discs.add(round((1 - inst8/eb) * 100, 1))

print(f"  Early Bird discount off Annual: {sorted(eb_discs)}")
print(f"  OTP discount off Early Bird:    {sorted(otp_vs_eb_discs)}")
print(f"  Quarterly discount off Early Bird: {sorted(q_vs_eb_discs)}")
print(f"  6-Inst discount off Early Bird: {sorted(inst6_vs_eb_discs)}")
print(f"  8-Inst discount off Early Bird: {sorted(inst8_vs_eb_discs)}")

# 3. Quarterly split pattern
print("\n## 3. QUARTERLY SPLIT PATTERN ANALYSIS")
print("-" * 70)
print("  Q-Total = Q1 + Q2 + Q3 + Q4")
print("  Pattern: Q1 > Q2 = Q3 > Q4 (front-loaded)")

q_patterns = {}
for key, v in data.items():
    q1, q2, q3, q4 = v.get('q1',0), v.get('q2',0), v.get('q3',0), v.get('q4',0)
    if q1 and q2 and q3 and q4:
        q_sum = q1+q2+q3+q4
        q_tot = v.get('quarterly_total', 0)
        pattern = f"Q2==Q3:{q2==q3}"
        q1_pct = round(q1/q_sum * 100, 1)
        q2_pct = round(q2/q_sum * 100, 1)
        q4_pct = round(q4/q_sum * 100, 1)
        
        pct_key = f"{q1_pct}%/{q2_pct}%/{q2_pct}%/{q4_pct}%"
        if pct_key not in q_patterns:
            q_patterns[pct_key] = []
        q_patterns[pct_key].append(key.split('|')[0][:15] + '/' + key.split('|')[1][:3] + '/' + key.split('|')[2])
        
        # Check: does Q-sum match Q-total?
        if q_sum != q_tot:
            print(f"  MISMATCH: {key}: sum={q_sum} vs total={q_tot}")

print("\n  Quarterly % patterns found:")
for pattern, examples in sorted(q_patterns.items(), key=lambda x: -len(x[1])):
    print(f"    {pattern} ({len(examples)} entries)")
    if len(examples) <= 5:
        for e in examples:
            print(f"      - {e}")

# 4. 6-Instalment analysis
print("\n## 4. SIX-INSTALMENT PLAN ANALYSIS")
print("-" * 70)
print("  6-inst total = Early Bird × 97.5%")
print("  Per-instalment (1-5) × 5 + Last (6th) = 6-inst total")

inst6_issues = []
for key, v in data.items():
    eb = v['early_bird']
    i6t = v.get('inst6_total', 0)
    i6p = v.get('inst6_per', 0)
    i6l = v.get('inst6_last', 0)
    
    if i6t and eb:
        expected = round(eb * 0.975)
        calc_sum = 5 * i6p + i6l
        
        if i6t != expected:
            inst6_issues.append(f"  TOTAL MISMATCH: {key}: 97.5%*{eb}={expected} but total={i6t} (diff={i6t-expected})")
        if calc_sum != i6t:
            inst6_issues.append(f"  SUM MISMATCH: {key}: 5*{i6p}+{i6l}={calc_sum} but total={i6t}")

if inst6_issues:
    print(f"\n  Issues found ({len(inst6_issues)}):")
    for i in inst6_issues:
        print(f"  {i}")
else:
    print("  All 6-inst entries match 97.5% rule and sum correctly")

# 5. 8-Instalment analysis  
print("\n## 5. EIGHT-INSTALMENT PLAN ANALYSIS")
print("-" * 70)
print("  8-inst total = Early Bird (no additional discount)")
print("  Per-instalment (1-7) × 7 + Last (8th) = 8-inst total")

inst8_issues = []
for key, v in data.items():
    eb = v['early_bird']
    i8t = v.get('inst8_total', 0)
    i8p = v.get('inst8_per', 0)
    i8l = v.get('inst8_last', 0)
    
    if i8t and eb:
        if i8t != eb:
            inst8_issues.append(f"  TOTAL vs EB: {key}: EB={eb} but 8I-total={i8t}")
        calc_sum = 7 * i8p + i8l
        if calc_sum != i8t:
            inst8_issues.append(f"  SUM MISMATCH: {key}: 7*{i8p}+{i8l}={calc_sum} but total={i8t}")

if inst8_issues:
    print(f"\n  Issues found ({len(inst8_issues)}):")
    for i in inst8_issues:
        print(f"  {i}")
else:
    print("  All 8-inst entries match Early Bird total and sum correctly")

# 6. OTP analysis
print("\n## 6. ONE-TIME PAYMENT (OTP) ANALYSIS")
print("-" * 70)

otp_disc_vs_eb = {}
for key, v in data.items():
    eb = v['early_bird']
    otp = v['otp']
    if eb and otp:
        disc_pct = round((1 - otp/eb) * 100, 2)
        if disc_pct not in otp_disc_vs_eb:
            otp_disc_vs_eb[disc_pct] = []
        otp_disc_vs_eb[disc_pct].append(key)

print("  OTP discount % off Early Bird:")
for pct, entries in sorted(otp_disc_vs_eb.items()):
    print(f"    {pct}% — {len(entries)} entries")
    if len(entries) <= 3:
        for e in entries:
            print(f"      {e}")

# 7. Pricing tiers - unique price levels
print("\n## 7. PRICING TIER ANALYSIS")
print("-" * 70)

# Check if branches share price points
branch_prices = {}
for key, v in data.items():
    branch = v['branch']
    plan = v['plan']
    cls = v['class']
    if branch not in branch_prices:
        branch_prices[branch] = {}
    
    price_key = f"{plan}|{cls}"
    branch_prices[branch][price_key] = v['annual_fee']

# Check which branches have identical pricing for the same plan+class
print("\n  Branches sharing IDENTICAL pricing for same plan+class:")
all_combos = set()
for b in branch_prices:
    all_combos.update(branch_prices[b].keys())

for combo in sorted(all_combos):
    prices = {}
    for branch in branch_prices:
        if combo in branch_prices[branch]:
            price = branch_prices[branch][combo]
            if price not in prices:
                prices[price] = []
            prices[price].append(branch[:20])
    
    if len(prices) > 1:
        print(f"\n  {combo}:")
        for price, branches in sorted(prices.items()):
            print(f"    ₹{price:,} — {branches}")

# 8. class availability matrix
print("\n## 8. CLASS AVAILABILITY PER BRANCH")
print("-" * 70)

branch_classes = {}
for key, v in data.items():
    branch = v['branch']
    cls = v['class']
    if branch not in branch_classes:
        branch_classes[branch] = set()
    branch_classes[branch].add(cls)

all_classes = sorted(set(c for s in branch_classes.values() for c in s))
print(f"\n  {'Branch':<50} {'Classes'}")
print(f"  {'-'*50} {'-'*40}")
for branch in ['Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)', 'Thoppumpady', 'Moolamkuzhi', 'Kadavanthra', 'Vennala', 'Edappally']:
    classes = sorted(branch_classes.get(branch, set()))
    print(f"  {branch:<50} {', '.join(classes)}")

print(f"\n  All unique classes: {all_classes}")

# 9. Edappally/Kadavanthra Intermediate anomaly from previous analysis
print("\n## 9. ANOMALY DEEP-DIVE")
print("-" * 70)

# Kadavanthra Intermediate - Q-total < OTP issue
for key, v in data.items():
    if 'Kadavanthra' in key and 'Intermediate' in key:
        eb = v['early_bird']
        otp = v['otp']
        qt = v['quarterly_total']
        print(f"  {key}:")
        print(f"    Annual={v['annual_fee']}, EB={eb}, OTP={otp}, Q-Total={qt}")
        print(f"    OTP_disc_vs_EB={round((1-otp/eb)*100,1)}%, Q_disc_vs_EB={round((1-qt/eb)*100,1)}%")
        print(f"    Q-Total {'<' if qt < otp else '>'} OTP: {qt} vs {otp}")

# Edappally Intermediate 8-inst total anomaly 
print()
for key, v in data.items():
    if 'Edappally' in key and 'Intermediate' in key:
        eb = v['early_bird']
        i8t = v.get('inst8_total', 0)
        print(f"  {key}:")
        print(f"    EB={eb}, 8I-Total={i8t}, Match={eb==i8t}")

# 10. Summary of what needs to be stored per fee structure record
print("\n## 10. DATA FIELDS REQUIRED PER FEE STRUCTURE")
print("-" * 70)
print("""
  Each fee structure record needs:
  
  DIMENSIONS (4):
    1. branch      — Company name in Frappe (6 branches, "Tier 1" = 4 companies)
    2. plan        — Basic | Intermediate | Advanced  
    3. class       — "8 State", "9 Cbse", "Plus One", etc.
    4. academic_year — e.g. "2025-2026"
  
  PRICING (14 fields):
    1.  annual_fee      — MRP / undiscounted annual rate
    2.  early_bird      — Early bird discounted rate (base for all payment plans)
    3.  otp             — One-time-payment full amount (biggest discount)
    4.  quarterly_total — Total if paying in 4 quarters (5% disc off EB)
    5.  q1              — Quarter 1 amount (largest)
    6.  q2              — Quarter 2 amount (= Q3)
    7.  q3              — Quarter 3 amount (= Q2)
    8.  q4              — Quarter 4 amount (smallest)
    9.  inst6_total     — 6-instalment total (97.5% of EB)
    10. inst6_per       — Per-instalment amount for inst 1-5
    11. inst6_last      — Last instalment amount (6th)
    12. inst8_total     — 8-instalment total (= EB, no discount)
    13. inst8_per       — Per-instalment amount for inst 1-7
    14. inst8_last      — Last instalment amount (8th)
    
  PAYMENT OPTIONS (6 distinct options a student can choose):
    a. OTP              — Pay the otp amount once
    b. Quarterly        — Pay q1, q2, q3, q4 across 4 due dates
    c. 6-Instalment     — Pay inst6_per × 5 + inst6_last
    d. 8-Instalment     — Pay inst8_per × 7 + inst8_last
    e. Annual Fee       — Pay annual_fee (no discount, theoretical MRP)
    f. Early Bird       — Pay early_bird as lump sum

  DISCOUNT RULES DERIVED FROM DATA:
    - Early Bird = ~9.4-10.6% off Annual (varies per branch/tier)
    - OTP = ~8.4% off Early Bird (consistent)
    - Quarterly Total = ~5% off Early Bird (=SUM(Q1:Q4))
    - 6-Inst Total = 2.5% off Early Bird (EB × 97.5%)
    - 8-Inst Total = 0% off Early Bird (= EB exactly)
    - Q1 > Q2 = Q3 > Q4 (front-loaded quarters, ~35%/25%/25%/15%)
    - Last instalment < regular instalment (both 6 and 8 plans)
""")
