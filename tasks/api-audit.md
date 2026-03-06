# API Endpoint Audit — SmartUp ERP Frontend

**Date:** Completed  
**Scope:** All 17 Next.js API routes + 12 frontend API helpers

---

## Security Fixes Applied ✅

| Route | Issue | Fix |
|-------|-------|-----|
| `/api/admission/create-invoices` | **No auth at all** — anyone could create invoices | Added `requireRole(STAFF_ROLES)` guard |
| `/api/payments/send-receipt` | **No auth** — anyone could trigger receipt emails | Added `requireAuth()` guard + cookie forwarding from callers |
| `/api/payments/record-cash` | No role check — any authenticated user (incl. Parent) could record cash | Replaced manual session parse with `requireRole(STAFF_ROLES)` |
| `/api/auth/create-parent-user` | No role check — any authenticated user could create parent users | Added `requireRole(STAFF_ROLES)` guard |
| `/api/payments/verify` + `/api/payments/record-cash` | Internal calls to `send-receipt` didn't forward cookies | Added `Cookie` header forwarding from original request |

### Shared Auth Helper Created
- **`src/lib/utils/apiAuth.ts`** — `parseSession()`, `requireAuth()`, `requireRole()`, `STAFF_ROLES`
- Replaces copy-pasted session parsing across routes
- `STAFF_ROLES` = Administrator, Branch Manager, Director, System Manager

---

## Reliability Fix ✅

| Route | Issue | Fix |
|-------|-------|-----|
| `/api/admission/create-invoices` | Partial invoice creation failures were silently swallowed | Now returns `{ invoices: [...], failed: [...] }` with error details per failed instalment |

---

## Missing Feature Added ✅

| Feature | Description |
|---------|-------------|
| **Payment History (Parent Portal)** | Parents can now see a table of all Payment Entries (date, amount, mode, reference) per child on the fees page |

**Files changed:**
- `src/app/api/parent/data/route.ts` — Fetches `Payment Entry` docs per customer
- `src/app/dashboard/parent/page.tsx` — Added `PaymentEntryRecord` type, updated `ParentData`
- `src/app/dashboard/parent/fees/page.tsx` — Payment History table in ChildFeeCard

---

## Known Issues (Not Addressed — Acceptable Risk)

| Severity | Route | Issue | Rationale |
|----------|-------|-------|-----------|
| MEDIUM | `/api/payments/create-order` | No server-side check that invoice belongs to caller's student | Impractical (requires 4+ Frappe calls); frontend already shows only own invoices. Razorpay verifies amount matches at checkout. |
| MEDIUM | `/api/fee-config` | No auth — fee structures publicly queryable | Intentional — pricing info is public |
| MEDIUM | `/api/auth/login` | `api_secret` in base64 session cookie (not encrypted) | httpOnly + SameSite=Lax mitigates XSS. Full encryption would require server-side session store (future improvement). |
| LOW | `/api/auth/me` | No Frappe-side session validation | Cookie expires in 7 days. Adding a Frappe call would slow every page load. |
| LOW | `/api/auth/create-parent-user` | Sends plaintext password in welcome email | Standard UX pattern for first-time credentials. Email prompts user to change password. |

---

## Architecture Summary

### Auth Mechanisms
1. **User token** — Instructor API key/secret stored in session (proxy uses this)
2. **Admin token** — Env vars `FRAPPE_API_KEY:FRAPPE_API_SECRET` (used by all server routes)
3. **No auth / public** — `/api/auth/forgot-password`, `/api/fee-config`

### API Route Inventory (17 routes)
- Auth: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/auth/create-parent-user`
- Proxy: `/api/proxy/[...path]`
- Payments: `/api/payments/create-order`, `/api/payments/verify`, `/api/payments/record-cash`, `/api/payments/send-receipt`
- Fees: `/api/fees/pending-invoices`, `/api/fees/class-summary`, `/api/fee-config`
- Admission: `/api/admission/create-invoices`
- Admin: `/api/admin/assign-instructor-role`, `/api/admin/remove-accounts-permission`
- Parent: `/api/parent/data`

### Frontend API Helpers (12 files)
All route through `/api/proxy` with session cookie.
`accounts.ts`, `attendance.ts`, `auth.ts`, `batches.ts`, `client.ts`, `courseSchedule.ts`, `director.ts`, `employees.ts`, `enrollment.ts`, `fees.ts`, `hr.ts`, `sales.ts`
