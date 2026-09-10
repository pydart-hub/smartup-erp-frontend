# Tasks: Selectable Paid Invoices & Payment Entries Receipt Dispatch

- [ ] Enhance backend `receiptService.ts` & `/api/payments/send-receipt` to support both `invoice_id` and `payment_entry_id`, with optional channel selection (email / whatsapp) <!-- id: 30 -->
- [ ] Upgrade `SendReceiptModal.tsx` to support selecting among multiple paid invoices or payment entries, channel checkboxes, and custom email/mobile inputs <!-- id: 31 -->
- [ ] Update `branch-manager/students/[id]/page.tsx` & `sales-user/students/[id]/page.tsx` to add "Send Receipt" button on each paid invoice row in the Invoices table and pass all available paid items to modal <!-- id: 32 -->
- [ ] Update `StudentTransactionHistory.tsx` to allow triggering receipt dispatch directly for any payment entry <!-- id: 33 -->
- [ ] Run type-checking (`npx tsc --noEmit`), test build, and verify implementation <!-- id: 34 -->
- [ ] Push to Git and deploy to production server with zero-downtime cluster reload <!-- id: 35 -->
