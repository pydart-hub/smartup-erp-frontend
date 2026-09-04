# Task: Include Overdue Installment Invoices in Overdue Reports & Exports

- [ ] Update `src/app/api/director/report-overdue/route.ts` to attach `overdueInvoices` list per student <!-- id: 0 -->
- [ ] Update `src/app/api/director/report-overdue-export/route.ts` to expand overdue installment invoices in Excel/CSV exports <!-- id: 1 -->
- [ ] Update `src/app/dashboard/director/dues/[branch]/all/page.tsx` to expand overdue installment invoices in CSV & Excel exports and add Excel export button <!-- id: 2 -->
- [ ] Update `src/app/dashboard/director/dues/[branch]/[classId]/[batch]/page.tsx` to expand overdue installment invoices in CSV & Excel exports and add Excel export button <!-- id: 3 -->
- [ ] Run `npx tsc --noEmit` to verify type safety <!-- id: 4 -->
- [ ] Commit, push to `origin main`, and run `deploy.sh` on production server <!-- id: 5 -->
- [ ] Verify server health across all cluster instances <!-- id: 6 -->
