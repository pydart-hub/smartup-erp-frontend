# Branch Manager Class & Subject Performance Hub (Option A)

## Overview
Implement Option A: Unified Performance Hub with 2 switchable modes:
1. **Class-Wise Performance** (Class / Program -> Batches in Branch -> Batch Exam Details)
2. **Subject-Wise Performance** (Subject -> Classes taking Subject -> Batches -> Batch Exam Details)
Both modes are strictly scoped to the Branch Manager's own branch (`defaultCompany`) with no data leakage from other branches.

## Proposed Structure
- Location: `src/app/dashboard/branch-manager/class-performance/page.tsx`
- Mode switcher: Two tabs or switcher cards:
  - `Class-Wise Performance`
  - `Subject-Wise Performance`
- Dedicated subcomponents:
  - `BranchClassWiseView` (Standard/Program -> Batches -> Exam Breakdown)
  - `BranchSubjectWiseView` (Subject -> Standard/Program -> Batches -> Exam Breakdown)
- Scoped to `defaultCompany` via API query filters and frontend verification.

## Checklist
- [x] Step 1: Create `src/components/branch-manager/BranchPerformanceHub.tsx` containing the branch-isolated Class-Wise and Subject-Wise views.
- [x] Step 2: Integrate `BranchPerformanceHub` into `src/app/dashboard/branch-manager/class-performance/page.tsx` with smooth tabs/mode switching.
- [x] Step 3: Verify TypeScript compilation (`npx tsc --noEmit` exited 0).
- [ ] Step 4: Commit changes and push to `origin/main`.
- [ ] Step 5: Deploy to server `76.13.244.60` via `deploy.sh` and verify PM2 cluster.
