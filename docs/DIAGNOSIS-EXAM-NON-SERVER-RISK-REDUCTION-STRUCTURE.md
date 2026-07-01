# Diagnosis Exam Non-Server Risk Reduction Structure

Date: 2026-07-01

## Purpose

Assume server configuration is handled:

- multiple app instances
- Nginx upstream balancing
- same server remains in use

Even after that, important risks still remain in:

- exam correctness
- answer safety
- duplicate-attempt behavior
- stale attempt cleanup
- result and history query load
- operational response during the live exam
- observability and rollback readiness

This document covers the other changes that reduce risk beyond server configuration.

## Main Principle

After server scaling is done, the next biggest risks are not raw CPU alone.

The next biggest risks are:

- wrong exam state transitions
- lost or delayed answers
- stale in-progress attempts
- duplicated attempts
- heavy avoidable DB access
- unclear operator visibility during the live exam

So the structure should focus on:

1. correctness
2. write reduction
3. query reduction
4. data hygiene
5. observability
6. live operations

## Structure Overview

There are 8 non-server work areas:

1. attempt lifecycle control
2. answer durability improvements
3. result and history path optimization
4. database structure improvements
5. session and token hardening
6. operational visibility and alerting
7. live exam runbook and support controls
8. release safety and load validation

## 1. Attempt Lifecycle Control

## Why It Matters

This is the biggest non-server risk area.

Right now:

- `start` can create duplicate attempts
- stale `in_progress` attempts exist
- timer enforcement is mostly client-side
- result page redirects back to attempt when `status === in_progress`

Relevant files:

- [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:1)
- [src/app/api/public-exam/attempt/[attemptId]/answer/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/answer/route.ts:1)
- [src/app/api/public-exam/attempt/[attemptId]/submit/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/submit/route.ts:1)
- [src/app/exam-site/attempt/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/attempt/[attemptId]/page.tsx:1)
- [src/app/exam-site/result/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/result/[attemptId]/page.tsx:225)

## Needed Changes

### A. Introduce a Single Attempt State Model

Use a shared helper for:

- deadline calculation
- active/expired validation
- auto-finalization

Target helper file:

- `src/lib/public-exam/attempts.ts`

### B. Make Expiry Server-Authoritative

Required behavior:

- expired attempt cannot keep saving answers
- expired attempt cannot remain open indefinitely
- expired attempt should be auto-closed into `auto_submitted`

### C. Resume Active Attempts Instead Of Creating New Ones

The `start` route must:

1. search for active attempt for same `studentPhone + publishingId`
2. validate it is still within time
3. resume it if valid
4. only create a new attempt if none exists

### D. Add Explicit Lifecycle Rules

Recommended effective states:

- `in_progress`
- `submitted`
- `auto_submitted`

Short term, this is enough.

Longer term you could add:

- `submitted_pending`
- `expired`

But for the near exam, do not introduce extra state complexity unless really needed.

## 2. Answer Durability Improvements

## Why It Matters

Even after scaling the server, answer safety is still critical.

Current issue:

- one request per click in [ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:110)

That is fragile under network jitter and high concurrency.

## Needed Changes

### A. Use Batched Autosave

Add:

- `POST /api/public-exam/attempt/[attemptId]/answers`

Short-term target:

- answer state updates locally immediately
- background flush every `2-3` seconds
- single request can carry multiple answers

### B. Add Mandatory Flush Points

Flush pending answers on:

- next question
- previous question
- opening submit modal
- final submit
- tab hidden
- page unload

### C. Prevent Submit While Pending Flush Exists

Current submit flow can start even if the latest click has not safely reached the DB.

Needed behavior:

- if pending answers exist, force flush first
- only then allow submit request

### D. Retry Strategy

If bulk save fails:

- keep pending answers in memory
- mark UI as retrying/unsaved
- retry automatically

### E. Better Save UX

Current save state is very local.

Short-term UI additions that reduce panic during the exam:

- global `All answers saved`
- global `Saving changes...`
- global `Connection issue, retrying`

This matters for student confidence.

## 3. Result And History Path Optimization

## Why It Matters

The exam load is not only on attempt pages.

The result page and history path also do extra work.

Relevant files:

- [src/app/api/public-exam/history/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/history/route.ts:1)
- [src/app/exam-site/result/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/result/[attemptId]/page.tsx:1)
- [src/components/public-exam/NextExamButton.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/NextExamButton.tsx:1)

## Needed Changes

### A. Reduce Result Page DB Work

The result page currently:

- loads attempt with answers
- loads full history by phone
- loads active exams for that class
- parses result snapshot and paper snapshot

Short-term improvements:

- limit history projection to only needed fields
- keep history `take` low
- avoid expensive derived work if not visible

### B. Avoid Full History Fetch On Every Phone Interaction

The landing page fetches history as soon as a 10-digit phone is present.

Short-term improvements:

- keep debounce
- only fetch once input is stable
- optionally avoid re-fetch if same phone was already loaded in the same session

### C. Make Next Exam Start Reuse Resume Logic

`NextExamButton` uses the same `/api/public-exam/start` route.

That is good, but once resume logic is added:

- next exam button automatically becomes safer
- duplicate starts across sequential subject exams reduce

### D. Avoid Heavy Result Recomputations

Where possible:

- rely on `resultSnapshotJson`
- do not repeatedly re-derive more than needed

Short-term goal:

- grading happens once
- display reuses stored result

## 4. Database Structure Improvements

## Why It Matters

After app scaling, the database becomes the shared choke point.

## Needed Changes

### A. Add Missing `ExamAttempt` Indexes

Already identified:

- `studentPhone`
- `publishingId`
- `status`
- `createdAt`
- `(publishingId, status)`
- `(studentPhone, createdAt)`

### B. Add Optional Reporting Indexes

If diagnosis dashboards are actively used during or near the exam:

- `studentBranch`
- `classLevel`
- `(classLevel, createdAt)`

These are not first priority, but they help dashboards stay out of the way of live exam traffic.

### C. Consider Partial Unique Protection For Active Attempts

Longer-term ideal:

- one active attempt per `studentPhone + publishingId`

Short-term:

- application logic first
- DB partial unique index second if needed

### D. Add Cleanup-Friendly Query Support

The cleanup job for stale attempts must be efficient.

That is why:

- `status`
- `createdAt`
- `publishingId`

are especially valuable.

## 5. Session And Token Hardening

## Why It Matters

Not the biggest scale issue, but still a correctness and safety issue.

Current issue:

- `sessionTokenHash` stores the raw token value

Relevant file:

- [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:63)

## Needed Changes

### A. Actually Hash The Stored Token

Flow:

1. generate raw token
2. store hashed value in DB
3. send raw token to cookie/session
4. compare hashed incoming token on answer/submit

### B. Keep Cookie And Header Compatibility

Do not break current flow:

- cookie still works
- `sessionStorage` token still works

### C. Shorten Blast Radius

If the DB is inspected or leaked, raw exam session tokens should not be usable.

This is not the first must-do item before the exam, but it is a smart low-surface hardening change while touching the same routes.

## 6. Operational Visibility And Alerting

## Why It Matters

Even good code can fail under real live conditions if the team cannot see what is happening.

## Needed Changes

### A. Add Route-Level Metrics Logging

At minimum track:

- `/api/public-exam/start`
- `/api/public-exam/attempt/[attemptId]/answers`
- `/api/public-exam/attempt/[attemptId]/submit`
- `/api/public-exam/history`

Track:

- response time
- status code
- count

### B. Add Counters For Critical Failures

Count:

- save failures
- submit failures
- duplicate resume hits
- expired-attempt closures
- stale cleanup counts

### C. Keep Logs Focused

During the exam, noisy unrelated logs make live diagnosis harder.

Short-term recommendation:

- reduce avoidable noisy background error logs where possible
- especially repeated unrelated errors that flood PM2 logs

### D. Prepare One Live Dashboard View

Even if it is simple, the team should have one place to watch:

- request errors
- slow response spikes
- PM2 restarts
- DB CPU/connections
- count of active attempts

## 7. Live Exam Runbook And Support Controls

## Why It Matters

Live exam risk is also operational.

If a student says:

- “my answer is not saving”
- “my exam closed”
- “my next exam started twice”

the team needs a clear process.

## Needed Changes

### A. Prepare Support Commands

Before exam day, prepare exact commands for:

- PM2 status
- PM2 logs
- Nginx health
- DB active connections
- stale-attempt cleanup

### B. Prepare Support Actions

Document:

- how to identify duplicate attempts
- how to identify expired-but-open attempts
- how to verify a student’s last saved answers
- how to safely restart one ERP instance without killing the whole pool

### C. Freeze Non-Essential Changes

Near exam day:

- no unrelated deploys
- no schema churn except the exam changes
- no noisy feature toggles

### D. Pre-Exam Data Hygiene

Run before the exam:

- stale attempt cleanup
- verify active publishings
- verify paper/question counts
- verify no obvious bad data in current active exams

## 8. Release Safety And Load Validation

## Why It Matters

Scaling config alone does not prove the flow is safe.

## Needed Changes

### A. Full-Flow Load Test

Must test:

1. landing page burst
2. start burst
3. batched answer saves
4. final submit burst

### B. Manual Recovery Tests

Also test:

- browser refresh mid-exam
- tab close and resume
- expired attempt open after time limit
- duplicate start clicks
- submit with one pending save

### C. Slow Network Simulation

Important because real students will not all have clean connections.

Test:

- delayed save response
- delayed submit response
- intermittent save failure with retry

### D. Release Gate

Do not mark exam-ready until all of these are true:

- no stale `in_progress` attempts after cleanup
- duplicate-start behavior fixed
- batched autosave working
- expiry enforced on server
- result and history still function correctly
- realistic load test completed

## Prioritized Non-Server Changes

If you want the strongest risk reduction after server config, do them in this order:

1. attempt lifecycle control
2. batched autosave and submit flush
3. stale cleanup script
4. `ExamAttempt` indexes
5. result/history query trimming
6. operational metrics and live runbook
7. session token hashing

## Exact Structure To Keep

```text
src/
  app/
    exam-site/
      page.tsx
      attempt/[attemptId]/page.tsx
      result/[attemptId]/page.tsx

    api/
      public-exam/
        active/route.ts
        history/route.ts
        start/route.ts
        attempt/[attemptId]/answer/route.ts
        attempt/[attemptId]/answers/route.ts
        attempt/[attemptId]/submit/route.ts

  components/
    public-exam/
      ExamPlayer.tsx
      NextExamButton.tsx

  lib/
    public-exam/
      db.ts
      grading.ts
      attempts.ts
      metrics.ts

scripts/
  close-stale-public-exam-attempts.ts
  load-test/
    full-flow.js

docs/
  diagnosis-exam-runbook.md
```

## Final Conclusion

Once server configuration is handled, the other changes that most reduce risk are:

- make the server authoritative for attempt lifecycle
- remove one-request-per-click autosave
- stop duplicate active attempts
- close stale attempts automatically
- support the DB with the right indexes
- reduce unnecessary result/history query load
- prepare monitoring and an operator runbook

Those changes are what turn a scaled server into a safer live exam system instead of just a faster fragile one.
