# Diagnosis Exam Final Implementation Plan

Date: 2026-07-01

## Instruction Boundary

This document is only the implementation plan.

No code changes are to be implemented until you explicitly give the command.

## Objective

Prepare the current diagnosis exam system for a near-term live exam event with around `800` concurrent students, assuming:

- separate deployment is not realistic now
- server configuration can be handled
- implementation must focus on short-term risk reduction inside the current app

## Current Constraints

- same repo
- same domain
- same `/exam-site` flow
- same Prisma/Postgres exam DB
- same Next.js application

## Core Risks To Reduce

1. duplicate active attempts
2. stale `in_progress` attempts
3. browser-only timer enforcement
4. one network request per answer click
5. submit happening before pending answers are safely stored
6. missing DB indexes for exam traffic
7. avoidable result/history query load
8. poor live visibility during exam time

## Final Implementation Plan

## Phase 1: Attempt Lifecycle Correctness

Goal: make the server authoritative for attempt state.

### Work

1. Add a shared helper file:
   - `src/lib/public-exam/attempts.ts`
2. Move deadline and expiry logic into shared helpers:
   - `getAttemptDeadline()`
   - `isAttemptExpired()`
   - `finalizeExpiredAttemptIfNeeded()`
   - `validateActiveAttemptOrClose()`
3. Enforce expiry in:
   - `src/app/api/public-exam/start/route.ts`
   - `src/app/api/public-exam/attempt/[attemptId]/answer/route.ts`
   - `src/app/api/public-exam/attempt/[attemptId]/submit/route.ts`
   - `src/app/exam-site/attempt/[attemptId]/page.tsx`
   - `src/app/exam-site/result/[attemptId]/page.tsx`
4. Auto-close expired `in_progress` attempts as `auto_submitted`.

### Expected Result

- no expired attempt remains open indefinitely
- exam state becomes server-controlled instead of browser-controlled

## Phase 2: Prevent Duplicate Attempts

Goal: ensure a student resumes a valid active attempt instead of creating a second one.

### Work

1. Update `src/app/api/public-exam/start/route.ts`
2. Before creating a new attempt, look up:
   - same `publishingId`
   - same normalized `studentPhone`
   - `status = in_progress`
3. If a valid unexpired attempt exists:
   - return the same `attemptId`
   - mark response as `resumed: true`
4. Update landing/start UI in:
   - `src/app/exam-site/page.tsx`
   - `src/components/public-exam/NextExamButton.tsx`

### Expected Result

- duplicate live attempts stop being created
- resume behavior becomes predictable

## Phase 3: Replace Per-Click Save With Batched Autosave

Goal: reduce request volume and improve answer durability.

### Work

1. Add new route:
   - `src/app/api/public-exam/attempt/[attemptId]/answers/route.ts`
2. Bulk route should:
   - validate token once
   - validate attempt status once
   - validate expiry once
   - upsert multiple answers in one Prisma transaction
3. Refactor:
   - `src/components/public-exam/ExamPlayer.tsx`
4. New frontend behavior:
   - answer updates UI immediately
   - store pending answers in memory
   - debounce flush every `2-3` seconds
5. Flush immediately on:
   - next question
   - previous question
   - submit
   - visibility change
   - unload
6. Block final submit while pending answers are unsent.

### Expected Result

- much lower write-request volume
- safer answer persistence
- lower chance of answer loss during network spikes

## Phase 4: Submit Safety

Goal: make final submission safer without redesigning the whole grading flow.

### Work

1. Keep grading inline for now.
2. Before submit:
   - flush pending answers
   - validate attempt state
   - validate expiry
3. If expired but not yet closed:
   - finalize as `auto_submitted`
4. Improve submit error handling in:
   - `src/components/public-exam/ExamPlayer.tsx`
   - `src/app/api/public-exam/attempt/[attemptId]/submit/route.ts`

### Expected Result

- submit becomes safer under pressure
- fewer “last answer was not stored” failures

## Phase 5: Database Support

Goal: make the exam table structure support live traffic better.

### Work

1. Update `prisma/schema.prisma`
2. Add these indexes on `ExamAttempt`:
   - `@@index([studentPhone])`
   - `@@index([publishingId])`
   - `@@index([status])`
   - `@@index([createdAt])`
   - `@@index([publishingId, status])`
   - `@@index([studentPhone, createdAt])`
3. Generate Prisma migration.

### Expected Result

- faster attempt lookup
- faster history lookup
- faster stale-attempt cleanup
- better support for concurrent exam traffic

## Phase 6: Stale Attempt Cleanup

Goal: remove already-bad state from production and keep it from growing.

### Work

1. Add cleanup script:
   - `scripts/close-stale-public-exam-attempts.ts`
2. Script should:
   - find `in_progress` attempts
   - compute deadline
   - auto-grade expired ones
   - convert them to `auto_submitted`
   - print summary
3. Run it:
   - once before exam day
   - once after deployment
   - optionally during exam day if needed

### Expected Result

- no stale active attempts remaining in production
- cleaner exam state before the live event

## Phase 7: Result And History Optimization

Goal: reduce avoidable DB pressure outside the core attempt flow.

### Work

1. Trim `history` route to return only fields actually required.
2. Review:
   - `src/app/api/public-exam/history/route.ts`
   - `src/app/exam-site/result/[attemptId]/page.tsx`
3. Reuse `resultSnapshotJson` rather than recalculating more than necessary.
4. Keep history fetches limited and debounced.

### Expected Result

- less extra DB work during active usage
- smoother result and history experience

## Phase 8: Token Hardening

Goal: reduce security weakness while touching the same routes.

### Work

1. In `start`, generate raw token for client use.
2. Hash token before storing in `sessionTokenHash`.
3. In save/submit routes, hash incoming token before comparison.

### Expected Result

- safer token storage
- no raw session token sitting in DB

## Phase 9: Observability And Exam-Day Controls

Goal: make the team able to monitor and react during the live exam.

### Work

1. Add lightweight route-level logging/metrics for:
   - `/api/public-exam/start`
   - `/api/public-exam/attempt/[attemptId]/answers`
   - `/api/public-exam/attempt/[attemptId]/submit`
   - `/api/public-exam/history`
2. Track:
   - latency
   - failures
   - duplicate resume hits
   - auto-submitted expiries
3. Prepare an exam-day runbook document with:
   - PM2 commands
   - Nginx checks
   - stale cleanup command
   - DB connection checks

### Expected Result

- team can observe real problems quickly
- lower operational panic on exam day

## Phase 10: Validation

Goal: confirm the system is actually safer before the live exam.

### Work

1. Add load-test scripts under:
   - `scripts/load-test/`
2. Test:
   - landing burst
   - start burst
   - batched answer save burst
   - submit burst
3. Also test manually:
   - refresh during exam
   - resume attempt
   - expired attempt open
   - double-click start
   - submit with pending save

### Expected Result

- readiness is based on evidence, not guessing

## Files Planned For Change

### New Files

- `src/lib/public-exam/attempts.ts`
- `src/app/api/public-exam/attempt/[attemptId]/answers/route.ts`
- `scripts/close-stale-public-exam-attempts.ts`
- optionally `scripts/load-test/full-flow.js`
- optionally `docs/diagnosis-exam-runbook.md`

### Existing Files To Update

- `src/app/api/public-exam/start/route.ts`
- `src/app/api/public-exam/attempt/[attemptId]/answer/route.ts`
- `src/app/api/public-exam/attempt/[attemptId]/submit/route.ts`
- `src/app/exam-site/attempt/[attemptId]/page.tsx`
- `src/app/exam-site/result/[attemptId]/page.tsx`
- `src/app/exam-site/page.tsx`
- `src/components/public-exam/ExamPlayer.tsx`
- `src/components/public-exam/NextExamButton.tsx`
- `src/app/api/public-exam/history/route.ts`
- `prisma/schema.prisma`

## Recommended Execution Order

1. attempt lifecycle helper and expiry enforcement
2. duplicate-attempt prevention
3. batched autosave route
4. `ExamPlayer` batched autosave refactor
5. submit flush safety
6. Prisma indexes
7. stale-attempt cleanup script
8. history/result optimization
9. token hashing
10. observability and load testing

## Minimum Safe Subset Before Exam

If time is very tight, do at least this:

1. server-side expiry enforcement
2. duplicate-attempt prevention
3. batched autosave
4. `ExamAttempt` indexes
5. stale-attempt cleanup
6. load test

## Reference Documents

- [docs/DIAGNOSIS-EXAM-IMPLEMENTATION-PLAN.md](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/DIAGNOSIS-EXAM-IMPLEMENTATION-PLAN.md)
- [docs/DIAGNOSIS-EXAM-SHORT-TERM-STRUCTURE.md](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/DIAGNOSIS-EXAM-SHORT-TERM-STRUCTURE.md)
- [docs/DIAGNOSIS-EXAM-NON-SERVER-RISK-REDUCTION-STRUCTURE.md](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/DIAGNOSIS-EXAM-NON-SERVER-RISK-REDUCTION-STRUCTURE.md)

## Final Note

This file is the implementation plan only.

No implementation should begin until you explicitly give the command.
