"""Verify the generated fee_structure_parsed copy.json"""
import json

with open("docs/fee_structure_parsed copy.json", "r") as f:
    data = json.load(f)

print("=== VERIFICATION: Spot-checking entries against XLSX ===\n")

def check(key, field, expected):
    actual = data[key][field]
    status = "OK" if actual == expected else f"FAIL (got {actual})"
    return status

tests = [
    # Tier 1 Basic 8 State
    ("Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)|Basic|8 State", {
        "annual_fee": 17000, "early_bird": 15400, "otp": 14100,
        "quarterly_total": 14600, "q1": 5100, "q2": 3600, "q3": 3600, "q4": 2300,
        "inst6_total": 15000, "inst6_per": 2600, "inst6_last": 2000,
        "inst8_total": 15400, "inst8_per": 2000, "inst8_last": 1400,
    }),
    # Tier 1 Advanced Phy-Chem (NEW)
    ("Tier 1 (Chullikal, Fortkochi, Eraveli, Palluruthi)|Advanced|Phy-Chem", {
        "annual_fee": 25000, "early_bird": 22000, "otp": 20250,
        "quarterly_total": 21000, "q1": 7500, "q2": 5000, "q3": 5000, "q4": 3500,
        "inst6_total": 21500, "inst6_per": 4000, "inst6_last": 1500,
        "inst8_total": 22000, "inst8_per": 3000, "inst8_last": 1000,
    }),
    # Kadavanthra Advanced Plus One
    ("Kadavanthra|Advanced|Plus One", {
        "annual_fee": 81000, "otp": 66900, "quarterly_total": 69400,
        "inst6_total": 71100, "inst8_total": 73000,
    }),
    # Kadavanthra Basic Physics (subject-wise)
    ("Kadavanthra|Basic|Physics", {
        "annual_fee": 27100, "early_bird": 22000, "otp": 20250,
        "quarterly_total": 21000, "inst8_total": 22000,
    }),
    # Edappally Advanced Chem-Maths (subject-wise)
    ("Edappally|Advanced|Chem-Maths", {
        "annual_fee": 53100, "otp": 45000, "quarterly_total": 46500,
        "inst6_total": 47750,
    }),
    # Vennala Basic 10 Cbse Maths
    ("Vennala|Basic|10 Cbse Maths", {
        "annual_fee": 14500, "otp": 12000,
    }),
    # Moolamkuzhi Advanced 9 Cbse
    ("Moolamkuzhi|Advanced|9 Cbse", {
        "annual_fee": 41000, "otp": 33900, "inst6_total": 36100,
    }),
    # Thoppumpady Basic Phy-Chem (NEW)
    ("Thoppumpady|Basic|Phy-Chem", {
        "annual_fee": 17500, "early_bird": 15500, "otp": 14300,
        "quarterly_total": 14750,
    }),
    # Vennala Advanced 9 Cbse
    ("Vennala|Advanced|9 Cbse", {
        "annual_fee": 47750, "early_bird": 43000, "otp": 39400,
        "quarterly_total": 40900,
    }),
]

passed = 0
failed = 0
for key, expected_fields in tests:
    print(f"Testing: {key}")
    if key not in data:
        print(f"  MISSING KEY!")
        failed += 1
        continue
    entry = data[key]
    all_ok = True
    for field, expected_val in expected_fields.items():
        actual = entry.get(field, "MISSING")
        if actual != expected_val:
            print(f"  FAIL: {field} = {actual}, expected {expected_val}")
            all_ok = False
            failed += 1
    if all_ok:
        print(f"  PASS")
        passed += 1

# Check all entries have all 17 required fields with non-zero values
print(f"\n=== ZERO-VALUE CHECK ===")
zero_issues = []
for k, v in data.items():
    for f in ["annual_fee", "early_bird", "otp", "quarterly_total", "q1",
              "inst6_total", "inst6_per", "inst8_total", "inst8_per"]:
        if v.get(f, 0) == 0:
            zero_issues.append(f"{k} -> {f}")

if zero_issues:
    print(f"Found {len(zero_issues)} zero-value issues:")
    for issue in zero_issues:
        print(f"  {issue}")
else:
    print("No zero-value issues found!")

# Summary
print(f"\n=== SUMMARY ===")
print(f"Total entries: {len(data)}")
print(f"Spot checks: {passed} passed, {failed} failed")
print(f"Plans: {sorted(set(v['plan'] for v in data.values()))}")
print(f"Branches: {sorted(set(v['branch'] for v in data.values()))}")
print(f"Classes: {sorted(set(v['class'] for v in data.values()))}")

# Per-branch breakdown
for branch in sorted(set(v["branch"] for v in data.values())):
    entries = {k: v for k, v in data.items() if v["branch"] == branch}
    plans_in = sorted(set(v["plan"] for v in entries.values()))
    classes_in = sorted(set(v["class"] for v in entries.values()))
    print(f"\n  {branch}:")
    print(f"    Plans: {plans_in}")
    print(f"    Classes ({len(classes_in)}): {classes_in}")
