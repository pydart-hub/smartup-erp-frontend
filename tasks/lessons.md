# Lessons Learned

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
