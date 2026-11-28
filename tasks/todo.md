# Task: Setup Google Tag Manager (`GTM-PPCRHD8L`) on Enquiry Landing Page

## Status: COMPLETED & VERIFIED

## Scope
- Replaced `MetaPixelProvider` and `MetaLeadEvent` in `/enquiry` with Google Tag Manager (`GTM-PPCRHD8L`) so Meta Pixel, GA4, and other tags are managed centrally inside GTM (Option B).
- Preserved `MetaPixelProvider` and `MetaLeadEvent` for `/levelup`.
- Excluded `/enquiry/admin` (and `/admin` on `enquiry.*` subdomain) from GTM script injection and `dataLayer` events.

## Checklist
- [x] 1. Created `src/lib/analytics/gtm.ts` (`GTM_ID`, `dataLayer` helper, non-PII deduplicated `trackGtmEnquiryLead`, admin route exclusion).
- [x] 2. Created `src/components/analytics/GtmProvider.tsx` and `src/components/analytics/GtmLeadEvent.tsx`.
- [x] 3. Updated `src/app/enquiry/layout.tsx` to replace `<MetaPixelProvider />` with `<GtmProvider />`.
- [x] 4. Updated `src/components/enquiry/ThankYouView.tsx`, `types.ts`, `receipt.ts`, `HeroRegistrationSection.tsx`, `EnquiryHeader.tsx`, `PlansSection.tsx`, and `FaqSection.tsx` for `GtmLeadEvent` and non-PII funnel events.
- [x] 5. Added `NEXT_PUBLIC_GTM_ID=GTM-PPCRHD8L` to `.env.local` and verified `tsc --noEmit` (`0`), `eslint` (`0`), and `next build` (`0`, 396 pages).
