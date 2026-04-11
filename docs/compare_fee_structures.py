"""
Deep comparison: Existing fee_structure_parsed.json (2025-26) vs new fee_structure_2026_27.json

Reports:
1. Structural changes (branches, categories, classes added/removed)
2. Price changes for every matching entry
3. Entries in old but not new
4. Entries in new but not old
"""
import json
from collections import defaultdict

OLD_FILE = r"fee_structure_parsed.json"
NEW_FILE = r"fee_structure_2026_27.json"

with open(OLD_FILE, encoding="utf-8") as f:
    old_data = json.load(f)

with open(NEW_FILE, encoding="utf-8") as f:
    new_data = json.load(f)

# ═══════════════════════════════════════════════════════════
# STEP 1: Normalize OLD data into flat records
# Key: (branch_normalized, plan, class)
# ═══════════════════════════════════════════════════════════

# Branch name mapping: old -> normalized
OLD_BRANCH_MAP = {
    "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)": "Tier 1",
    "Thoppumpady": "Thoppumpady",
    "Moolamkuzhi": "Moolamkuzhi",
    "Vennala": "Vennala",
    "Kadavanthra": "Kadavanthara",  # spelling difference
    "Edappally": "Edapally",        # spelling difference
}

# Class name normalization
def norm_class(c):
    c = c.strip()
    # Normalize subject-wise class names for comparison
    mapping = {
        "Phy-Chem": "Phy-Chem",
        "Phy - Chem": "Phy-Chem",
        "Phy-Maths": "Phy-Maths",
        "Chem-Maths": "Chem-Maths",
        "Chem- maths": "Chem-Maths",
        "Chemitry": "Chemistry",
        "Chemistry": "Chemistry",
        "Physics": "Physics",
        "Maths": "Maths",
        "10 Cbse Maths": "10 Cbse Maths",
    }
    return mapping.get(c, c)

old_flat = {}
for key, entry in old_data.items():
    branch_raw = entry["branch"]
    branch = OLD_BRANCH_MAP.get(branch_raw, branch_raw)
    plan = entry["plan"]
    cls = norm_class(entry["class"])
    
    old_flat[(branch, plan, cls)] = {
        "annual_fee": entry["annual_fee"],
        "early_bird": entry["early_bird"],
        "otp": entry["otp"],
        "quarterly_total": entry["quarterly_total"],
        "q1": entry["q1"],
        "q2": entry["q2"],
        "q3": entry["q3"],
        "q4": entry["q4"],
        "inst6_total": entry["inst6_total"],
        "inst6_per": entry["inst6_per"],
        "inst6_last": entry["inst6_last"],
        "inst8_total": entry["inst8_total"],
        "inst8_per": entry["inst8_per"],
        "inst8_last": entry["inst8_last"],
        "_raw_branch": branch_raw,
        "_raw_class": entry["class"],
    }

# ═══════════════════════════════════════════════════════════
# STEP 2: Normalize NEW data into flat records
# ═══════════════════════════════════════════════════════════

# Map new fee_category to plan name
def cat_to_plan(fee_category, is_subject_wise):
    if is_subject_wise:
        if "Advanced" in fee_category:
            return "Advanced"
        return "Basic"
    return fee_category  # "Basic", "Intermediate", "Advanced"

new_flat = {}
for branch in new_data["branches"]:
    branch_name = branch["branch"]
    for cat in branch["fee_categories"]:
        plan = cat_to_plan(cat["fee_category"], cat["is_subject_wise"])
        is_subj = cat["is_subject_wise"]
        
        for entry in cat["classes"]:
            cls = norm_class(entry["class"])
            pp = entry.get("payment_plans", {})
            q = pp.get("quarterly", {})
            i6 = pp.get("6_installment", {})
            i8 = pp.get("8_installment", {})
            
            new_flat[(branch_name, plan, cls)] = {
                "annual_fee": entry.get("annual_fees"),
                "early_bird": pp.get("early_bird"),
                "otp": pp.get("one_time_payment"),
                "quarterly_total": q.get("total_after_5pct_discount"),
                "q1": q.get("quarter_1"),
                "q2": q.get("quarter_2"),
                "q3": q.get("quarter_3"),
                "q4": q.get("quarter_4"),
                "inst6_total": i6.get("total_after_2_5pct_discount"),
                "inst6_per": i6.get("installment_1_to_5"),
                "inst6_last": i6.get("installment_6_final"),
                "inst8_total": i8.get("total"),
                "inst8_per": i8.get("installment_1_to_7"),
                "inst8_last": i8.get("installment_8_final"),
                "_fee_category": cat["fee_category"],
                "_is_subject_wise": is_subj,
                "_raw_class": entry["class"],
            }

# ═══════════════════════════════════════════════════════════
# STEP 3: Compare
# ═══════════════════════════════════════════════════════════

FIELDS = [
    "annual_fee", "early_bird", "otp", 
    "quarterly_total", "q1", "q2", "q3", "q4",
    "inst6_total", "inst6_per", "inst6_last",
    "inst8_total", "inst8_per", "inst8_last"
]

FIELD_LABELS = {
    "annual_fee": "Annual Fee",
    "early_bird": "Early Bird",
    "otp": "OTP",
    "quarterly_total": "Quarterly Total",
    "q1": "Q1",
    "q2": "Q2",
    "q3": "Q3",
    "q4": "Q4",
    "inst6_total": "6-Inst Total",
    "inst6_per": "6-Inst Per(1-5)",
    "inst6_last": "6-Inst Last",
    "inst8_total": "8-Inst Total",
    "inst8_per": "8-Inst Per(1-7)",
    "inst8_last": "8-Inst Last",
}

print("=" * 100)
print("DEEP COMPARISON: Existing (2025-26) vs New (2026-27) Fee Structure")
print("=" * 100)
print(f"\nOld entries: {len(old_flat)}")
print(f"New entries: {len(new_flat)}")

# ─── A: Structural overview ───
print("\n" + "─" * 80)
print("A. STRUCTURAL OVERVIEW")
print("─" * 80)

old_branches = sorted(set(k[0] for k in old_flat))
new_branches = sorted(set(k[0] for k in new_flat))
print(f"\nOld branches ({len(old_branches)}): {old_branches}")
print(f"New branches ({len(new_branches)}): {new_branches}")

added_branches = set(new_branches) - set(old_branches)
removed_branches = set(old_branches) - set(new_branches)
if added_branches:
    print(f"\n  ➕ NEW BRANCHES: {added_branches}")
if removed_branches:
    print(f"\n  ➖ REMOVED BRANCHES: {removed_branches}")

# ─── B: Entries only in OLD (removed) ───
old_only = set(old_flat.keys()) - set(new_flat.keys())
new_only = set(new_flat.keys()) - set(old_flat.keys())
common = set(old_flat.keys()) & set(new_flat.keys())

print(f"\n\nCommon entries: {len(common)}")
print(f"Only in OLD (removed): {len(old_only)}")
print(f"Only in NEW (added): {len(new_only)}")

print("\n" + "─" * 80)
print("B. ENTRIES ONLY IN OLD (REMOVED from 2026-27)")
print("─" * 80)
if old_only:
    for key in sorted(old_only):
        branch, plan, cls = key
        old_e = old_flat[key]
        print(f"  ✗ {branch} / {plan} / {cls}  (annual: ₹{old_e['annual_fee']})")
else:
    print("  None - all old entries exist in new")

print("\n" + "─" * 80)
print("C. ENTRIES ONLY IN NEW (ADDED in 2026-27)")
print("─" * 80)
if new_only:
    for key in sorted(new_only):
        branch, plan, cls = key
        new_e = new_flat[key]
        print(f"  ✚ {branch} / {plan} / {cls}  (annual: ₹{new_e['annual_fee']}) [cat: {new_e['_fee_category']}]")
else:
    print("  None - no new entries added")

# ─── D: Price changes for common entries ───
print("\n" + "─" * 80)
print("D. PRICE CHANGES (Common entries)")
print("─" * 80)

changed_entries = 0
unchanged_entries = 0
total_field_changes = 0

all_changes = []  # For summary

for key in sorted(common):
    branch, plan, cls = key
    old_e = old_flat[key]
    new_e = new_flat[key]
    
    diffs = []
    for field in FIELDS:
        old_val = old_e.get(field)
        new_val = new_e.get(field)
        if old_val != new_val:
            if old_val is not None and new_val is not None:
                change = new_val - old_val
                pct = (change / old_val * 100) if old_val != 0 else 0
                diffs.append((field, old_val, new_val, change, pct))
            else:
                diffs.append((field, old_val, new_val, None, None))
    
    if diffs:
        changed_entries += 1
        total_field_changes += len(diffs)
        print(f"\n  📊 {branch} / {plan} / {cls}")
        for field, old_val, new_val, change, pct in diffs:
            label = FIELD_LABELS.get(field, field)
            if change is not None:
                sign = "+" if change > 0 else ""
                print(f"     {label:20s}: ₹{old_val:>7,} → ₹{new_val:>7,}  ({sign}{change:,} = {sign}{pct:.1f}%)")
            else:
                print(f"     {label:20s}: {old_val} → {new_val}")
        
        # Track annual fee change for summary
        ann_old = old_e.get("annual_fee")
        ann_new = new_e.get("annual_fee")
        if ann_old and ann_new:
            all_changes.append({
                "branch": branch, "plan": plan, "class": cls,
                "old_annual": ann_old, "new_annual": ann_new,
                "change": ann_new - ann_old,
                "pct": (ann_new - ann_old) / ann_old * 100,
            })
    else:
        unchanged_entries += 1

# ─── E: Summary statistics ───
print("\n\n" + "─" * 80)
print("E. SUMMARY STATISTICS")
print("─" * 80)
print(f"\n  Total common entries:       {len(common)}")
print(f"  Entries with price changes: {changed_entries}")
print(f"  Entries unchanged:          {unchanged_entries}")
print(f"  Total field-level changes:  {total_field_changes}")

if all_changes:
    increases = [c for c in all_changes if c["change"] > 0]
    decreases = [c for c in all_changes if c["change"] < 0]
    same = [c for c in all_changes if c["change"] == 0]
    
    print(f"\n  Annual fee increases: {len(increases)}")
    print(f"  Annual fee decreases: {len(decreases)}")
    print(f"  Annual fee same:      {len(same)}")
    
    if increases:
        avg_inc = sum(c["change"] for c in increases) / len(increases)
        avg_pct = sum(c["pct"] for c in increases) / len(increases)
        max_inc = max(increases, key=lambda c: c["change"])
        min_inc = min(increases, key=lambda c: c["change"])
        print(f"\n  Average increase: ₹{avg_inc:,.0f} ({avg_pct:.1f}%)")
        print(f"  Largest increase: ₹{max_inc['change']:,} ({max_inc['pct']:.1f}%) - {max_inc['branch']}/{max_inc['plan']}/{max_inc['class']}")
        print(f"  Smallest increase: ₹{min_inc['change']:,} ({min_inc['pct']:.1f}%) - {min_inc['branch']}/{min_inc['plan']}/{min_inc['class']}")
    
    if decreases:
        for c in decreases:
            print(f"  ⚠ DECREASE: {c['branch']}/{c['plan']}/{c['class']}: ₹{c['old_annual']:,} → ₹{c['new_annual']:,} ({c['change']:,})")

# ─── F: Branch-wise breakdown ───
print("\n" + "─" * 80)
print("F. ENTRIES PER BRANCH COMPARISON")
print("─" * 80)

old_by_branch = defaultdict(list)
for (b, p, c) in old_flat:
    old_by_branch[b].append((p, c))

new_by_branch = defaultdict(list)
for (b, p, c) in new_flat:
    new_by_branch[b].append((p, c))

all_branches = sorted(set(list(old_by_branch.keys()) + list(new_by_branch.keys())))
for b in all_branches:
    old_count = len(old_by_branch.get(b, []))
    new_count = len(new_by_branch.get(b, []))
    diff = new_count - old_count
    sign = "+" if diff > 0 else ""
    print(f"  {b:25s}: old={old_count:3d}, new={new_count:3d}  ({sign}{diff})")
    
    # Detail: what classes exist in each
    old_classes = set((p, c) for p, c in old_by_branch.get(b, []))
    new_classes = set((p, c) for p, c in new_by_branch.get(b, []))
    added = new_classes - old_classes
    removed = old_classes - new_classes
    if added:
        for p, c in sorted(added):
            print(f"    ✚ {p}/{c}")
    if removed:
        for p, c in sorted(removed):
            print(f"    ✗ {p}/{c}")

# ─── G: Class name differences ───
print("\n" + "─" * 80)
print("G. CLASS NAME / NAMING DIFFERENCES")
print("─" * 80)
old_raw_classes = sorted(set(v["_raw_class"] for v in old_flat.values()))
new_raw_classes = sorted(set(v["_raw_class"] for v in new_flat.values()))
print(f"\n  Old class names: {old_raw_classes}")
print(f"  New class names: {new_raw_classes}")

# Check naming convention differences
print("\n  Naming differences to note:")
print("  - Old: 'Kadavanthra' → New: 'Kadavanthara'")
print("  - Old: 'Edappally'  → New: 'Edapally'")
print("  - Old: 'Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)' → New has separate 'Tier 1' and 'Eraveli'")
print("  - Old: 'Chemistry' → New: 'Chemitry' (typo in Excel)")
print("  - Old: 'Phy-Chem' → New sometimes: 'Phy - Chem' (spacing)")
print("  - Old: 'Chem-Maths' → New sometimes: 'Chem- maths' (casing/spacing)")

print("\n" + "=" * 100)
print("COMPARISON COMPLETE")
print("=" * 100)
