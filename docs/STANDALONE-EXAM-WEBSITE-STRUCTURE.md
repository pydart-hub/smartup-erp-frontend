# Standalone Exam Website Structure

## What you want

You want the diagnosis exam to be:

- fully separate from Frappe
- opened from a button inside your current app
- attended on a public exam website
- saved into a new database
- not saved in Frappe at all

That is the correct approach for concurrent exam load.

---

## Core decision

Do not build the live exam flow on top of:

- `src/app/api/level-exams/*`
- `src/lib/server/frappeLevelExamStore.ts`
- `backend/level_exam/*`

Those are tied to Frappe-oriented execution.

Instead, build a new standalone exam system.

---

## Final architecture

### Current app responsibility

Your current SmartUp app should only:

- show staff dashboard
- show exam analytics
- show a button like `Open Exam Website`
- optionally show reports from the new exam DB

### New standalone exam website responsibility

The new website should:

- open public exam landing page
- take student name
- take class
- load active exam
- save answers
- submit result
- store data in new database

### New database responsibility

The new DB should store:

- active exams
- exam papers
- questions
- attempts
- answers
- results

---

## Where to add the button

Best places in the current app:

### Option 1: General Manager level exam page

File:

- `src/app/dashboard/general-manager/level-exams/page.tsx`

Add a new button near:

- `Publish Or Assign Exam`
- `Review Student Mapping`

New button:

- `Open Exam Website`

This button should link to:

- external site: `https://exam.yourdomain.com`
- or internal standalone route: `/exam-site`

### Option 2: Branch Manager diagnosis page

File:

- `src/app/dashboard/branch-manager/level-exams/page.tsx`

Add a staff utility card:

- `Open Public Exam Website`

### Option 3: Sidebar navigation

If you want permanent access, add a new nav item:

- label: `Exam Website`
- icon: `Microscope` or `BookOpen`
- href: external exam site or internal route

If you want wide access, update the nav constants, not only the sidebar renderer.

---

## Best route design

You have two clean choices.

### Choice A: Separate app

Recommended for true isolation.

```text
apps/
  smartup-admin/
  diagnosis-exam-site/
```

Use:

- `admin.smartup.com`
- `exam.smartup.com`

This is best for separation, scaling, and maintenance.

### Choice B: Same Next.js project, separate route group

Good if you want faster implementation.

```text
src/app/
  exam-site/
    page.tsx
    start/page.tsx
    attempt/[attemptId]/page.tsx
    result/[attemptId]/page.tsx
```

This is still okay if the APIs and DB are completely separate from Frappe.

---

## Recommended folder structure

If you keep it in this project:

```text
src/
  app/
    exam-site/
      page.tsx
      start/page.tsx
      attempt/[attemptId]/page.tsx
      result/[attemptId]/page.tsx

    api/
      public-exam/
        active/route.ts
        start/route.ts
        attempt/[attemptId]/route.ts
        attempt/[attemptId]/answer/route.ts
        attempt/[attemptId]/submit/route.ts
        attempt/[attemptId]/result/route.ts

  components/
    public-exam/
      ExamWebsiteHero.tsx
      StudentEntryForm.tsx
      ExamPlayer.tsx
      QuestionPanel.tsx
      QuestionPalette.tsx
      CountdownTimer.tsx
      SubmitExamDialog.tsx
      ResultSummary.tsx

  lib/
    public-exam/
      db.ts
      queries.ts
      service.ts
      grading.ts
      types.ts
      validators.ts
      session.ts
```

---

## New database structure

Use PostgreSQL.

### `public_exam_questions`

```text
id
subject_code
subject_name
class_level
question_text
difficulty
correct_option
explanation
is_active
created_at
updated_at
```

### `public_exam_question_options`

```text
id
question_id
option_key
option_text
display_order
```

### `public_exam_papers`

```text
id
title
subject_code
subject_name
class_level
duration_minutes
total_questions
total_marks
status
created_at
updated_at
```

### `public_exam_paper_questions`

```text
id
paper_id
question_id
display_order
marks
```

### `public_exam_publishings`

This is the live exam.

```text
id
slug
title
paper_id
class_level
subject_code
subject_name
duration_minutes
start_at
end_at
status
is_public
created_at
updated_at
```

### `public_exam_attempts`

```text
id
publishing_id
student_name
class_level
status
started_at
submitted_at
remaining_seconds
score_obtained
total_marks
percentage
correct_count
wrong_count
unanswered_count
paper_snapshot_json
result_snapshot_json
session_token_hash
created_at
updated_at
```

### `public_exam_attempt_answers`

```text
id
attempt_id
question_id
selected_option
answered_at
```

---

## Request flow

### 1. Staff clicks button

From current app:

- `Open Exam Website`

Opens:

- `https://exam.smartup.com`

### 2. Student enters details

Fields:

- student name
- class
- optional access code

### 3. Start attempt

API:

- `POST /api/public-exam/start`

Server:

1. find active exam for class
2. create attempt
3. copy paper into `paper_snapshot_json`
4. create session token
5. return `attemptId`

### 4. Student writes exam

Page:

- `GET /exam-site/attempt/[attemptId]`

Save answer API:

- `POST /api/public-exam/attempt/[attemptId]/answer`

Only save:

- attempt id
- question id
- selected option

Do not save full exam on each click.

### 5. Submit

API:

- `POST /api/public-exam/attempt/[attemptId]/submit`

Server:

1. load paper snapshot
2. load answers
3. grade
4. save final result snapshot
5. mark submitted

### 6. Result page

Page:

- `/exam-site/result/[attemptId]`

---

## Important separation rules

### Rule 1

No Frappe API call during live exam.

### Rule 2

No Frappe save during answer click.

### Rule 3

No Frappe save during submit.

### Rule 4

If ERP needs result later, sync asynchronously from the new DB.

### Rule 5

The attempt must carry its own paper snapshot so question edits later do not affect submitted results.

---

## What should stay in the current app

The current app can still provide:

- exam setup screen
- paper publishing screen
- results dashboard
- “open exam website” button

But those screens should read and write the new database, not Frappe.

So even admin should gradually move away from Frappe for diagnosis exams.

---

## Best implementation model

### Admin side

Inside current app:

- `src/app/dashboard/general-manager/standalone-exams/*`
- `src/app/dashboard/branch-manager/standalone-exams/*`

Use new DB only.

### Public side

Inside current app or separate app:

- `src/app/exam-site/*`

Use new DB only.

### Shared service

```text
src/lib/public-exam/
  db.ts
  service.ts
  grading.ts
  queries.ts
```

---

## Suggested page structure

### Public website

#### `/exam-site`

- hero
- instructions
- enter student name
- select class
- start exam

#### `/exam-site/attempt/[attemptId]`

- title
- timer
- question list
- next/previous
- save answer
- submit

#### `/exam-site/result/[attemptId]`

- score
- percentage
- correct / wrong / unanswered
- optional answer review

### Admin pages

#### `/dashboard/general-manager/standalone-exams`

- total active exams
- active attempts
- submitted attempts
- open exam website button

#### `/dashboard/general-manager/standalone-exams/papers`

- manage papers

#### `/dashboard/general-manager/standalone-exams/publish`

- publish class-wise exam

#### `/dashboard/general-manager/standalone-exams/results`

- result analytics

---

## Reuse from current codebase

Safe to reuse:

- `src/data/level-exams/subjects/*.json`
- `src/lib/types/levelExam.ts` as a base for new types
- `src/lib/utils/diagnosis.ts`

Do not reuse as execution path:

- `src/lib/server/frappeLevelExam.ts`
- `src/lib/server/frappeLevelExamStore.ts`
- `src/app/api/level-exams/*`
- `backend/level_exam/*`

---

## Best structure for your exact request

If I were implementing this for your project, I would use:

1. A new `Exam Website` button on the General Manager and Branch Manager diagnosis pages
2. A new public route group: `src/app/exam-site/*`
3. A new API namespace: `src/app/api/public-exam/*`
4. A new PostgreSQL schema only for standalone exams
5. Zero dependency on Frappe for diagnosis exam attendance

That gives you the cleanest and safest separation.
