# Diagnosis Exam Short-Term Structure

Date: 2026-07-01

## Situation

The exam is near.

A separate exam deployment is not realistic in time.

So the correct short-term strategy is:

- keep the same repo
- keep the same server
- keep `/exam-site`
- harden the current implementation
- scale `smartup-erp`
- reduce request volume
- enforce correctness on the server

This document is the exact short-term structure to follow.

## Main Goal

Make the current diagnosis exam flow stable enough for a near-term large exam event by fixing the highest-risk problems without doing a full platform split.

## Short-Term Architecture

## App Structure

Keep these parts:

- public exam pages under `src/app/exam-site/*`
- public exam APIs under `src/app/api/public-exam/*`
- Prisma/Postgres exam DB via `STANDALONE_DATABASE_URL`
- same Next.js codebase
- same domain and server

## Infrastructure Structure

Change the runtime structure from:

- one `smartup-erp` process

to:

- multiple `smartup-erp-*` instances
- one Nginx upstream pool in front of them

### Target Runtime Shape

```text
Cloudflare / Browser
    -> Nginx
    -> smartup_erp_upstream
       -> smartup-erp-1 :3001
       -> smartup-erp-2 :3005
       -> smartup-erp-3 :3006
       -> smartup-erp-4 :3007
    -> shared Postgres exam database
```

This is the minimum short-term safe shape.

## Required Work Areas

There are 6 short-term work areas:

1. scale Node instances
2. load-balance with Nginx
3. enforce server-side expiry
4. prevent duplicate attempts
5. batch answer saves
6. add indexes and clean stale attempts

## 1. Scale Node Instances

## Current Problem

Live exam traffic is currently concentrated into one process.

## Short-Term Fix

Run 3 or 4 ERP instances.

### Recommended PM2 Shape

Use explicit ports:

- `3001`
- `3005`
- `3006`
- `3007`

Do not use `3002` because that port may conflict with other services on the server.

### Suggested PM2 Names

- `smartup-erp-1`
- `smartup-erp-2`
- `smartup-erp-3`
- `smartup-erp-4`

### Why Explicit Instances

For short-term production control, explicit instances are better than guessing with a hidden cluster layout.

You can:

- verify each port directly
- verify Nginx upstream routing directly
- restart one instance without affecting all

## 2. Load-Balance With Nginx

## Current Problem

ERP traffic for `smartuplearning.net` is still proxied to a single `127.0.0.1:3001`.

## Short-Term Fix

Replace the single backend target with an upstream pool.

### Target Nginx Structure

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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Why This Helps

It spreads:

- page loads
- start requests
- save requests
- submit requests

across multiple Node processes instead of one.

## 3. Server-Side Expiry Structure

## Current Problem

The exam timer is mostly enforced in the browser.

That is not enough for a live exam.

## Short-Term Fix

Add one shared server-side expiry helper and use it everywhere.

### New Shared Logic

Create:

- `src/lib/public-exam/attempts.ts`

Put these helpers there:

- `getAttemptDeadline()`
- `isAttemptExpired()`
- `finalizeExpiredAttemptIfNeeded()`
- `validateActiveAttemptOrClose()`

### Routes That Must Use It

- `src/app/api/public-exam/start/route.ts`
- `src/app/api/public-exam/attempt/[attemptId]/answer/route.ts`
- `src/app/api/public-exam/attempt/[attemptId]/submit/route.ts`
- `src/app/exam-site/attempt/[attemptId]/page.tsx`
- `src/app/exam-site/result/[attemptId]/page.tsx`

### Behavior Rules

For `attempt` page:

- if expired and still `in_progress`, auto-close and redirect to result

For `answer` route:

- if expired, do not accept more answers
- auto-close before returning if needed

For `submit` route:

- if already expired but still open, close as `auto_submitted`

### Target State

No old attempt should remain `in_progress` past its deadline.

## 4. Duplicate Attempt Structure

## Current Problem

The current start route always creates a fresh attempt.

That causes duplicate active attempts.

## Short-Term Fix

Change the start flow to:

1. look up an existing active attempt
2. if one exists and is not expired, resume it
3. only create a new attempt if none exists

### File To Change

- `src/app/api/public-exam/start/route.ts`

### Match Rule

Search by:

- `publishingId`
- normalized `studentPhone`
- `status = in_progress`

Then pass the result through expiry validation.

### Return Shape

When resuming:

```json
{
  "attemptId": "...",
  "sessionToken": "...",
  "resumed": true
}
```

When newly created:

```json
{
  "attemptId": "...",
  "sessionToken": "...",
  "resumed": false
}
```

### Frontend Structure

In `src/app/exam-site/page.tsx`:

- if `resumed: true`, show a small resume message
- route back into the same attempt

## 5. Batched Autosave Structure

## Current Problem

Every answer click sends one request:

- `ExamPlayer.tsx`
- `/api/public-exam/attempt/[attemptId]/answer`

This is too chatty for a near high-concurrency exam.

## Short-Term Fix

Keep local answer updates instant, but send answers in batches.

### New API Route

Add:

- `src/app/api/public-exam/attempt/[attemptId]/answers/route.ts`

Payload:

```json
{
  "answers": [
    { "questionId": "q1", "selectedOption": "A" },
    { "questionId": "q2", "selectedOption": "C" }
  ]
}
```

### Server Logic

The route should:

1. validate token once
2. validate attempt state once
3. validate expiry once
4. upsert all answers in one Prisma transaction

### Frontend Structure In `ExamPlayer.tsx`

Replace the current per-click structure with:

- `answers` for local display state
- `pendingAnswers` for unsaved changes
- `flushPendingAnswers()` for network writes
- debounce timer for periodic flush

### Flush Triggers

Flush on:

- every `2-3` seconds
- next question
- previous question
- open submit modal
- final submit
- tab hidden
- page unload

### UX Rules

Show:

- `Saving...`
- `Saved`
- `Retrying...`
- `Unsaved`

Do not allow final submit while there are pending unsent answers.

## 6. Database Structure Changes

## Current Problem

`ExamAttempt` is missing helpful indexes.

## Short-Term Fix

Add indexes in [prisma/schema.prisma](/C:/Users/arjun/Desktop/Stibe/smartup-erp-frontend/prisma/schema.prisma:94).

### Required Indexes

Add to `ExamAttempt`:

- `@@index([studentPhone])`
- `@@index([publishingId])`
- `@@index([status])`
- `@@index([createdAt])`
- `@@index([publishingId, status])`
- `@@index([studentPhone, createdAt])`

### Why These Matter

They directly support:

- history lookup by phone
- duplicate active attempt lookup
- active/in-progress scan
- stale attempt cleanup
- reporting growth

## 7. Stale Attempt Cleanup Structure

## Current Problem

There are already stale `in_progress` attempts in production.

## Short-Term Fix

Add a cleanup script:

- `scripts/close-stale-public-exam-attempts.ts`

### Script Job

The script should:

1. fetch all `in_progress` attempts
2. compute deadline using publishing duration
3. auto-grade expired ones
4. mark them `auto_submitted`
5. print a summary

### When To Run It

- once before exam day
- once after code deploy
- optionally every few minutes on exam day if needed

## 8. Submit Structure

## Current Problem

Submit still grades inline.

That is acceptable for the near exam only if:

- autosave is batched
- expiry is enforced
- duplicate attempts are prevented

## Short-Term Fix

Keep inline grading for now, but make submit safer.

### Submit Rules

Before grading:

1. flush pending answers from frontend
2. validate token
3. validate active attempt state
4. validate expiry

Then:

5. fetch all answers
6. grade
7. update final row
8. clear cookie

### Important UI Rule

In `ExamPlayer.tsx`, the submit button should not proceed while a batch flush is still pending.

## 9. Short-Term Repo Structure

This is the structure you should keep for the near exam:

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
        attempt/[attemptId]/route.ts

  components/
    public-exam/
      ExamPlayer.tsx

  lib/
    public-exam/
      db.ts
      grading.ts
      attempts.ts

scripts/
  close-stale-public-exam-attempts.ts
  load-test/
    full-flow.js
```

## 10. Exact Short-Term Order Of Work

Do the work in this order.

## Phase 1: Correctness First

1. add shared expiry helper
2. update `start` to resume active attempts
3. update attempt page to auto-close expired attempts
4. update answer route to reject expired attempts
5. update submit route to finalize expired attempts safely

## Phase 2: Reduce Traffic

1. add bulk answers route
2. refactor `ExamPlayer.tsx` to debounced batching
3. force flush before submit

## Phase 3: Database Support

1. add `ExamAttempt` indexes
2. generate and apply Prisma migration
3. add stale cleanup script

## Phase 4: Infrastructure

1. create 3-4 PM2 ERP instances
2. update Nginx to upstream pool
3. validate all ports and routes

## Phase 5: Validation

1. run stale cleanup once
2. run realistic load test
3. verify:
   - no duplicate attempts
   - no old `in_progress` attempts
   - lower save request volume
   - stable submit behavior

## 11. Minimum Acceptable Structure

If time is extremely tight, the minimum acceptable structure before the exam is:

### Infrastructure

- 3 or 4 `smartup-erp` instances
- Nginx upstream load balancing

### Code

- server-side expiry helper
- duplicate-attempt resume in `start`
- bulk answer save route
- debounced answer flushing in `ExamPlayer`

### Database

- `ExamAttempt` indexes
- stale cleanup script run once

If these are not done, the current setup remains high-risk for a synchronized exam event.

## Final Short-Term Conclusion

Since separation is not realistic now, the right short-term structure is:

- same app
- same exam routes
- same DB
- multiple ERP app instances
- Nginx upstream balancing
- server-side expiry enforcement
- resume instead of duplicate start
- batched autosave
- indexed attempt table
- stale attempt cleanup before the live exam

That is the shortest realistic structure that materially reduces both server risk and exam-flow risk before the exam.
