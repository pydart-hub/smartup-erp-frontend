# Task: Fix Student Demo to Regular Conversion Payment Options

- [x] 1. Check `/api/admission/convert-to-regular/route.ts` types and validations for `instalments: 5` <!-- id: 1 -->
- [x] 2. Update `ConvertDemoModal.tsx` to dynamically generate instalment options based on `feeConfig` <!-- id: 2 -->
- [x] 3. Ensure automatic reset/fallback of `instalments` to a valid option when `feeConfig` loads <!-- id: 3 -->
- [x] 4. Ensure restricted branches / plans are handled cleanly <!-- id: 4 -->
- [x] 5. Verify type check and fee calculations <!-- id: 5 -->

## Review & Results
- Root cause: Standard school programs (8th, 9th, 10th, Plus One, Plus Two) use a 5-instalment structure in the fee schedule (`[1, 5]`), but `ConvertDemoModal.tsx` was hardcoded to `[1, 4, 6, 8]` and defaulted to 4 instalments. Because 4/6/8 instalments do not exist for standard programs, `generateInstalmentSchedule` produced ₹0 for all instalments, leaving One-Time as the only working option.
- Fix: `ConvertDemoModal.tsx` now calls `getInstalmentOptionsForConfig(feeConfig)` dynamically. For standard 5-instalment programs, it renders "One-Time" and "5 Months (5 instalments)" with their full calculated amounts and due dates. When `feeConfig` loads, it automatically selects 5 instalments by default. TypeScript verification passed with 0 errors.


