# Lessons Learned

## Frappe Email System — Complete Workflow & SMTP Quota Fix
- **Date**: 2026-03-06 (updated 2026-03-06)

### How Frappe Email Works
1. **Email Accounts**: Frappe stores SMTP configs in `Email Account` doctype. Each has `enable_outgoing`, `default_outgoing`, `smtp_server`, `smtp_port`, `auth_method` (Basic = App Password).
2. **Email Queue**: All emails go through `Email Queue` doctype. Status: `Not Sent` → `Sent` or `Error`. Frappe scheduler processes the queue periodically.
3. **`send_welcome_email`**: When a User is created via API with `send_welcome_email: 1` (default), `User.after_insert()` calls `send_welcome_mail_to_user()` which uses `frappe.sendmail(now=True)` — sending **synchronously** through SMTP, NOT through the queue.
4. **Student.validate_user()**: When a Student is created with `student_email_id` and no matching User exists, Frappe auto-creates a User via `validate_user()` hook. This triggers the synchronous welcome email. If SMTP fails → **the entire Student insert rolls back with 500**.
5. **If User already exists**: `Student.validate_user()` finds the user, updates roles, does NOT send any email. Student creation succeeds.
6. **Email routing**: The `sender` field is just a display name. The actual SMTP authentication uses the `email_account` field, which defaults to the default outgoing Email Account.
7. **`email_retry_limit`** (System Settings): Defaults to 3. Frappe retries "Not Sent" emails up to this limit. After max retries → status changes to "Error" (permanent).

### The Quota Problem
- **Root Cause**: Gmail daily sending limit (500/day free, 2000/day Workspace). On 2026-02-26, a mass send of 829 emails through `smartuplearningventures@gmail.com` hit the daily limit.
- **Cascading failure**: 284 emails went to Error. Each retry (3×) = ~850 extra failed SMTP attempts. Google imposed an extended temporary block. Even days later, with only 13 emails/day, the account still returned "550 Daily user sending limit exceeded".
- **Student creation crash**: When `Smartuplearningventures` was default outgoing and its SMTP was blocked, `Student.validate_user()` → sync welcome email → SMTP 550 → 500 error → Student creation fails completely.

### Fixes Applied
1. **Pre-create User** (`enrollment.ts`): Create User via admin API with `send_welcome_email: 0` BEFORE creating Student. Student.validate_user() finds existing user → no email → no SMTP dependency. Tested: works even with completely broken SMTP.
2. **Switched default outgoing**: Changed from `Smartuplearningventures` (blocked) to `Academiqedullp` (working). Disabled `Smartuplearningventures` outgoing.
3. **Parent welcome email**: Removed plaintext password from email body. Now shows "Set Your Password" button linking to `/auth/forgot-password`.

### Verified Behavior (live tests)
| Scenario | Result |
|----------|--------|
| User created with `send_welcome_email: 0` | No email queued |
| Student created with existing user | No email queued |
| Student created WITHOUT pre-created user + working SMTP | Email queued + sent, Student created |
| Student created WITHOUT pre-created user + broken SMTP | **Student creation FAILS with 500** |
| Student created WITH pre-created user + broken SMTP | **Student created OK, zero emails** |

### Rules
- Always pre-create User with `send_welcome_email: 0` before any doctype that auto-creates users (Student, Employee, etc.)
- Never rely on Frappe's auto-user-creation when SMTP may be unavailable
- Monitor Email Queue errors — 325 stuck error emails can cause cascading SMTP quota issues via retries
- Only Administrator role can delete Email Queue entries — use Frappe desk UI to clean up
- Keep a secondary Email Account configured as backup; switch default outgoing if primary is blocked

## Frappe HTTP 409 on Resource Creation — Record May Still Exist
- **Date**: 2026-03-07
- **Issue**: Frappe returns HTTP 409 Conflict when creating a Program Enrollment even though the PE was successfully created. Axios treats 409 as error, killing the entire admission chain. The student appears "failed" in the UI but is actually saved to Frappe.
- **Root Cause**: Frappe's 409 can mean: (a) genuine duplicate, or (b) race condition where the doc was created between validation and insert. In both cases, the record often EXISTS.
- **Fix**: Wrap resource creation in try/catch. On 409, extract the record name from the response body OR query by the unique key combo. Check docstatus before attempting re-submission.
- **Rule**: NEVER trust that 409 means "nothing was created". Always check for the existing record and recover gracefully.

## Frappe PE.student_batch_name ≠ Student Group Name
- **Date**: 2026-03-07
- **Issue**: `Program Enrollment.student_batch_name` stores the **Student Batch Name** (e.g., "Vennala 26-27"), NOT the Student Group name (e.g., "SU ERV-10th State-2026-2027"). Comparing PE batch names against Student Group names produces zero matches.
- **Fix**: When filtering PEs by branch, fetch `Student Group.batch` field and compare against that.
- **Rule**: Always verify which linked doctype a field references. `student_batch_name` refers to the "Student Batch Name" doctype, not "Student Group".

## Multi-Step Frappe Operations Need Stage Tracking
- **Date**: 2026-03-07
- **Issue**: When `admitStudent()` creates 6+ resources in sequence and fails at step 4, the error message says "Failed to create student" even though the student was created successfully at step 2. The user has no idea which step failed.
- **Fix**: Implement stage-based progress tracking. Each step reports pending/in_progress/success/failed/skipped. Errors include the failing stage name and prior completed stages.
- **Rule**: For any multi-step API operation, track progress per step. Report partial success explicitly. Don't wrap everything in a single try/catch.

## SO qty Must Match Invoice Count for Multi-Instalment Billing
- **Date**: 2026-03-07
- **Issue**: Creating a Sales Order with qty=1 and then generating 4 invoices each with qty=1 and the same `so_detail` triggers Frappe's overbilling protection (billing 4× the ordered quantity).
- **Fix**: Create SO with qty=numInstalments and rate=perInstalmentRate. Each invoice then bills qty=1 per instalment, totaling exactly the ordered quantity.
- **Rule**: When planning multi-invoice billing against a single SO, set SO item qty to the expected number of invoices.

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

## Frappe Child Doctype Queries — PermissionError on frappe.client.get_list
- **Date**: 2026-03-19
- **Issue**: Querying child doctypes (e.g., `Student Group Student`, `Sales Invoice Item`) directly via `frappe.client.get_list` POST throws `PermissionError` — Frappe's `check_parent_permission()` blocks direct access to child tables even with admin API token.
- **Root Cause**: Frappe's security model doesn't allow `get_list` on child doctypes. The `check_parent_permission` function raises `PermissionError` when you try to query a child table without going through its parent doctype.
- **Fix**: Instead of querying child tables directly:
  1. Fetch the parent doctype list (e.g., `GET /api/resource/Student Group?filters=...`)
  2. Fetch each parent document individually (e.g., `GET /api/resource/Student Group/Kadavanthara-10th%20CBSE-A`) which includes child arrays (e.g., `.students`)
  3. Build mappings in JavaScript from the child data embedded in parent docs
- **Also**: Child doctypes do NOT have their own `docstatus` column — filtering by `docstatus` on a child table (e.g., `Sales Invoice Item`) causes SQL errors. Use `parenttype` or `parent` filters instead.
- **Rule**: NEVER use `frappe.client.get_list` on child doctypes. Always go through the parent document. Use `Promise.all()` to parallelize parent doc fetches for performance.

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

## Frappe PE on_submit Creates Course Enrollments — Must Patch CEs Before Submit
- **Date**: 2026-03-12
- **Issue**: When a Program Enrollment is submitted (`docstatus: 1`), Frappe's `on_submit` hook calls `create_course_enrollments()`, which auto-creates Course Enrollment records. If `custom_batch_name` is mandatory on Course Enrollment, Frappe throws `MandatoryError` and the submission fails.
- **Root Cause**: Transfer execute code was creating PE and immediately submitting it, without setting batch-related fields. The admission flow correctly creates PE as draft → patches CEs with `custom_batch_name` → then submits.
- **Fix**: Reordered Steps 7-8 in transfer: (1) find new branch Student Group first, (2) create PE as draft with `student_batch_name`, (3) patch auto-created CEs with `custom_batch_name` = Student Group name, (4) then submit PE.
- **Rule**: When creating a Program Enrollment, ALWAYS follow this sequence: create draft → patch Course Enrollments → submit. Never submit a PE immediately after creation if CEs have mandatory custom fields.

## Frappe Select Field Validation is Strict — No Custom Statuses
- **Date**: 2026-03-12
- **Issue**: `Student Branch Transfer.status` only allows "Pending", "Approved", "Rejected", "Completed", "Failed". Our transfer execute code tried to set "In Progress" as an intermediate status, which Frappe rejected with `ValidationError: Status cannot be "In Progress"`.
- **Root Cause**: Frappe `Select` fields validate against their defined option list. You cannot PUT a value that isn't in the dropdown options—Frappe throws `_validate_selects()` error.
- **Fix**: Removed the "In Progress" status update. The existing `status !== "Approved"` guard already prevents duplicate execution.
- **Rule**: ALWAYS check the allowed values of a Frappe `Select` field before writing to it. Never assume a status value exists—verify against the doctype definition or test with a direct API call first.

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

## Upfront Input Validation Prevents Frappe Stack Trace Leaks
- **Date**: 2026-03-07
- **Issue**: When `first_name` is empty, auto-generated student email becomes `.branchabbr.SRR@dummy.com` (starts with dot). Frappe rejects this with `InvalidEmailAddressError` including a full Python stack trace in the response. The raw traceback leaks internal paths like `apps/frappe/frappe/app.py`.
- **Impact**: Test E4 showed that error messages from Frappe can contain `File "apps/frappe/..."` and `Traceback` strings when exotic validation errors occur.
- **Fix**: Added upfront validation in `admitStudent()` for all required fields (`first_name`, `guardian_name`, `guardian_email`, `custom_branch`, `program`) BEFORE any Frappe API calls. Now fails fast with clean `validation_error` messages.
- **Rule**: Always validate required fields at the application layer before sending to Frappe. Frappe's error messages for edge cases (invalid email format, missing mandatory fields) often contain raw Python tracebacks that leak internals to the client.

## Real-Email Integration Test Results (2026-03-07)
- **Test Script**: `scripts/test-real-email-combos.mjs`
- **Scenarios tested**: 4 success + 4 error = 8 total
- **Results**: ALL 8 passed (4 ✅ success, 4 📋 expected errors)
- **Key findings**:
  - S1-S4: Full pipeline works end-to-end with real emails (Guardian → Parent User → Student User → Student → PE → Batch → SO → Welcome Email)
  - S3: Existing Frappe User as student email → pre-create returns 409 → handled gracefully
  - S4: Existing Frappe User as parent → parent creation returns 409 → handled gracefully
  - S4: Auto-generated dummy email → works fine
  - E1: Duplicate student email → caught with clean error message, no internal leak
  - E2: Duplicate SRR ID → caught as DuplicateEntryError, clean message
  - E3: Invalid program → caught at PE stage as LinkValidationError
  - E4: Missing first_name → now caught upfront before any API calls
  - Welcome emails: 4 emails queued via Academiqedullp, all force-sent to Sent status, 0 errors
  - Email Queue: started clean (Error=0), ended clean (Error=0, Not Sent=0)

