"""Query SmartUp backend to find where expenses are recorded across ALL companies."""
import requests, json

BASE = "https://smartup.m.frappe.cloud"
AUTH = ("03330270e330d49", "9c2261ae11ac2d2")
S = requests.Session()
S.headers.update({"Authorization": f"token {AUTH[0]}:{AUTH[1]}"})

def get(path, params=None):
    r = S.get(f"{BASE}{path}", params=params)
    r.raise_for_status()
    return r.json()

def jdump(data):
    print(json.dumps(data, indent=2, default=str))

COMPANIES = [
    "Smart Up", "Smart Up Kadavanthara", "Smart Up Chullickal",
    "Smart Up Edappally", "Smart Up Fortkochi", "Smart Up Vennala",
    "Smart Up Moolamkuzhi", "Smart Up Palluruthy", "Smart Up Thopumpadi",
    "Smart Up Eraveli"
]

# ── QUERY 1: GL entry count per company ──
print("=" * 60)
print("QUERY 1: GL ENTRY COUNT PER COMPANY")
print("=" * 60)
gl_counts = {}
for co in COMPANIES:
    filters = json.dumps([["company", "=", co], ["is_cancelled", "=", 0]])
    r = get("/api/method/frappe.client.get_count", {"doctype": "GL Entry", "filters": filters})
    cnt = r.get("message", 0)
    gl_counts[co] = cnt
    print(f"  {co}: {cnt}")

# ── QUERY 2: GL entries hitting debit > 0 across all companies ──
print("\n" + "=" * 60)
print("QUERY 2: GL ENTRIES WITH DEBIT > 0 (top 100 by debit desc)")
print("=" * 60)
r = get("/api/resource/GL Entry", {
    "filters": json.dumps([["is_cancelled", "=", 0], ["debit", ">", 0]]),
    "fields": json.dumps(["name", "company", "account", "debit", "posting_date", "voucher_type", "voucher_no", "remarks"]),
    "limit_page_length": 100,
    "order_by": "debit desc"
})
jdump(r.get("data", []))

# ── QUERY 3: Parent company "Smart Up" GL entries ──
print("\n" + "=" * 60)
print("QUERY 3: PARENT COMPANY 'Smart Up' GL ENTRIES (last 200)")
print("=" * 60)
r = get("/api/resource/GL Entry", {
    "filters": json.dumps([["company", "=", "Smart Up"], ["is_cancelled", "=", 0]]),
    "fields": json.dumps(["name", "posting_date", "account", "debit", "credit", "against", "voucher_type", "voucher_no"]),
    "limit_page_length": 200,
    "order_by": "posting_date desc"
})
jdump(r.get("data", []))

# ── QUERY 4: JV count per company ──
print("\n" + "=" * 60)
print("QUERY 4: JOURNAL ENTRY COUNT PER COMPANY")
print("=" * 60)
jv_counts = {}
for co in COMPANIES:
    filters = json.dumps([["company", "=", co], ["docstatus", "=", 1]])
    r = get("/api/method/frappe.client.get_count", {"doctype": "Journal Entry", "filters": filters})
    cnt = r.get("message", 0)
    jv_counts[co] = cnt
    print(f"  {co}: {cnt}")

# ── QUERY 5: Sample JVs from busiest company ──
print("\n" + "=" * 60)
busy = max(jv_counts, key=jv_counts.get)
print(f"QUERY 5: SAMPLE 20 JVs FROM BUSIEST COMPANY: {busy} ({jv_counts[busy]} JVs)")
print("=" * 60)
r = get("/api/resource/Journal Entry", {
    "filters": json.dumps([["company", "=", busy], ["docstatus", "=", 1]]),
    "fields": json.dumps(["name", "posting_date", "voucher_type", "total_debit", "remark", "user_remark"]),
    "limit_page_length": 20,
    "order_by": "posting_date desc"
})
jdump(r.get("data", []))

# ── QUERY 6: Payment Entry "Pay" type ──
print("\n" + "=" * 60)
print("QUERY 6: PAYMENT ENTRIES OF TYPE 'Pay' (top 50)")
print("=" * 60)
r = get("/api/resource/Payment Entry", {
    "filters": json.dumps([["payment_type", "=", "Pay"], ["docstatus", "=", 1]]),
    "fields": json.dumps(["name", "company", "posting_date", "paid_amount", "paid_from", "paid_to", "party", "mode_of_payment"]),
    "limit_page_length": 50
})
jdump(r.get("data", []))

# ── QUERY 7: Sample expense JV (full doc) ──
# We'll try to find a JV with "expense" in remark or account
print("\n" + "=" * 60)
print("QUERY 7: LOOKING FOR EXPENSE-RELATED JVs")
print("=" * 60)
for keyword in ["expense", "salary", "rent", "utility", "marketing", "purchase"]:
    try:
        r = get("/api/resource/Journal Entry", {
            "filters": json.dumps([["docstatus", "=", 1], ["user_remark", "like", f"%{keyword}%"]]),
            "fields": json.dumps(["name", "company", "posting_date", "total_debit", "user_remark"]),
            "limit_page_length": 5
        })
        entries = r.get("data", [])
        if entries:
            print(f"\n  Found JVs with '{keyword}' in remark:")
            jdump(entries)
            # Get full doc for the first one
            first = entries[0]["name"]
            print(f"\n  Full doc for {first}:")
            full = get(f"/api/resource/Journal Entry/{first}")
            jdump(full.get("data", {}))
            break
    except:
        pass
else:
    # Just get the first JV full doc
    r = get("/api/resource/Journal Entry", {
        "filters": json.dumps([["docstatus", "=", 1]]),
        "fields": json.dumps(["name"]),
        "limit_page_length": 1
    })
    entries = r.get("data", [])
    if entries:
        first = entries[0]["name"]
        print(f"  No keyword match. Showing full doc for first JV: {first}")
        full = get(f"/api/resource/Journal Entry/{first}")
        jdump(full.get("data", {}))

# ── QUERY 8: GL entries against Salary accounts ──
print("\n" + "=" * 60)
print("QUERY 8: GL ENTRIES WITH SALARY-LIKE ACCOUNTS (debit > 0)")
print("=" * 60)
r = get("/api/resource/GL Entry", {
    "filters": json.dumps([["is_cancelled", "=", 0], ["account", "like", "%Salary%"], ["debit", ">", 0]]),
    "fields": json.dumps(["name", "company", "account", "debit", "posting_date", "voucher_no"]),
    "limit_page_length": 50
})
jdump(r.get("data", []))

# ── QUERY 9: Rent, Utility, Marketing expenses ──
print("\n" + "=" * 60)
print("QUERY 9: GL ENTRIES FOR RENT / UTILITY / MARKETING ACCOUNTS")
print("=" * 60)
for kw in ["Rent", "Utility", "Marketing", "Office", "Travel", "Telephone", "Internet", "Insurance", "Professional"]:
    r = get("/api/resource/GL Entry", {
        "filters": json.dumps([["is_cancelled", "=", 0], ["account", "like", f"%{kw}%"], ["debit", ">", 0]]),
        "fields": json.dumps(["name", "company", "account", "debit", "posting_date", "voucher_no"]),
        "limit_page_length": 50
    })
    entries = r.get("data", [])
    if entries:
        print(f"\n  '{kw}' — {len(entries)} entries:")
        jdump(entries)
    else:
        print(f"  '{kw}' — 0 entries")

# ── QUERY 10: Total JV count across all companies ──
print("\n" + "=" * 60)
print("QUERY 10: TOTAL JOURNAL ENTRY COUNT (all companies)")
print("=" * 60)
r = get("/api/method/frappe.client.get_count", {
    "doctype": "Journal Entry",
    "filters": json.dumps([["docstatus", "=", 1]])
})
print(f"  Total submitted JVs: {r.get('message', 0)}")

# ── QUERY 11: Most recent 30 JVs across all companies ──
print("\n" + "=" * 60)
print("QUERY 11: MOST RECENT 30 JVs (all companies)")
print("=" * 60)
r = get("/api/resource/Journal Entry", {
    "filters": json.dumps([["docstatus", "=", 1]]),
    "fields": json.dumps(["name", "company", "posting_date", "voucher_type", "total_debit", "remark"]),
    "limit_page_length": 30,
    "order_by": "creation desc"
})
jdump(r.get("data", []))

# ── BONUS: Check all account root_types to understand chart of accounts ──
print("\n" + "=" * 60)
print("BONUS: ALL EXPENSE-TYPE ACCOUNTS IN THE SYSTEM")
print("=" * 60)
r = get("/api/resource/Account", {
    "filters": json.dumps([["root_type", "=", "Expense"], ["is_group", "=", 0]]),
    "fields": json.dumps(["name", "company", "account_name", "parent_account", "root_type"]),
    "limit_page_length": 200
})
jdump(r.get("data", []))

print("\n" + "=" * 60)
print("BONUS: GL ENTRIES AGAINST ANY EXPENSE ROOT_TYPE ACCOUNT (top 100)")
print("=" * 60)
# Get expense account names first
expense_accounts = r.get("data", [])
if expense_accounts:
    # Try filtering GL entries by a few expense accounts
    acct_names = [a["name"] for a in expense_accounts[:5]]
    print(f"  Checking first 5 expense accounts: {acct_names}")
    for acct in acct_names:
        r2 = get("/api/resource/GL Entry", {
            "filters": json.dumps([["is_cancelled", "=", 0], ["account", "=", acct]]),
            "fields": json.dumps(["name", "company", "account", "debit", "credit", "posting_date", "voucher_type", "voucher_no"]),
            "limit_page_length": 20
        })
        entries = r2.get("data", [])
        if entries:
            print(f"\n  Account '{acct}' — {len(entries)} entries:")
            jdump(entries)
        else:
            print(f"  Account '{acct}' — 0 entries")

print("\n\nDONE.")
