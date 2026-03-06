# Lessons Learned

## Frappe Email: Don't Hardcode Sender
- **Date**: 2026-03-06
- **Issue**: `create-parent-user` hardcoded `sender: "academiqedullp@gmail.com"` which doesn't match Frappe's configured Email Account (`smartuplearningventures@gmail.com`). Frappe silently rejects emails when the sender doesn't match any Email Account.
- **Fix**: Omit `sender` from `frappe.core.doctype.communication.email.make` calls — Frappe automatically uses its configured default outgoing Email Account.
- **Rule**: Never hardcode sender emails. Let Frappe use its default outgoing. If you need to override, store it in an env var.

## Frappe Email: Guardian Lookup Chain Must Have Fallbacks
- **Date**: 2026-03-06
- **Issue**: `send-receipt` resolved guardian email via a single path (Invoice → SO → Student → Guardian → email). If any hop was null, the whole chain silently returned null and the email was never sent. Common failures: `student` field not set on invoice, guardians child table empty on Student.
- **Fix**: Implemented 3 fallback paths: Path A (Invoice.student), Path B (Invoice → SO → student), Path C (Invoice → customer → Student lookup). Each path logged at every step.
- **Rule**: For multi-hop Frappe lookups, always implement multiple fallback paths and log which path succeeds/fails.

## File Loss Prevention — ALWAYS commit before moving on
- **Date**: 2026-06-XX
- **Issue**: `courseSchedule.ts` and `course-schedule/page.tsx` became 0-byte files after a dev server crash. All work from the previous session was lost because files were never committed to git.
- **Rule**: After completing any feature or significant file change, run `git add . && git commit -m "checkpoint"` immediately. Never rely on untracked files surviving across sessions.

## Frappe Server Scripts — RestrictedPython Limitations
- **Date**: 2026-06-XX
- **Issue**: Frappe Server Scripts run in RestrictedPython sandbox with severe limitations:
  - NO `import` statements (not even `import json`)
  - NO `frappe.parse_json()` (doesn't exist)
  - NO `.items()` on dicts (iterator guard blocks it)
  - NO `.get()` in for loops (iterator guard)
- **Fix**: Use `frappe.get_doc({...})` with direct `frappe.form_dict.attribute_name` access. Build the dict inline.
- **Rule**: For Server Scripts, always test the simplest possible approach first. Only use direct attribute access on `frappe.form_dict`.

## Frappe API Field Permissions
- **Date**: 2026-02-27
- **Issue**: `outstanding_amount` field on `Sales Order` is restricted by Frappe's field-level permissions and cannot be used in `get_list` queries (resource API). Using it causes a `DataError: Field not permitted in query`.
- **Root Cause**: Frappe validates fields in `reportview.validate_fields()` and blocks restricted fields. This restriction is doctype-specific — `Sales Invoice.outstanding_amount` works fine, but `Sales Order.outstanding_amount` does not.
- **Fix**: Use `advance_paid` and `per_billed` fields instead for Sales Order. For outstanding calculation, use `grand_total - advance_paid`.
- **Rule**: Always test Frappe field accessibility with a direct curl/API call before using fields in aggregate or list queries. Don't assume all standard fields are accessible via the resource API.

## Frappe Fee Schedule: grand_total vs total_amount
- **Date**: 2026-02-27
- **Issue**: `Fee Schedule.grand_total` is always 0 in Frappe. The actual fee amount lives in `total_amount`.
- **Fix**: Use `total_amount` as the primary amount field for Fee Schedule, with `grand_total` as fallback.
- **Rule**: Check actual data values in Frappe before building aggregate queries. Different doctypes may use different fields for "the amount".

## Frappe Aggregate Queries
- **Date**: 2026-02-27
- **Lesson**: Frappe's resource API supports `sum()`, `count()`, `avg()` etc. in the `fields` parameter (e.g., `["sum(grand_total) as total"]`). This works well for dashboard stats. However, if ANY field in the query is restricted, the entire query fails — not just that field.
- **Rule**: Keep aggregate queries minimal. If one field is restricted, the whole query fails silently (returns error → defaults to 0). Test each field individually.

## Next.js allowedDevOrigins — LAN Access Breaks Client Components
- **Date**: 2026-06-XX
- **Issue**: When accessing the Next.js dev server from a LAN IP (e.g. `192.168.1.66:3000` instead of `localhost:3000`), Next.js 16 blocks `/_next/*` resource loading (JS bundles, chunks, HMR websocket) as cross-origin. The HTML shell loads, but React components never hydrate — so `useEffect` never fires, `fetch()` calls are never made, and the page appears "empty" despite HTML being present in the DOM.
- **Symptoms**: Page loads but shows no data. API requests never appear in dev server logs. Direct API testing via `node -e fetch(...)` works fine. Pages that were already cached/loaded continue to work.
- **Root Cause**: Next.js 16 introduced `allowedDevOrigins` security feature that blocks cross-origin `/_next/*` requests from non-localhost origins by default.
- **Fix**: Add `allowedDevOrigins: ["192.168.1.66", "localhost", "127.0.0.1"]` to `next.config.ts`. Use hostname-only format (not full URLs like `http://192.168.1.66:3000`).
- **Rule**: Whenever the app is accessed from a non-localhost origin (LAN, ngrok, etc.), configure `allowedDevOrigins` FIRST. If a "use client" page appears empty with no errors and no API calls in logs, this is the first thing to check.

## Frappe GET /resource/ vs POST /method/frappe.client.get_list
- **Date**: 2026-06-XX
- **Issue**: Frappe's `GET /api/resource/{doctype}` endpoint blocks child-table field references (backtick-quoted `\`tabChild Table\`.field`) with "Field not permitted in query" error. This is a security feature.
- **Working Alternative**: Use `POST /api/method/frappe.client.get_list` with admin token — supports child-table fields, `group_by`, and aggregations on joined tables.
- **Rule**: For queries needing child-table joins or group_by, always use server-side API routes with admin token calling `frappe.client.get_list` POST. Don't attempt child-table fields through the GET resource endpoint.

## Admission: Non-Blocking SO/Invoice Creation Hides Failures
- **Date**: 2026-03-06
- **Issue**: `admitStudent()` wraps SO creation (step 5) and invoice creation (step 6) in try/catch blocks that only `console.warn` on failure. The toast always shows "Student admitted successfully!" even when no SO or invoices were created. Additionally, the `failed` array from the create-invoices API response was never checked.
- **Impact**: BM thinks admission is complete, but parent sees fee totals with no way to pay because no Sales Invoices exist in Frappe.
- **Fix**: Return `warnings: string[]` from `admitStudent()`. Show `toast.warning()` for each issue. Check `failed` array from create-invoices. Add "Generate Invoices" retry button on SO detail page. Show "Invoices being processed" message on parent fees page when SO exists but no invoices.
- **Rule**: Non-blocking operations that affect user-facing functionality (payments, emails) must surface failures as warnings to the operator. Never silently swallow errors that leave the system in an inconsistent state.

## Frappe UOM "Nos" Requires Whole Number Quantities
- **Date**: 2026-03-06
- **Issue**: The `create-invoices` route calculated fractional qty (e.g., `instalment_amount / so_total * so_item_qty` → 0.294) for Sales Invoice items. Frappe's UOM "Nos" has `must_be_whole_number=1` enabled, causing `UOMMustBeIntegerError: Quantity (0.294) cannot be a fraction` on ALL invoice creation attempts.
- **Impact**: Zero invoices created after admission. Parent couldn't pay fees at all. SO showed 0% billed.
- **Fix**: Use `qty: 1, rate: instalment_amount` for each instalment invoice instead of splitting the SO line qty proportionally. Removed `remainingQty` tracking and `isLast` fractional logic. Kept `sales_order` and `so_detail` linkage.
- **Rule**: When creating Sales Invoice items linked to a Sales Order, always use `qty: 1` with the instalment amount as the rate. Never calculate fractional quantities — Frappe UOM "Nos" rejects non-integers. The SO `per_billed` field auto-calculates correctly based on total amounts billed.
