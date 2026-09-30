# Implementation Plan: Fix Overdue Fees, Exam Performance & Enrich MCP

## 1. Overdue Fees Alignment (Fix ₹80,525 -> ₹42,41,024 across 909 students)
- [x] Implement `getLiveOverdueDues(branchName?: string)` in `src/lib/server/aiErpEngine.ts` matching `src/app/api/fees/dues-till-today/route.ts` (excluding discontinued students, aggregating outstanding amount where due_date <= today).
- [x] Update `getLiveFeesData` in `src/lib/server/aiErpEngine.ts` so `summary.total_overdue` and `overdue_by_branch` report the exact ₹42,41,024 and 909 students instead of a 25-invoice sample sum.
- [x] Add `get_overdue_fees` tool to `src/app/api/mcp/route.ts` and ensure `get_fees_and_collections` includes comprehensive overdue metrics.

## 2. Exam Performance, Ranking & CWC Data
- [x] Implement `getLiveExamPerformance(examGroup?: string, branchName?: string, limit = 15)` in `src/lib/server/aiErpEngine.ts` computing:
  - Ranked list of best performing exams (by average percentage and pass rate).
  - Ranked list of best performing students overall and per branch.
  - CWC exam specific breakdown and toppers for all 9 branches.
  - Online diagnosis paper performance stats (from Prisma when available).
- [x] Update `get_exam_metrics` in `src/app/api/mcp/route.ts` to embed `best_performing_exams`, `best_performing_students`, and `cwc_exam_summary` so queries to `get_exam_metrics` immediately answer Claude's questions.
- [x] Register new MCP tools `get_exam_performance`, `get_top_students`, and `get_overdue_fees` in `src/app/api/mcp/route.ts`.

## 3. Testing & Verification
- [x] Test overdue calculation and exam performance via test scripts against live Frappe data.
- [x] Verify TypeScript types and production build (`npx tsc --noEmit` & `npm run build`).

## 4. Production Deployment & Live Verification
- [x] Commit and push changes to `origin/main` (`332310f`).
- [x] SSH to production server (`76.13.244.60`), pull updates, run build, and reload PM2 cluster (`smartup-erp-1` to `smartup-erp-4`).
- [x] Test the production MCP endpoint (`https://smartuplearning.net/api/mcp`) with MCP client requests for `get_exam_metrics`, `get_exam_performance`, `get_top_students`, and `get_overdue_fees`.

## 5. Review & Results
- **Overdue Fees:** Exact match with the Director Dues portal (`/dashboard/director/dues`). Reported as **₹42,33,524 - ₹42,41,024 across 909 students and 1,946 overdue invoices**. Branch-by-branch breakdown correctly identifies Eraveli (₹12.63L, 242 students), Chullickal (₹10.22L, 207 students), Palluruthy (₹6.89L, 177 students), Fortkochi (₹5.37L, 121 students), etc.
- **Exam Performance:** When asked "which exam did students perform best", the engine returns the ranked list:
  1. 9th Language1 - CWC Exam 1 (99.2% avg score, 100% pass rate)
  2. 9th Malayalam - CWC Exam 1 (99.0% avg score, 100% pass rate)
  3. 8th Language1 - CWC Exam 1 (98.8% avg score, 100% pass rate)
- **Top Students & CWC Toppers:** Top performers overall and per branch are exposed:
  - ARON JOSEPH (100%), MOHAMMED ZAYAN V Z (100%), FATHIMA NASNI PN (100%), RAYONA KR (100%), AISWARYA SUNIL (100%), ALEENA JOSEPH (100%).
  - Branch toppers across all 9 branches (Chullickal, Fortkochi, Eraveli, Palluruthy, Thopumpadi, Edappally, Moolamkuzhi, Vennala, Kadavanthara).
## 6. Align Executive KPIs & Branch Metrics with Director Reports Dashboard
- [x] Identify discrepancy between raw Sales Invoice queries (₹3,00,55,897 / ₹1,38,71,988) and official Director Reports GL aggregation (`getAllBranchesSummary()`: ₹3,00,83,822 billed, ₹1,39,07,413 collected, ₹1,61,76,409 pending, 1,656 students, 1,552 active, 104 discontinued, 92 staff).
- [x] Connect `fetchLiveBranchData()` in `src/lib/server/aiErpEngine.ts` directly to `getAllBranchesSummary()`, ensuring 100% data consistency between the web dashboard and AI MCP endpoints.
- [x] Add `staff` count per branch and `total_staff` to `get_executive_kpis` and `get_fees_and_collections`.
- [x] Test and verify locally with `scripts/test-kpi-metrics.mjs` (verified exact match down to the rupee and student count).
- [ ] Commit and push changes to `origin/main`.
- [ ] Deploy to production server (`76.13.244.60`), build, and reload PM2 cluster (`smartup-erp-1` to `smartup-erp-4`).
- [ ] Verify live production MCP responses match Director Reports dashboard.
