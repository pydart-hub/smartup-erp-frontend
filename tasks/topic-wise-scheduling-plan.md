# Topic-Wise Scheduling Plan

## Problem Statement

**Current system (Subject-wise):**
- BM creates a Course Schedule → picks **Subject** (e.g., "Mathematics") → optionally picks **one Topic**
- Bulk creation creates N schedules (one per matching date), ALL with the **same topic** (or no topic)
- Topics are just optional metadata — not the unit of scheduling

**Desired system (Topic-wise):**
- Each day's session should be a **specific topic** from the ordered topic list
- When creating bulk schedules, topics should **auto-advance** in sequence — Day 1 = Topic 1, Day 2 = Topic 2, etc.
- The calendar should prominently show **which topic** is scheduled on each day

---

## Current Data Model

```
Program (e.g., "10th State")
  └── Course (subject, e.g., "Mathematics")
        └── Program Topic (ordered list via sort_order)
              ├── Topic #1: "Real Numbers"        (sort_order: 1)
              ├── Topic #2: "Polynomials"          (sort_order: 2)
              ├── Topic #3: "Linear Equations"     (sort_order: 3)
              └── ...

Course Schedule (one record = one session on one day)
  ├── student_group: "CHL-10th-25-1"
  ├── course: "Mathematics"           ← the subject
  ├── instructor: "INS-001"
  ├── schedule_date: "2026-04-14"
  ├── from_time / to_time
  ├── custom_topic: "Real Numbers"    ← optional, single topic
  └── custom_topic_covered: 0 | 1    ← auto-marked on attendance
```

---

## Proposed Changes

### 1. Bulk Create: Auto-Assign Topics in Sequence

**Current behavior:**  
`bulkCreateCourseSchedules({ course, custom_topic, dates })` → creates N schedules, ALL same topic.

**New behavior:**  
`bulkCreateCourseSchedules({ course, dates, topicMode })` → creates N schedules with sequential topics:

```
Mode: "sequential" (new default when topics exist)
────────────────────────────────────────────────
dates = [Apr 14, Apr 15, Apr 16, Apr 17, Apr 18, ...]
topics = [Real Numbers, Polynomials, Linear Equations, ...]

Result:
  Apr 14 → custom_topic = "Real Numbers"
  Apr 15 → custom_topic = "Polynomials"
  Apr 16 → custom_topic = "Linear Equations"
  Apr 17 → custom_topic = "Pair of Linear Equations"
  Apr 18 → custom_topic = "Quadratic Equations"
  ...

If dates > topics → remaining dates get NO topic (or cycle, configurable)
If dates < topics → only first N topics assigned
```

```
Mode: "single" (legacy behavior)
────────────────────────────────
All dates get the same custom_topic (or none).
```

### 2. Bulk Form UI Changes

**Current form:**
```
[ Student Group ▾ ]
[ Course ▾ ]
[ Topic ▾ ]          ← single topic dropdown, applies to ALL dates
[ Instructor ▾ ]
[ Date Range + Day Toggles ]
```

**New form:**
```
[ Student Group ▾ ]
[ Course ▾ ]
[ Topic Assignment ] ← NEW: Radio toggle
    ○ Auto-assign topics in order    (sequential — recommended)
    ○ Same topic for all days        (single — legacy)
    ○ No topic assignment            (none)

[ If "sequential" selected ]:
    ┌─────────────────────────────────────────────────────┐
    │ Topic Preview (read-only):                          │
    │  Day 1 (Mon 14 Apr) → Real Numbers                  │
    │  Day 2 (Tue 15 Apr) → Polynomials                   │
    │  Day 3 (Wed 16 Apr) → Linear Equations               │
    │  Day 4 (Thu 17 Apr) → Pair of Linear Equations       │
    │  ...                                                 │
    │  ⚠ 3 dates exceed topic count — will have no topic   │
    └─────────────────────────────────────────────────────┘
    [ Start from topic # ]: [1 ▾]   ← offset picker (skip already covered)

[ If "single" selected ]:
    [ Topic ▾ ]       ← same as current

[ Instructor ▾ ]
[ Date Range + Day Toggles ]
```

### 3. API Layer Changes

**`courseSchedule.ts` — `bulkCreateCourseSchedules()`:**

```typescript
// UPDATED payload
interface BulkSchedulePayload {
  student_group: string;
  course: string;
  instructor: string;
  room?: string;
  from_time: string;
  to_time: string;
  custom_branch?: string;
  class_schedule_color?: string;
  dates: string[];

  // NEW: topic assignment mode
  topicMode?: "sequential" | "single" | "none";
  custom_topic?: string;            // used when topicMode = "single"
  topicSequence?: string[];         // used when topicMode = "sequential"
                                    // ordered topic names, one per date
}
```

**Logic in `bulkCreateCourseSchedules()`:**
```
for (i = 0; i < dates.length; i++) {
  let topic = undefined;
  if (topicMode === "single") topic = custom_topic;
  if (topicMode === "sequential") topic = topicSequence?.[i] ?? undefined;
  
  await createScheduleForce({ ...base, schedule_date: dates[i], custom_topic: topic });
}
```

### 4. Single Schedule Form (No Change Needed)

The single-schedule form (`/course-schedule/new`) already lets you pick one topic per session. This is fine — it's for ad-hoc scheduling.

### 5. Calendar Display Enhancement

**Current:** Shows `Course Name` prominently, topic as small text below.

**Proposed:** When a topic exists, show it **prominently**:
```
┌────────────────────────────────┐
│ 📖 Real Numbers                │  ← topic as primary text
│    Mathematics • Ms. Priya     │  ← subject + instructor secondary
│    🕐 09:00 – 10:30            │
│    👥 CHL-10th-25-1 • 📍 Room  │
│    ✅ Covered                   │  ← if marked
└────────────────────────────────┘
```

### 6. Skip Already-Covered Topics (Smart Start)

When creating bulk schedules with sequential mode:
1. Fetch existing schedules for this (batch, course) in the date range
2. Count how many topics are already covered (`custom_topic_covered = 1`)
3. Default the "Start from topic #" to the first uncovered topic
4. Show a hint: "Topics 1–5 already covered. Starting from Topic #6"

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/api/courseSchedule.ts` | Update `BulkSchedulePayload` type, update `bulkCreateCourseSchedules()` loop logic |
| `src/app/dashboard/branch-manager/course-schedule/bulk/page.tsx` | Add topic mode toggle, topic preview list, start-offset picker, pass `topicSequence` |
| `src/app/dashboard/branch-manager/course-schedule/page.tsx` | (Optional) Enhance `ScheduleCard` to show topic more prominently |
| `src/app/dashboard/instructor/course-schedule/page.tsx` | (Optional) Enhance `SessionRow` to show topic more prominently |

**No backend changes needed** — the `custom_topic` field already exists on Course Schedule. We're just changing how the frontend assigns topics during bulk creation.

---

## Implementation Phases

### Phase 1: Core (Minimum Viable)
1. Update `BulkSchedulePayload` and `bulkCreateCourseSchedules()` to support `topicSequence`
2. Add "Sequential Topics" toggle to bulk form
3. Show topic-to-date preview table
4. Pass sequential topics on submit

### Phase 2: Smart Defaults
5. Auto-detect covered topics and suggest starting offset
6. Add "Start from topic #" picker

### Phase 3: Display Polish
7. Enhance ScheduleCard/SessionRow to show topic prominently
8. Add topic name to week/calendar view tooltips

---

## Example Flow (After Implementation)

1. BM goes to **Bulk Create Schedule**
2. Selects **Student Group**: "CHL-10th-25-1" → Program = "10th State"
3. Selects **Course**: "Mathematics"
4. System fetches 15 Program Topics for (10th State, Mathematics), ordered by sort_order
5. Topic Assignment shows **"Auto-assign in order"** (selected by default)
6. Preview shows:
   ```
   Mon 14 Apr → Real Numbers
   Tue 15 Apr → Polynomials
   Wed 16 Apr → Linear Equations
   Thu 17 Apr → Pair of Linear Equations
   Fri 18 Apr → Quadratic Equations
   Mon 21 Apr → Arithmetic Progressions
   ...
   ```
7. Selects **Instructor**, confirms **Date Range** and **Days**
8. Clicks **Create Schedules**
9. System creates 15 Course Schedules, each with the corresponding topic
10. Calendar shows each day with its specific topic name

---

## Decisions (Confirmed)

1. **When dates > topics**: Remaining days get **no topic** (empty). Do NOT cycle/repeat.
2. **Multi-topic days**: No. One session per subject per day per batch.
3. **Smart start**: Yes — auto-detect already-covered topics, default start to next uncovered topic.
4. **Instructor form**: Yes — show suggested "next uncovered topic" in instructor's single-schedule form too.

---

## Final Structure

### Data Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BULK CREATE FLOW                             │
│                                                                      │
│  1. BM selects: Batch → Course (subject) → Instructor               │
│  2. System fetches: Program Topics for (program, course)             │
│     → ordered list: [T1, T2, T3, T4, T5, T6, ...]                   │
│  3. System fetches: Existing schedules for (batch, course)           │
│     → finds T1, T2, T3 already covered                              │
│  4. Smart Start: defaults to Topic #4 (first uncovered)              │
│  5. BM selects: Date Range + Day toggles → matching dates            │
│  6. Preview table shown:                                             │
│     ┌──────────────┬─────────────────────────────┐                   │
│     │ Mon 14 Apr   │ T4: Pair of Linear Equations │                  │
│     │ Tue 15 Apr   │ T5: Quadratic Equations      │                  │
│     │ Wed 16 Apr   │ T6: Arithmetic Progressions  │                  │
│     │ Thu 17 Apr   │ (no topic — list exhausted)  │                  │
│     └──────────────┴─────────────────────────────┘                   │
│  7. BM clicks Create → N schedules created, each with its topic      │
└──────────────────────────────────────────────────────────────────────┘
```

### API Types

```typescript
// courseSchedule.ts

interface BulkSchedulePayload {
  student_group: string;
  course: string;
  instructor: string;
  room?: string;
  from_time: string;
  to_time: string;
  custom_branch?: string;
  class_schedule_color?: string;
  dates: string[];

  // Topic assignment
  topicMode: "sequential" | "single" | "none";
  custom_topic?: string;        // only when topicMode = "single"
  topicSequence?: string[];     // only when topicMode = "sequential"
                                // topicSequence[i] = topic for dates[i]
                                // undefined entries = no topic for that date
}
```

### Bulk Create Logic

```typescript
// Inside bulkCreateCourseSchedules()
for (let i = 0; i < dates.length; i++) {
  let topic: string | undefined;
  
  if (payload.topicMode === "single")     topic = payload.custom_topic;
  if (payload.topicMode === "sequential") topic = payload.topicSequence?.[i];
  // topicMode === "none" → topic stays undefined

  await createScheduleForce({
    ...base,
    schedule_date: dates[i],
    custom_topic: topic,
  });
}
```

### Smart Start Logic (Frontend)

```typescript
// In bulk form component
async function computeSmartStart(batch: string, course: string, program: string) {
  // 1. Fetch all Program Topics for (program, course), ordered by sort_order
  const allTopics = await getProgramTopics(program, course);

  // 2. Fetch existing schedules for (batch, course) with custom_topic_covered = 1
  const existingSchedules = await getCourseSchedules({
    student_group: batch,
    // no date filter — check all time
    limit_page_length: 500,
  });

  // 3. Find covered topic names
  const coveredTopics = new Set(
    existingSchedules.data
      .filter(s => s.course === course && s.custom_topic && s.custom_topic_covered === 1)
      .map(s => s.custom_topic)
  );

  // 4. Find first uncovered topic index
  const startIndex = allTopics.findIndex(t => !coveredTopics.has(t.topic));
  
  return {
    allTopics,
    coveredCount: coveredTopics.size,
    startIndex: startIndex === -1 ? allTopics.length : startIndex,
  };
}
```

### Bulk Form UI Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Bulk Create Schedules                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Day Toggles ──────────────────────────────────────────────┐  │
│ │ [S] [M] [T] [W] [T] [F] [S]                               │  │
│ │ Presets: Weekdays | Weekend | Mon only | Clear             │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Date Range ───────────────────────────────────────────────┐  │
│ │ Start Date: [_________]    End Date: [_________]           │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Session Details ──────────────────────────────────────────┐  │
│ │ Student Group: [▾ CHL-10th-25-1        ]                   │  │
│ │ Course:        [▾ Mathematics           ]                   │  │
│ │ Instructor:    [▾ Ms. Priya             ]                   │  │
│ │ Room:          [▾ Offline               ]                   │  │
│ │ Time:          [09:00] → [10:30]                           │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│ ┌─ Topic Assignment ─────────────────────────────────────────┐  │
│ │                                                             │  │
│ │  (●) Auto-assign topics in order                           │  │
│ │  ( ) Same topic for all days                               │  │
│ │  ( ) No topics                                             │  │
│ │                                                             │  │
│ │  ┌─ Smart Start ────────────────────────────────────────┐  │  │
│ │  │ ℹ Topics 1–3 already covered. Starting from #4.     │  │  │
│ │  │ Start from topic: [▾ #4 Pair of Linear Equations ]   │  │  │
│ │  └─────────────────────────────────────────────────────┘  │  │
│ │                                                             │  │
│ │  ┌─ Preview ────────────────────────────────────────────┐  │  │
│ │  │  # │ Date           │ Topic                          │  │  │
│ │  │ ───┼────────────────┼───────────────────────────── │  │  │
│ │  │  1 │ Mon 14 Apr     │ Pair of Linear Equations      │  │  │
│ │  │  2 │ Tue 15 Apr     │ Quadratic Equations           │  │  │
│ │  │  3 │ Wed 16 Apr     │ Arithmetic Progressions       │  │  │
│ │  │  4 │ Thu 17 Apr     │ Triangles                     │  │  │
│ │  │  5 │ Fri 18 Apr     │ Coordinate Geometry           │  │  │
│ │  │  6 │ Mon 21 Apr     │ Introduction to Trigonometry  │  │  │
│ │  │  … │ …              │ …                             │  │  │
│ │  │ 14 │ Fri 02 May     │ (no topic)                    │  │  │
│ │  │ 15 │ Mon 05 May     │ (no topic)                    │  │  │
│ │  └─────────────────────────────────────────────────────┘  │  │
│ │  ⚠ 2 dates have no topic (topic list exhausted)           │  │
│ └────────────────────────────────────────────────────────────┘  │
│                                                                 │
│                              [ Create 15 Schedules ]            │
└─────────────────────────────────────────────────────────────────┘
```

### Instructor Single-Form Enhancement

```
┌─ Topic ──────────────────────────────────────────────────────────┐
│ [▾ Select topic...                                    ]          │
│                                                                  │
│ 💡 Suggested: "Pair of Linear Equations" (#4)                    │
│    (Topics 1–3 already covered for this batch)                   │
└──────────────────────────────────────────────────────────────────┘
```

Also add to BM single-schedule form (`/course-schedule/new`):
- Same "suggested next topic" hint below the topic dropdown

### Calendar Display (Enhanced)

```
Current ScheduleCard:                 New ScheduleCard:
┌──────────────────────┐             ┌──────────────────────────────┐
│ 📖 Mathematics       │             │ 📖 Pair of Linear Equations  │ ← topic primary
│ 👤 Ms. Priya         │             │    Mathematics • Ms. Priya   │ ← course+instr secondary
│ 📝 Real Numbers      │             │    🕐 09:00 – 10:30          │
│ 🕐 09:00 – 10:30     │             │    👥 CHL-10th-25-1          │
│ 👥 CHL-10th-25-1     │             │    ✅ Covered                │ ← if marked
└──────────────────────┘             └──────────────────────────────┘

When NO topic assigned → keep current layout (course as primary)
```

---

## Files to Modify (Final List)

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/api/courseSchedule.ts` | Update `BulkSchedulePayload`, update loop in `bulkCreateCourseSchedules()` |
| 2 | `src/app/dashboard/branch-manager/course-schedule/bulk/page.tsx` | Topic mode radio, smart start logic, preview table, pass topicSequence |
| 3 | `src/app/dashboard/branch-manager/course-schedule/new/page.tsx` | Add "suggested next topic" hint below topic dropdown |
| 4 | `src/app/dashboard/branch-manager/course-schedule/page.tsx` | Enhance ScheduleCard — topic as primary when present |
| 5 | `src/app/dashboard/instructor/course-schedule/new/page.tsx` | Add "suggested next topic" hint below topic dropdown |
| 6 | `src/app/dashboard/instructor/course-schedule/page.tsx` | Enhance SessionRow — topic as primary when present |

**No backend/Frappe changes needed.**

---

## Implementation Order

```
Phase 1 — Core Bulk Logic         (files 1, 2)
Phase 2 — Smart Start + Hints     (files 2, 3, 5)
Phase 3 — Display Enhancement     (files 4, 6)
```

**Status: AWAITING USER COMMAND TO IMPLEMENT.**
