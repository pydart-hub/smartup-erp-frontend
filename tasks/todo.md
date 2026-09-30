# Implementation Plan: Fix Overdue Fees, Exam Performance & Enrich MCP

## 1. Overdue Fees Alignment (Fix ₹80,525 -> ₹42,41,024 across 909 students)
- [ ] Implement `getLiveOverdueDues(branchName?: string)` in `src/lib/server/aiErpEngine.ts` matching `src/app/api/fees/dues-till-today/route.ts` (excluding discontinued students, aggregating outstanding amount where due_date <= today).
- [ ] Update `getLiveFeesData` in `src/lib/server/aiErpEngine.ts` so `summary.total_overdue` and `overdue_by_branch` report the exact ₹42,41,024 and 909 students instead of a 25-invoice sample sum.
- [ ] Add `get_overdue_fees` tool to `src/app/api/mcp/route.ts` and ensure `get_fees_and_collections` includes comprehensive overdue metrics.

## 2. Exam Performance, Ranking & CWC Data
- [ ] Implement `getLiveExamPerformance(examGroup?: string, branchName?: string, limit = 10)` in `src/lib/server/aiErpEngine.ts` computing:
  - Ranked list of best performing exams (by average percentage and pass rate).
  - Ranked list of best performing students overall and per branch.
  - CWC exam specific breakdown and toppers.
  - Online diagnosis paper performance stats (from Prisma when available).
- [ ] Update `get_exam_metrics` in `src/app/api/mcp/route.ts` to embed `best_performing_exams`, `best_performing_students`, and `cwc_exam_summary` so queries to `get_exam_metrics` immediately answer Claude's questions.
- [ ] Register new MCP tools `get_exam_performance`, `get_top_students`, and `get_overdue_fees` in `src/app/api/mcp/route.ts`.

## 3. Testing & Verification
- [ ] Test overdue calculation and exam performance via test scripts against live Frappe data.
- [ ] Verify TypeScript types and production build (`npx tsc --noEmit`).

## 4. Production Deployment & Live Verification
- [ ] Commit and push changes to `origin/main`.
- [ ] SSH to production server (`76.13.244.60`), pull updates, run build, and restart PM2 processes.
- [ ] Test the production MCP endpoint (`https://smartuplearning.net/api/mcp`) with MCP client requests for `get_exam_metrics`, `get_exam_performance`, `get_top_students`, and `get_overdue_fees`.
