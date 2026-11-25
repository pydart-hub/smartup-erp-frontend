# Task: SmartUp CBSE Crash Course Enquiry Landing Page — Minimal Editorial UI

## Status: COMPLETED (Ready for Local Preview — Hosting Pending User Command)

### Plan & Objectives
- [x] 1. Update `tasks/lessons.md` with minimalism & layout transformation rule and trim bloated content.
- [x] 2. Build clean light-editorial split-hero placing the Student Registration Form directly above the fold (`HeroRegistrationSection.tsx`).
- [x] 3. Create minimal `HighlightsSection.tsx`, `PlansSection.tsx`, `FaqSection.tsx`, and `EnquiryFooter.tsx` with essential-only content.
- [x] 4. Verify with `npx eslint`, `npx tsc --noEmit`, and `npx next build`.

## Review & Verification
- `npx eslint src/app/enquiry src/components/enquiry src/data/enquiry-content.ts src/lib/enquiry src/app/api/enquiry src/proxy.ts`: Passed with 0 errors/warnings.
- `npx tsc --noEmit`: Passed with exit code 0.
- `npx next build`: Passed with exit code 0 (`/enquiry` prerendered as static content, `/api/enquiry/register` compiled as dynamic route).
