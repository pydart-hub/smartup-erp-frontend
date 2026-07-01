# Diagnosis Exam Implementation Plan

Date: 2026-07-01

## Goal

Prepare the diagnosis exam system to handle a near-term high-concurrency exam event safely, with a target of around `800` simultaneous students.

This plan is based on:

- the current diagnosis exam code in this repo
- the current production deployment in [docs/Server Configuration.md](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/Server%20Configuration.md:1)
- the current readiness audit in [docs/DIAGNOSIS-EXAM-800-STUDENTS-READINESS-REPORT.md](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/DIAGNOSIS-EXAM-800-STUDENTS-READINESS-REPORT.md:1)
- the original standalone exam architecture notes in [docs/STANDALONE-EXAM-WEBSITE-STRUCTURE.md](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/docs/STANDALONE-EXAM-WEBSITE-STRUCTURE.md:1)

## Executive Recommendation

Use a two-track plan:

- `Track A`: best solution, move diagnosis exam to its own deployment
- `Track B`: minimum safe short-term fix if the exam is very near

If the exam is close, do `Track B` first and treat `Track A` as the follow-up stabilization plan.

## Decision

## Track A: Separate Exam Deployment

Use this if you can make DNS/Nginx/PM2 deployment changes before the exam.

Target:

- ERP stays on `smartuplearning.net`
- exam moves to `exam.smartuplearning.net`
- exam runs in its own PM2 app pool
- exam gets its own Nginx upstream
- exam can still use the same Postgres short term

This is the cleanest implementation because it isolates:

- public exam traffic
- autosave traffic
- submit bursts
- background ERP traffic

## Track B: Same Repo, Same Server, But Scale and Harden It

Use this if the exam is near and separation is not realistic in time.

Target:

- keep current `/exam-site`
- keep current repo and current database
- scale `smartup-erp` to multiple instances
- load-balance via Nginx
- fix exam correctness and request volume in code

This is weaker than Track A, but it is still a major improvement over the current single-process setup.

## Workstreams

This work breaks into 6 workstreams:

1. deployment isolation or clustering
2. exam expiry enforcement
3. duplicate-attempt prevention and stale-attempt cleanup
4. batched autosave
5. database indexing and schema hardening
6. load testing and release validation

## Workstream 1: Deployment Isolation Or Clustering

## Option A: Move To Separate Deployment

### Architecture

- current ERP stays at `https://smartuplearning.net`
- new public exam app served at `https://exam.smartuplearning.net`
- same codebase can still be used initially
- only the exam route group and public exam APIs need to be exposed there

### Practical Implementation

Create a second deployment directory on the server:

- `/var/www/smartup-exam`

Use the same repo initially:

- clone the same repo
- reuse the same `.env.local` base
- set `NEXT_PUBLIC_APP_URL=https://exam.smartuplearning.net`
- keep `STANDALONE_DATABASE_URL` pointing to the exam DB

Run the exam app under its own PM2 name:

- `smartup-exam`

Prefer cluster mode:

- `pm2 start npm --name smartup-exam -i 2 -- start`

If CPU allows, move to:

- `-i 4`

### Nginx Shape

Create an Nginx upstream for the exam service:

```nginx
upstream smartup_exam_upstream {
    least_conn;
    server 127.0.0.1:3100 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3101 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 127.0.0.1:8443 ssl;
    server_name exam.smartuplearning.net;

    location / {
        proxy_pass http://smartup_exam_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Repo-Level Impact

Short term, no route split is required if the app is dedicated to exam traffic by hostname and deployment.

Long term, create middleware/host rules so the exam deployment serves only:

- `/exam-site/*`
- `/api/public-exam/*`

and optionally a small admin/report subset.

## Option B: Cluster Existing ERP Deployment

If separate deployment is not possible, change the current single-instance ERP deployment.

### Current Problem

The live ERP app is one PM2 process on `3001`.

### Target

Run multiple app instances:

- `3001`
- `3002`
- `3003`
- `3004`

Note:

- `3002` may already be used by `stibe-crm` on your server, so choose free ports carefully
- use a clean dedicated ERP pool like `3001`, `3005`, `3006`, `3007`

### Suggested PM2 Layout

Run four explicit instances instead of one:

```bash
PORT=3001 pm2 start npm --name smartup-erp-1 -- start
PORT=3005 pm2 start npm --name smartup-erp-2 -- start
PORT=3006 pm2 start npm --name smartup-erp-3 -- start
PORT=3007 pm2 start npm --name smartup-erp-4 -- start
pm2 save
```

This is simpler than cluster mode when you want explicit upstream control.

### Suggested Nginx ERP Upstream

```nginx
upstream smartup_erp_upstream {
    least_conn;
    server 127.0.0.1:3001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3005 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3006 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3007 max_fails=3 fail_timeout=30s;
    keepalive 64;
}

server {
    listen 127.0.0.1:8443 ssl;
    server_name smartuplearning.net;

    location / {
        proxy_pass http://smartup_erp_upstream;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### Validation

After changing PM2 and Nginx:

- confirm all instances respond
- confirm Nginx config passes `nginx -t`
- confirm sticky exam behavior is not required

For your current implementation, sticky sessions are not required because:

- attempt identity is in DB
- exam token is sent via cookie/header
- no in-memory-only exam state is required for correctness

## Workstream 2: Server-Side Expiry Enforcement

## Problem

The exam currently relies mainly on the browser timer in [src/components/public-exam/ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:61).

That is not enough for correctness.

## Goal

Every server route must agree on whether an attempt is still valid.

## Files To Change

- [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:1)
- [src/app/api/public-exam/attempt/[attemptId]/answer/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/answer/route.ts:1)
- [src/app/api/public-exam/attempt/[attemptId]/submit/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/submit/route.ts:1)
- [src/app/exam-site/attempt/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/attempt/[attemptId]/page.tsx:1)
- [src/app/exam-site/result/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/result/[attemptId]/page.tsx:1)
- add helper in `src/lib/public-exam/attempts.ts` or `src/lib/public-exam/session.ts`

## Implementation Shape

Create a shared helper:

- `getAttemptExpiry(attempt, durationMinutes)`
- `isAttemptExpired(attempt, durationMinutes, now)`
- `ensureAttemptState(attempt)`

The logic should be:

1. `deadline = startedAt + durationMinutes`
2. if `now > deadline` and status is `in_progress`
3. mark attempt for forced closure

## Short-Term Behavior

For `answer` route:

- if expired, reject save with `409` or `400`
- optionally trigger auto-submit before returning

For `submit` route:

- if expired, still allow final closure flow, but mark it `auto_submitted`

For `attempt page`:

- if expired and still `in_progress`, force server-side close and redirect to result page

## Best Implementation

Add a helper like:

- `finalizeExpiredAttempt(attemptId)`

This function should:

1. load attempt
2. compute expiry
3. if not expired, return current state
4. if expired and still `in_progress`, grade and update status to `auto_submitted`

Use this helper in:

- attempt page
- answer route
- submit route
- result page

That keeps the logic consistent.

## Workstream 3: Prevent Duplicate Attempts And Clean Up Stale Attempts

## Problem

The current `start` route always creates a new attempt.

## Goal

Resume valid existing attempts instead of creating duplicates.

## Files To Change

- [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:1)
- [src/app/exam-site/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/page.tsx:97)
- add helper in `src/lib/public-exam/attempts.ts`

## Implementation Shape

Before `db.examAttempt.create(...)`, query for an existing active attempt:

- same `publishingId`
- same normalized `studentPhone`
- status `in_progress`
- not expired

If found:

- return that `attemptId`
- issue a fresh session token if needed
- do not create a new attempt

## Frontend Behavior

When the student presses Start:

- if the backend returns `resumed: true`, route them into the existing attempt
- show a message like `Resuming your current exam`

## Stale Attempt Cleanup

Add a server script:

- `scripts/close-stale-public-exam-attempts.ts`

This script should:

1. find all `in_progress` attempts
2. compute expiry from `startedAt` and publishing duration
3. auto-grade and convert expired ones to `auto_submitted`
4. print counts

Run it:

- once manually before exam day
- optionally on a cron during exam periods

## Optional Stronger Safeguard

Prisma cannot easily enforce a partial unique index for only active rows through schema alone.

If needed later, create a raw SQL partial unique index like:

- one active attempt per `studentPhone + publishingId` where status = `in_progress`

That is a good second-line protection, but the application logic fix should come first.

## Workstream 4: Replace Per-Click Save With Batched Debounced Save

## Problem

Current autosave is one network request per answer click.

## Goal

Send fewer writes without risking answer loss.

## Files To Change

- [src/components/public-exam/ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:1)
- add new route `src/app/api/public-exam/attempt/[attemptId]/answers/route.ts`
- optionally keep old single-answer route temporarily for backward compatibility

## API Design

Add new bulk route:

- `POST /api/public-exam/attempt/[attemptId]/answers`

Payload:

```json
{
  "answers": [
    { "questionId": "q1", "selectedOption": "A" },
    { "questionId": "q2", "selectedOption": "C" }
  ]
}
```

Server behavior:

1. validate session token once
2. validate attempt status once
3. validate expiry once
4. upsert all answers in one transaction

## Frontend Behavior

Inside `ExamPlayer`:

1. keep UI answer state immediately
2. keep `pendingAnswers` map in memory
3. debounce a flush every `2-3` seconds
4. flush immediately on:
   - next question
   - previous question
   - open submit modal
   - final submit
   - `visibilitychange`
   - `beforeunload`

## Reliability Rules

- do not allow final submit while there are unsent answers
- surface `Saving...`, `Saved`, and `Retrying...`
- if flush fails, retry automatically

## Suggested Refactor

Inside `ExamPlayer.tsx`, split responsibilities:

- `selectAnswerLocally(questionId, option)`
- `queuePendingAnswer(questionId, option)`
- `flushPendingAnswers()`
- `submitExam()`

This will make the component easier to reason about and test.

## Workstream 5: Database Indexes And Schema Hardening

## Problem

`ExamAttempt` is missing useful lookup indexes.

## Files To Change

- [prisma/schema.prisma](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/prisma/schema.prisma:94)
- create a Prisma migration

## Indexes To Add

In `ExamAttempt` add:

- `@@index([studentPhone])`
- `@@index([publishingId])`
- `@@index([status])`
- `@@index([createdAt])`
- `@@index([publishingId, status])`
- `@@index([studentPhone, createdAt])`

## Optional Additional Indexes

Depending on reporting patterns:

- `@@index([studentBranch, createdAt])`
- `@@index([classLevel, createdAt])`

## Session Token Hardening

The field is called `sessionTokenHash` but stores a raw token.

Change implementation:

1. generate raw token for cookie/client
2. hash token with SHA-256
3. store only the hash
4. compare hash of incoming token in save/submit routes

This is not the top scaling fix, but it is worth doing while touching these routes.

## Workstream 6: Load Testing

## Goal

Stop guessing before exam day.

## Recommended Tools

Use one of:

- `k6`
- `Artillery`
- `autocannon` for smaller route-focused checks

For realistic flow, `k6` is the best choice.

## Suggested Test Scripts

Create a new folder:

- `scripts/load-test/`

Suggested files:

- `scripts/load-test/open-exam.js`
- `scripts/load-test/start-exam.js`
- `scripts/load-test/save-answers.js`
- `scripts/load-test/submit-exam.js`
- `scripts/load-test/full-flow.js`

## Scenarios To Test

### Scenario 1: Landing Burst

- `800` users hitting `/exam-site`

Measure:

- page response
- static asset delivery
- error rate

### Scenario 2: Start Burst

- `800` students calling `/api/public-exam/start` in a short window

Measure:

- P95 latency
- DB CPU
- DB connections
- app CPU

### Scenario 3: Save Burst

- simulate `800` students answering `20` questions
- with new batched autosave logic

Measure:

- bulk save latency
- save failure rate
- retry behavior

### Scenario 4: Submit Burst

- many users submit within the same 2 to 5 minutes

Measure:

- submit success rate
- grading latency
- DB pressure

## Success Criteria

Before live exam, aim for:

- no 5xx spikes
- answer save failure rate close to zero
- stable response times under exam load
- no duplicate attempts created
- expired attempts auto-close correctly

## Release Order

## Phase 1: Must Do First

1. add shared expiry helper
2. prevent duplicate attempts in `start`
3. add bulk answers route
4. refactor frontend autosave to batch
5. add indexes

## Phase 2: Infrastructure

1. cluster ERP or create separate exam deployment
2. update Nginx upstreams
3. validate PM2 and Nginx

## Phase 3: Data Hygiene

1. add stale-attempt cleanup script
2. run cleanup in production
3. verify duplicate and stale attempt counts drop

## Phase 4: Validation

1. run load tests
2. tune instance count
3. tune Nginx upstream and timeouts if required

## Minimum Acceptable Short-Term Plan

If the exam is very near and only limited change is possible, do exactly this:

1. Scale `smartup-erp` to 3 or 4 instances.
2. Put `smartuplearning.net` behind an Nginx upstream pool.
3. Add server-side expiry checks to:
   - `start` resume logic
   - `answer` route
   - `submit` route
   - attempt page
4. Prevent duplicate active attempts in `start`.
5. Add bulk/debounced save.
6. Add the missing `ExamAttempt` indexes.
7. Run a stale-attempt cleanup script before the exam.
8. Run at least one realistic load test.

If only a subset can be done before the exam, the order should be:

1. clustering + Nginx pool
2. duplicate-attempt prevention
3. server-side expiry enforcement
4. batched autosave
5. indexes

## Exact Repo Changes Summary

### New Files

- `src/lib/public-exam/attempts.ts`
- `src/app/api/public-exam/attempt/[attemptId]/answers/route.ts`
- `scripts/close-stale-public-exam-attempts.ts`
- `scripts/load-test/full-flow.js`

### Existing Files To Update

- [prisma/schema.prisma](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/prisma/schema.prisma:94)
- [src/app/api/public-exam/start/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/start/route.ts:1)
- [src/app/api/public-exam/attempt/[attemptId]/answer/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/answer/route.ts:1)
- [src/app/api/public-exam/attempt/[attemptId]/submit/route.ts](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/api/public-exam/attempt/[attemptId]/submit/route.ts:1)
- [src/app/exam-site/attempt/[attemptId]/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/attempt/[attemptId]/page.tsx:1)
- [src/app/exam-site/page.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/app/exam-site/page.tsx:80)
- [src/components/public-exam/ExamPlayer.tsx](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/src/components/public-exam/ExamPlayer.tsx:1)

## Recommended Delivery Plan

## Day 1

- implement expiry helper
- implement duplicate-attempt prevention
- implement stale-attempt cleanup script

## Day 2

- implement bulk answers route
- refactor `ExamPlayer` to debounced batching
- add submit flush behavior

## Day 3

- add Prisma indexes and migrate
- run local and staging validation

## Day 4

- cluster ERP or deploy separate exam app
- configure Nginx upstream
- validate live routing

## Day 5

- run load test
- tune instance count and DB settings
- freeze exam release

## Final Recommendation

If you can separate the exam deployment before the event, do it.

If you cannot, the minimum short-term safe plan is:

- scale ERP to multiple instances
- add Nginx upstream balancing
- enforce expiry on the server
- resume existing active attempts instead of creating new ones
- batch autosave
- add indexes
- clean stale attempts
- load test before the exam

That is the shortest realistic path from the current architecture to something much safer for a live diagnosis exam event.
