# Task: SmartUp CBSE Crash Course Enquiry System (`enquiry.smartuplearning.net` & `smartup_enquiry` VPS DB)

## Status: COMPLETED & VERIFIED LIVE ON VPS

### Plan & Objectives
- [x] 1. Inspect admin auth pattern and VPS PostgreSQL / Nginx environment (`smartup-portal`).
- [x] 2. Harden `POST /api/enquiry/register` (`P2002` retry + `crypto` ref codes) and build protected Counsellor Portal (`/enquiry/admin` + `/api/enquiry/admin/auth` + `/api/enquiry/admin/leads`).
- [x] 3. Provision isolated `smartup_enquiry` PostgreSQL DB + `smartup_enquiry_admin` role on VPS, configure `ENQUIRY_DATABASE_URL` (`connection_limit=20`), and update `scripts/deploy.sh`.
- [x] 4. Configure `/etc/nginx/sites-available/enquiry` on VPS, deploy `8af11dd`, and verify HTTP 200 routing, HTTP 201 registration saving to `smartup_enquiry`, and admin portal retrieval.

## Remaining External Step (DNS Only)
- Add `A` record in Cloudflare DNS for `smartuplearning.net`: `enquiry` → `76.13.244.60` (Proxied). Everything on the VPS (Nginx, PM2, Next.js, PostgreSQL) is already live and tested.
