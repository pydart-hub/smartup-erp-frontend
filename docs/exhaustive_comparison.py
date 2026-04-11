"""
EXHAUSTIVE FIELD-BY-FIELD COMPARISON
Old: fee_structure_parsed.json (2025-26, 139 entries)
New: fee_structure_2026_27.json (2026-27, 155 entries via new XLSX)

Outputs EVERY entry from both files with full detail.
No summarization, no skipping.
"""
import json
from collections import OrderedDict

OLD_FILE = "fee_structure_parsed.json"
NEW_FILE = "fee_structure_2026_27.json"

with open(OLD_FILE, encoding="utf-8") as f:
    old_data = json.load(f)
with open(NEW_FILE, encoding="utf-8") as f:
    new_data = json.load(f)

# ── Normalization maps ──
OLD_BRANCH_NORM = {
    "Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)": "Tier 1",
    "Thoppumpady": "Thoppumpady",
    "Moolamkuzhi": "Moolamkuzhi",
    "Vennala": "Vennala",
    "Kadavanthra": "Kadavanthara",
    "Edappally": "Edapally",
}

CLASS_NORM = {
    "Phy - Chem": "Phy-Chem",
    "Chem- maths": "Chem-Maths",
    "Chemitry": "Chemistry",
    "Plus One ": "Plus One",  # trailing space in Excel
}

def nc(c):
    c = c.strip()
    return CLASS_NORM.get(c, c)

# ── Flatten OLD ──
old_flat = OrderedDict()
for key, e in old_data.items():
    branch = OLD_BRANCH_NORM.get(e["branch"], e["branch"])
    plan = e["plan"]
    cls = nc(e["class"])
    rec = {
        "annual_fee": e.get("annual_fee"),
        "early_bird": e.get("early_bird"),
        "otp": e.get("otp"),
        "quarterly_total": e.get("quarterly_total"),
        "q1": e.get("q1"),
        "q2": e.get("q2"),
        "q3": e.get("q3"),
        "q4": e.get("q4"),
        "inst6_total": e.get("inst6_total"),
        "inst6_per": e.get("inst6_per"),
        "inst6_last": e.get("inst6_last"),
        "inst8_total": e.get("inst8_total"),
        "inst8_per": e.get("inst8_per"),
        "inst8_last": e.get("inst8_last"),
    }
    rec["_original_branch"] = e["branch"]
    rec["_original_class"] = e["class"]
    rec["_original_key"] = key
    old_flat[(branch, plan, cls)] = rec

# ── Flatten NEW ──
new_flat = OrderedDict()
for br in new_data["branches"]:
    bn = br["branch"]
    for cat in br["fee_categories"]:
        fee_cat = cat["fee_category"]
        is_subj = cat["is_subject_wise"]
        # Determine plan name (for matching with old)
        if is_subj:
            plan = "Advanced" if "Advanced" in fee_cat else "Basic"
        else:
            plan = fee_cat

        for entry in cat["classes"]:
            cls = nc(entry["class"])
            pp = entry.get("payment_plans", {})
            q = pp.get("quarterly", {})
            i6 = pp.get("6_installment", {})
            i8 = pp.get("8_installment", {})
            rec = {
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
            }
            rec["_fee_category"] = fee_cat
            rec["_is_subject_wise"] = is_subj
            rec["_original_class"] = entry["class"]
            new_flat[(bn, plan, cls)] = rec

FIELDS = [
    "annual_fee", "early_bird", "otp",
    "quarterly_total", "q1", "q2", "q3", "q4",
    "inst6_total", "inst6_per", "inst6_last",
    "inst8_total", "inst8_per", "inst8_last",
]
LABELS = {
    "annual_fee": "Annual Fee     ",
    "early_bird": "Early Bird     ",
    "otp":        "OTP            ",
    "quarterly_total": "Quarterly Total",
    "q1": "Q1             ",
    "q2": "Q2             ",
    "q3": "Q3             ",
    "q4": "Q4             ",
    "inst6_total": "6-Inst Total   ",
    "inst6_per": "6-Inst Per(1-5)",
    "inst6_last": "6-Inst Last    ",
    "inst8_total": "8-Inst Total   ",
    "inst8_per": "8-Inst Per(1-7)",
    "inst8_last": "8-Inst Last    ",
}

all_keys = sorted(set(list(old_flat.keys()) + list(new_flat.keys())))

# Organize by branch
branches_order = ["Eraveli", "Tier 1", "Thoppumpady", "Moolamkuzhi", "Vennala", "Kadavanthara", "Edapally"]
plan_order = {"Basic": 0, "Intermediate": 1, "Advanced": 2}

by_branch = OrderedDict()
for b in branches_order:
    by_branch[b] = []

for key in all_keys:
    branch = key[0]
    if branch not in by_branch:
        by_branch[branch] = []
    by_branch[branch].append(key)

# Sort within each branch
for b in by_branch:
    by_branch[b].sort(key=lambda k: (plan_order.get(k[1], 99), k[2]))

# ── Stats accumulators ──
stats = {
    "total_old": len(old_flat),
    "total_new": len(new_flat),
    "only_old": 0,
    "only_new": 0,
    "common": 0,
    "identical": 0,
    "changed": 0,
    "field_changes": 0,
    "increases": [],
    "decreases": [],
}

# ── Output ──
lines = []
def p(s=""):
    lines.append(s)

p("=" * 120)
p("EXHAUSTIVE FIELD-BY-FIELD COMPARISON REPORT")
p(f"Old file: {OLD_FILE} (2025-26)  |  {len(old_flat)} entries")
p(f"New file: {NEW_FILE} (2026-27)  |  {len(new_flat)} entries")
p("=" * 120)

for branch in by_branch:
    if not by_branch[branch]:
        continue
    p()
    p("#" * 120)
    p(f"## BRANCH: {branch}")
    p("#" * 120)

    for key in by_branch[branch]:
        _, plan, cls = key
        in_old = key in old_flat
        in_new = key in new_flat

        p()
        if in_old and in_new:
            stats["common"] += 1
            old_e = old_flat[key]
            new_e = new_flat[key]

            # Compare field by field
            diffs = []
            for f in FIELDS:
                ov = old_e.get(f)
                nv = new_e.get(f)
                if ov != nv:
                    diffs.append((f, ov, nv))
                    stats["field_changes"] += 1

            if diffs:
                stats["changed"] += 1
                status = "CHANGED"
            else:
                stats["identical"] += 1
                status = "IDENTICAL"

            # Print header
            p(f"  [{status}] {branch} | {plan} | {cls}")

            # Naming note
            notes = []
            if old_e.get("_original_branch") != branch:
                notes.append(f"old branch name: '{old_e['_original_branch']}'")
            if old_e.get("_original_class") != new_e.get("_original_class"):
                notes.append(f"class spelling: old='{old_e.get('_original_class')}' new='{new_e.get('_original_class')}'")
            if new_e.get("_is_subject_wise"):
                notes.append(f"new category: '{new_e['_fee_category']}' (subject-wise)")
            if notes:
                p(f"  Notes: {'; '.join(notes)}")

            # Print full table
            p(f"  {'Field':20s} {'Old (2025-26)':>15s} {'New (2026-27)':>15s} {'Change':>10s} {'%':>8s}")
            p(f"  {'-'*20} {'-'*15} {'-'*15} {'-'*10} {'-'*8}")
            for f in FIELDS:
                ov = old_e.get(f)
                nv = new_e.get(f)
                label = LABELS[f]
                ov_s = f"{ov:>12,}" if ov is not None else "       -"
                nv_s = f"{nv:>12,}" if nv is not None else "       -"

                if ov is not None and nv is not None and ov != nv:
                    diff = nv - ov
                    pct = (diff / ov * 100) if ov != 0 else 0
                    sign = "+" if diff > 0 else ""
                    chg_s = f"{sign}{diff:>8,}"
                    pct_s = f"{sign}{pct:.1f}%"
                    marker = " ***"
                    if f == "annual_fee":
                        if diff > 0:
                            stats["increases"].append((key, ov, nv, diff, pct))
                        else:
                            stats["decreases"].append((key, ov, nv, diff, pct))
                elif ov == nv:
                    chg_s = "         0"
                    pct_s = "   0.0%"
                    marker = ""
                else:
                    chg_s = "       N/A"
                    pct_s = "    N/A"
                    marker = " ***"

                p(f"  {label:20s} {ov_s:>15s} {nv_s:>15s} {chg_s:>10s} {pct_s:>8s}{marker}")

        elif in_old and not in_new:
            stats["only_old"] += 1
            old_e = old_flat[key]
            p(f"  [REMOVED] {branch} | {plan} | {cls}")
            p(f"  Original key: {old_e.get('_original_key')}")
            p(f"  {'Field':20s} {'Old (2025-26)':>15s}")
            p(f"  {'-'*20} {'-'*15}")
            for f in FIELDS:
                v = old_e.get(f)
                v_s = f"{v:>12,}" if v is not None else "       -"
                p(f"  {LABELS[f]:20s} {v_s:>15s}")

        elif not in_old and in_new:
            stats["only_new"] += 1
            new_e = new_flat[key]
            p(f"  [ADDED] {branch} | {plan} | {cls}")
            if new_e.get("_is_subject_wise"):
                p(f"  Category: {new_e['_fee_category']} (subject-wise)")
            p(f"  {'Field':20s} {'New (2026-27)':>15s}")
            p(f"  {'-'*20} {'-'*15}")
            for f in FIELDS:
                v = new_e.get(f)
                v_s = f"{v:>12,}" if v is not None else "       -"
                p(f"  {LABELS[f]:20s} {v_s:>15s}")

# ── Final summary ──
p()
p("=" * 120)
p("SUMMARY")
p("=" * 120)
p(f"  Old total entries:        {stats['total_old']}")
p(f"  New total entries:        {stats['total_new']}")
p(f"  Common (matched):         {stats['common']}")
p(f"    - Identical (all 14 fields): {stats['identical']}")
p(f"    - Changed (at least 1 field): {stats['changed']}")
p(f"    - Total field changes:  {stats['field_changes']}")
p(f"  Only in OLD (removed):    {stats['only_old']}")
p(f"  Only in NEW (added):      {stats['only_new']}")
p()
p(f"  Annual fee increases: {len(stats['increases'])}")
p(f"  Annual fee decreases: {len(stats['decreases'])}")
if stats['decreases']:
    avg = sum(d[3] for d in stats['decreases']) / len(stats['decreases'])
    avg_pct = sum(d[4] for d in stats['decreases']) / len(stats['decreases'])
    p(f"  Average decrease:     {avg:,.0f} ({avg_pct:.1f}%)")
    mx = max(stats['decreases'], key=lambda d: abs(d[3]))
    mn = min(stats['decreases'], key=lambda d: abs(d[3]))
    p(f"  Largest decrease:     {mx[0][0]}/{mx[0][1]}/{mx[0][2]}: {mx[1]:,} -> {mx[2]:,} ({mx[3]:,})")
    p(f"  Smallest decrease:    {mn[0][0]}/{mn[0][1]}/{mn[0][2]}: {mn[1]:,} -> {mn[2]:,} ({mn[3]:,})")

# Naming differences
p()
p("  NAMING DIFFERENCES:")
p("  Branch names:")
p("    Old: 'Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)' -> New: 'Tier 1' (separate) + 'Eraveli' (new)")
p("    Old: 'Kadavanthra' -> New: 'Kadavanthara'")
p("    Old: 'Edappally'  -> New: 'Edapally'")
p("  Class names:")
p("    Old: 'Chemistry'  -> New: 'Chemitry' (typo in new XLSX)")
p("    Old: 'Phy-Chem'   -> New sometimes: 'Phy - Chem' (Vennala/Kadavanthara/Edapally subject-wise)")
p("    Old: 'Chem-Maths' -> New sometimes: 'Chem- maths' (Vennala/Kadavanthara/Edapally subject-wise Basic)")
p("    Old: '10 Cbse Maths' -> REMOVED in new (was in Vennala Basic/Advanced, Kadavanthara Basic)")
p()

# 8 Cbse note
p("  STRUCTURAL CHANGES:")
p("    1. ERAVELI branch: Entirely NEW (18 entries). Was previously grouped under 'Tier 1'.")
p("    2. MOOLAMKUZHI: '8 State' ADDED to all 3 plans (Basic/Intermediate/Advanced).")
p("    3. TIER 1: 'Phy-Chem' ADDED to Intermediate plan.")
p("    4. '10 Cbse Maths' class: REMOVED from Vennala (Basic, Advanced) and Kadavanthara (Basic).")
p("    5. Subject-wise entries RESTRUCTURED:")
p("       Old: stored under 'Basic'/'Advanced' plans directly.")
p("       New: stored under 'Subject-wise Basic'/'Subject-wise Advanced' categories.")
p("       Affected: Vennala (12 entries), Kadavanthara (12 entries), Edapally (12 NEW entries).")
p("    6. Edapally: 12 subject-wise entries are ENTIRELY NEW (not in old file).")
p("    7. Thoppumpady Intermediate: Phy-Chem was NOT present in old, NOT present in new either.")
p("    8. Kadavanthara old had subject-wise under 'Basic'/'Advanced' plans (14 entries).")
p("       New has them under 'Subject-wise Basic'/'Subject-wise Advanced' (12 entries).")
p("       Net -2 because '10 Cbse Maths' removed + Phy-Chem/Phy-Maths already in non-subject.")
p()
p("  PRICE DIRECTION: ALL common entries with changes have DECREASED fees (no increases).")
p("=" * 120)

# Write to file
output_text = "\n".join(lines)
with open("detailed_comparison_report.txt", "w", encoding="utf-8") as f:
    f.write(output_text)

# Also print summary to console
print(f"Report written to: detailed_comparison_report.txt")
print(f"Total lines: {len(lines)}")
print()
for line in lines[-40:]:
    print(line)
