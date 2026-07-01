# Diagnosis Exam 800-Student Readiness Report

Date: 2026-07-01

## Scope

This report is based on:

- frontend and exam code in this repo
- `docs/Server Configuration.md`
- direct live inspection of the production server at `76.13.244.60`
- direct live inspection of the diagnosis exam PostgreSQL database on that server

## Executive Verdict

No, the current production setup should not be considered safe for `~800` students starting and attending the diagnosis exam at the same time.

The main reason is not disk or database size. The main reason is architecture:

- all ERP and diagnosis exam traffic for `smartuplearning.net` goes through a single `smartup-erp` Node process on port `3001`
- the exam still performs one write request per answer click
- the submit flow still grades inline inside the request
- the timer is enforced mainly in the browser, not strongly on the server
- the system already has stale and duplicate `in_progress` attempts in production

The current system may work for moderate usage, but a synchronized burst of `800` students can realistically cause:

- slow exam start
- delayed autosave
- failed answer saves
- stuck submits near the end
- unfair timer behavior for students whose browser/session is interrupted

## Final Risk Rating

- Infrastructure risk for `800` simultaneous students: `High`
- Exam flow correctness risk: `High`
- Probability of partial slowdown during start/save/submit bursts: `High`
- Probability of full server crash: `Medium`

## Current Production Structure

## Domain and Server Path

- Public login: `https://smartuplearning.net/auth/login`
- Public exam path: `/exam-site`
- Production server: `76.13.244.60`
- ERP app directory: `/var/www/smartup-erp`
- ERP PM2 process name: `smartup-erp`

## Live Server Topology Observed

From the live server inspection:

- `smartup-erp` is a single PM2 process in `fork_mode`
- `smartup-erp` listens only on `3001`
- Nginx for `smartuplearning.net` proxies to `127.0.0.1:3001`
- the portal is spread across multiple PM2 processes (`3000`, `3010`, `3011`, `3012` and more process entries)
- ERP is not similarly load-balanced

This means the diagnosis exam is still funneled through one Node runtime.

## Current Server Health Snapshot

At inspection time:

- RAM looked healthy enough for the moment
- swap usage was `0`
- disk usage was healthy
- server uptime was short, around `14` minutes after reboot/restart
- `smartup-erp` restart count was `0` since the recent restart

This is better than the older audit in `docs/DIAGNOSIS-EXAM-LIVE-SERVER-AUDIT.md`, but it does not remove the scaling bottleneck. It only means the server was in a cleaner state at the moment of inspection.

## Diagnosis Exam Flow

## Actual User Flow

1. Student goes to login and then to `/exam-site`.
2. Frontend fetches active exams by class level.
3. Frontend fetches attempt history by phone number.
4. Student starts an exam through `/api/public-exam/start`.
5. Server loads the full paper and creates a per-student snapshot.
6. During the exam, every answer click sends a request to `/api/public-exam/attempt/[attemptId]/answer`.
7. Final submit calls `/api/public-exam/attempt/[attemptId]/submit`.
8. Submit fetches all answers, grades the attempt, and writes the final result inside the same request.

## Important Code Evidence

### Start Route Builds Full Snapshot Per Attempt

File: [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:18)

Relevant behavior:

- loads publishing, paper, questions, and options for every start
- builds `questionsSnapshot`
- creates a fresh `ExamAttempt`

This is heavy during a mass synchronized start.

### Every Answer Click Causes a DB Write

File: [src/components/public-exam/ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:110)

File: [src/app/api/public-exam/attempt/[attemptId]/answer/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/answer/route.ts:42)

Relevant behavior:

- selecting an option immediately calls `saveAnswerToDb()`
- the API performs `db.attemptAnswer.upsert(...)`

This creates a request and write for every click.

### Submit Grades Inline

File: [src/app/api/public-exam/attempt/[attemptId]/submit/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/submit/route.ts:46)

Relevant behavior:

- loads full paper snapshot
- fetches all answers
- grades immediately
- updates attempt immediately

This makes end-of-exam bursts expensive.

### Timer Is Primarily Client-Side

File: [src/components/public-exam/ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:81)

Relevant behavior:

- timer uses `Date.now()` in the browser
- auto-submit depends on the client calling submit

Server-side answer and submit routes do not enforce an expiry cutoff based on `startedAt + durationMinutes`.

### Attempt Page Also Allows Old In-Progress Attempts

File: [src/app/exam-site/attempt/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/attempt/[attemptId]/page.tsx:32)

Relevant behavior:

- page only checks `attempt.status !== "in_progress"`
- no server-side expiration check before showing the paper

### Start Route Allows Duplicate In-Progress Attempts

File: [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:66)

Relevant behavior:

- no lookup for an existing active attempt for the same student and publishing
- always creates a new attempt

### Frontend "Next Exam" Logic Ignores In-Progress Attempts

File: [src/app/exam-site/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/page.tsx:97)

Relevant behavior:

- only considers `submitted` and `auto_submitted` as completed
- does not block a new start when an old attempt is still `in_progress`

## Live Database Findings

Production database findings from the live server:

- total attempts: `67`
- submitted attempts: `52`
- in-progress attempts: `15`
- active publishings right now: `21`
- saved answers total: `972`
- attempts with saved answers: `56`

### Stale In-Progress Attempts Exist

Some `in_progress` attempts were already many hours old, including entries older than `1 day`.

This confirms the timer is not being strongly enforced by the server.

### Duplicate Attempts Exist

The live data already shows repeated `in_progress` attempts for the same student and the same publishing, started seconds apart.

That is a real production correctness issue, not just a theoretical risk.

## Database Index Findings

Production indexes currently observed:

- `ExamAttempt_pkey`
- `AttemptAnswer_pkey`
- `AttemptAnswer_attemptId_questionId_key`
- `ExamPublishing_pkey`
- `ExamPublishing_slug_key`

Missing useful indexes for scale:

- `ExamAttempt(studentPhone)`
- `ExamAttempt(publishingId)`
- `ExamAttempt(status)`
- `ExamAttempt(createdAt)`
- combined `ExamAttempt(publishingId, status)`
- combined `ExamAttempt(studentPhone, createdAt)`

Schema reference: [prisma/schema.prisma](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/prisma/schema.prisma:94)

## Will 800 Students Affect the Server or Exam Flow?

Yes.

`800` simultaneous students is enough to affect both the server and the exam flow on the current architecture.

## Why the Server Will Be Affected

### 1. Single ERP Runtime Bottleneck

All exam traffic goes to one `smartup-erp` process on `3001`.

That single process must handle:

- exam landing traffic
- active exam fetches
- history fetches
- start requests
- every answer save request
- every submit request
- all other ERP traffic happening at the same time

### 2. Start Burst Is Expensive

If `800` students start around the same time:

- each start loads the publishing and full paper structure
- each start creates a full snapshot row
- each start creates a new attempt and cookie/session state

That is a concentrated read-and-write spike.

### 3. Autosave Traffic Multiplies Fast

If a typical exam has `20-25` questions and students answer with one click each, `800` students can produce roughly:

- `16,000` to `20,000` answer-save requests

That estimate does not include:

- changed answers
- retries
- refreshes
- duplicate starts

### 4. Submit Burst Is Also Expensive

If many students submit around the same time:

- each submit loads all answers
- each submit parses the snapshot
- each submit grades in-process
- each submit updates final stats

That creates another synchronized spike near the end.

## Why the Exam Flow Will Be Affected

### 1. Answers Can Appear Saved But System Is Fragile Under Load

The UI shows saving state, but with one write per click, large bursts increase the chance of:

- delayed save confirmation
- unsaved state on slow network/server response
- last-second answer loss before submit

### 2. Timer Fairness Is Weak

Because expiry is mostly client-driven:

- a disconnected browser can leave attempts open
- stale attempts remain `in_progress`
- resuming behavior can become inconsistent
- fairness depends too much on the browser and tab lifecycle

### 3. Duplicate Active Attempts Are Already Happening

The current flow can create multiple active attempts for the same exam.

Under pressure, this can cause:

- student confusion
- split answers across attempts
- support/admin cleanup work
- incorrect reporting

## Detailed Issues and Fixes

## Critical Issues

### 1. Single-Instance ERP Deployment for Exam Traffic

Severity: `Critical`

Evidence:

- live Nginx for ERP proxies to `127.0.0.1:3001`
- live PM2 shows only one `smartup-erp`

Impact:

- single Node bottleneck
- slower response during exam bursts
- one process issue affects all exam users

Fix:

- best: move diagnosis exam to a dedicated deployment such as `exam.smartuplearning.net`
- minimum: run multiple ERP/exam instances and put them behind an Nginx upstream pool

### 2. No Strong Server-Side Time Expiry Enforcement

Severity: `Critical`

Evidence:

- client-side timer in [ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:81)
- answer route only checks `status` in [answer route](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/answer/route.ts:34)
- submit route only checks `status` in [submit route](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/submit/route.ts:38)
- live DB has stale `in_progress` attempts

Impact:

- fairness risk
- stale attempts never closing
- long-running attempts can continue beyond intended timer

Fix:

- compute expiry on the server from `startedAt + durationMinutes`
- reject answer saves after expiry
- auto-convert expired attempts to `auto_submitted` or `expired`
- block attempt page rendering after expiry

### 3. Duplicate In-Progress Attempts Are Allowed

Severity: `Critical`

Evidence:

- start route always creates a new attempt
- live DB already has duplicates for the same student/publishing

Impact:

- duplicated attempts
- answers split across attempts
- support burden
- unreliable reporting

Fix:

- before creating a new attempt, search for an active non-expired attempt for the same `studentPhone + publishingId`
- if found, resume it instead of creating a new one
- optionally enforce a DB-level uniqueness rule for active attempts

## High Issues

### 4. One Request Per Answer Click

Severity: `High`

Evidence:

- immediate `fetch` on every option click
- direct DB upsert in answer route

Impact:

- request explosion during exams
- heavy write amplification
- more chances for save latency and failure

Fix:

- store answer immediately in local state
- batch pending answers
- debounce save every `2-5` seconds
- flush on navigation, blur, submit, and visibility change
- add a bulk answers route

### 5. Inline Grading During Submit

Severity: `High`

Evidence:

- submit route does grading inside the request

Impact:

- end-of-exam spike becomes heavier
- more chance of slow or failed final submits

Fix:

- short term: keep inline but make submit idempotent and flush pending answers first
- better: two-stage submit
- mark `submitted_pending`
- return success quickly
- finalize grading in background

### 6. Missing Helpful Indexes on `ExamAttempt`

Severity: `High`

Evidence:

- live DB only has PK and minimal unique indexes
- schema has no supporting indexes on attempt lookup fields

Impact:

- slower history lookup
- slower active attempt lookup
- slower reporting as data grows

Fix:

- add indexes on `studentPhone`, `publishingId`, `status`, `createdAt`
- add combined indexes on `(publishingId, status)` and `(studentPhone, createdAt)`

## Medium Issues

### 7. Session Token Is Stored in Plain Form

Severity: `Medium`

Evidence:

- `sessionTokenHash = sessionToken` in [start route](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:63)
- schema field is named `sessionTokenHash` but currently stores raw token

Impact:

- misleading naming
- weaker security if DB is exposed

Fix:

- hash token before storing
- compare hashed incoming token on answer/submit routes

### 8. Shared ERP Runtime Still Handles Unrelated Workloads

Severity: `Medium`

Evidence:

- ERP logs show regular parent/payment/other traffic
- production host runs ERP, portal, CRM, worker, PostgreSQL, Redis, Nginx, and media-related services

Impact:

- exam performance competes with unrelated activity

Fix:

- isolate exam deployment
- if isolation is not possible, at least isolate exam process pool from ERP dashboards

### 9. Frappe 401 Errors Exist in ERP Logs

Severity: `Medium`

Evidence:

- repeated proxy `401` authentication errors in `smartup-erp` logs

Impact:

- not the main diagnosis bottleneck
- but it adds noise and background work inside the same ERP process

Fix:

- resolve Frappe credential/auth problems
- reduce unnecessary failing background/API calls before exam day

## Recommended Fix Plan

## Immediate Before the Exam

1. Move diagnosis exam to its own deployment if possible.
2. If not possible, run multiple exam/ERP instances and load-balance them.
3. Add server-side expiry enforcement.
4. Stop duplicate active attempts by resuming existing attempts.
5. Replace per-click save with batched/debounced save.
6. Add the missing indexes on `ExamAttempt`.
7. Clean up or auto-close stale `in_progress` attempts.
8. Run a real load test before the live exam.

## Minimum Acceptable Short-Term Plan

If the exam is very near and only limited work is possible, do at least this:

1. Scale `smartup-erp` to multiple instances.
2. Put ERP behind an Nginx upstream pool.
3. Add server-side expiry checks on answer and submit routes.
4. Prevent duplicate active attempts.
5. Batch answer saves.
6. Add indexes.

## Best Practical Architecture

- `smartuplearning.net` for ERP
- `exam.smartuplearning.net` for diagnosis exam
- dedicated PM2 app pool for exam
- dedicated Nginx upstream for exam
- same Postgres is acceptable short term, but separate exam DB is better long term
- optional Redis for shared cache and coordination if multiple app instances are used

## Load-Test Recommendation

Before going live, test all of these:

1. `800` students opening `/exam-site`
2. `800` students starting within a short window
3. ongoing mixed answer saves during the exam
4. synchronized submit near the end
5. forced auto-submit at time expiry

Measure:

- average latency
- P95 latency
- P99 latency
- answer save failure rate
- submit failure rate
- CPU and memory on app nodes
- Postgres CPU, locks, and connection count

## Bottom Line

Around `800` students attending the diagnosis exam at the same time will very likely affect both the server and the exam flow on the current setup.

The biggest blockers are:

- single ERP app instance
- per-click answer writes
- inline submit grading
- weak server-side time enforcement
- duplicate active attempts already happening in production

If you want, the next step can be one of these:

1. I can convert this report into an implementation checklist with exact code tasks.
2. I can start fixing the highest-priority exam issues in this repo.
3. I can prepare the PM2 and Nginx scaling commands for the production server.
