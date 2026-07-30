# 🎯 Work Assignment Feature - REVISED STRUCTURE

**Status**: Design Phase - Updated with Simplified Requirements  
**Version**: 2.0 (Simplified)  
**Created**: May 12, 2026  
**Changes from v1**: 
- ❌ Removed "unique topic" requirement (now just a label)
- ❌ Removed Email & WhatsApp notifications (dashboard only)
- ✅ Simplified to core MVP features
---

## 📋 Updated Requirements Summary

### What Changed?

| Item | v1 (Original) | v2 (Simplified) | Impact |
|------|---------------|-----------------|--------|
| **Topic Field** | Unique per instructor | Just a label (optional) | 🔄 Remove uniqueness validation |
| **Email Notif** | Yes (for all triggers) | ❌ No | 🟢 Remove email logic |
| **WhatsApp Notif** | Yes (for all triggers) | ❌ No | 🟢 Remove WhatsApp logic |
| **Dashboard Notif** | Yes | Yes ✅ | ✅ Keep only this |
| **Complexity** | Higher | Lower ✅ | 🟢 Simpler implementation |
| **Implementation Time** | 4-5 weeks | 2-3 weeks 🟢 | 🟢 Faster delivery |

---

## 🎯 Core Feature (MVP Only)

### What the Feature Does

**GM assigns work/tasks to instructors with simple tracking:**

1. **GM creates assignment** (once per batch/class)
   - Title (e.g., "Q2 Assessment Preparation")
   - Description (what needs to be done)
   - Topic/Subject (just for reference, e.g., "Math")
   - General deadline (all instructors: same deadline)
   - Select instructors to assign

2. **Each instructor gets notified** (dashboard only 🔔)
   - See assignment on their dashboard
   - Click to view details

3. **Instructor uploads work** 
   - Before deadline: upload Google Drive link
   - After deadline: cannot upload (blocked)

4. **GM reviews submissions**
   - See all instructor submissions in one place
   - Approve or Reject each one
   - Add remarks if needed

5. **Track status**
   - Pending / Submitted / Approved / Rejected
   - Simple progress tracking

---

## 📋 Simplified Doctypes

### Doctype 1: **Work Assignment** (Parent)

```
Doctype Name: "Work Assignment"
Module: "Academic"
Is Submittable: True
Naming: AUTO (WA-001, WA-002, etc.)
```

**Fields**:
```
Section: Basic Information
  □ title              String(150)    | "Q2 Assessment Preparation"
  □ description        Text           | What needs to be done
  □ topic              String(50)     | "Math" (just a label, not unique)
  □ created_by         Link:User      | Auto-filled (GM who created)
  □ created_on         Date           | Auto-filled

Section: Scope & Deadline
  □ for_branch         Link:Company   | Branch this applies to
  □ academic_year      Link:Academic  | "2025-2026"
  □ deadline           Date           | All instructors have SAME deadline
  □ enabled            Checkbox       | Disable/enable

Section: Status (Read-only)
  □ workflow_state     Select         | "Draft" → "Active" → "Completed"
  □ status             Select         | "Active" / "Completed" / "Cancelled"
  □ total_assigned     Int(Formula)   | COUNT(assignments[])
  □ submitted_count    Int(Formula)   | COUNT(assignments[status="Submitted"])
  □ approved_count     Int(Formula)   | COUNT(assignments[approval_status="Approved"])
  
Section: Optional
  □ instructions_file  Attachment     | PDF/Doc for reference (optional)
  □ reference_link     String         | URL reference (optional)
```

---

### Doctype 2: **Work Assignment Detail** (Child Table)

Embedded in Work Assignment.

**Fields**:
```
Section: Instructor Assignment
  □ idx                Int            | Line number (auto)
  □ instructor         Link:Instructor| The instructor assigned
  □ instructor_name    String(Formula)| Auto-filled
  □ employee           Link:Employee  | Auto-fetched
  □ department         String         | Auto-filled

Section: Submission & Approval (Main)
  □ submission_status  Select         | "Pending" → "Submitted" → "Approved"/"Rejected"
  □ google_drive_link  Text           | https://drive.google.com/file/...
  □ submitted_on       Datetime       | When submitted
  □ submitted_by       Link:User      | Who submitted (auto-filled)

Section: Approval
  □ approval_status    Select         | "Pending" / "Approved" / "Rejected"
  □ approved_by        Link:User      | Who approved
  □ approval_date      Datetime       | When approved
  □ approval_remarks   Text           | Comments (optional)
  □ rejection_reason   Text           | Why rejected (if rejected)
  □ can_resubmit       Checkbox       | Allow resubmit after rejection
```

**Notable Removals**:
- ❌ `unique_topic` field (topic is on parent only)
- ❌ `assignment_deadline` field (use parent deadline for all)
- ❌ `priority` field (simplified MVP)
- ❌ `estimated_hours` field (simplified MVP)

---

## 🔄 Simplified Workflow Flow

### 5-Step Process

```
STEP 1: GM Creates Assignment (DRAFT)
└─ Title: "Q2 Assessment Preparation"
└─ Topic: "Math" (just label, shared by all)
└─ Deadline: "2026-06-30" (same for all instructors)
└─ Adds instructors list (Aleesha, Raghu, Priya)
└─ Status: DRAFT

STEP 2: GM Submits (ACTIVE)
└─ Click [Submit]
└─ Status → ACTIVE
└─ 🔔 Dashboard notification created for each instructor
    (NO email, NO WhatsApp - dashboard only)
└─ Instructors see assignment on dashboard

STEP 3: Instructors Submit Work (SUBMITTED)
├─ Instructor clicks assignment
├─ Sees: Title, Description, Topic, Deadline (same for all)
├─ Before deadline: Can upload Google Drive link
├─ After deadline: BLOCKED (cannot upload)
├─ Click [Submit Work]
└─ Status → SUBMITTED
└─ 🔔 Dashboard notification to GM (new submission)

STEP 4: GM Reviews & Approves (APPROVED/REJECTED)
├─ GM sees assignment page with submissions table
├─ Clicks on instructor row
├─ Opens Google Drive link (review work)
├─ Clicks [✅ Approve] OR [❌ Reject]
├─ Optional remarks/reason
└─ Status → APPROVED or REJECTED
└─ 🔔 Dashboard notification to instructor (if GM chooses)

STEP 5: Complete & Close (COMPLETED)
└─ When all are approved or rejected
└─ Status → COMPLETED
└─ Archive assignment
└─ 🔔 Optional: Notification to GM (done)
```

### State Diagram (Simplified)

```
Draft ──[Submit]──> Active ──[Submissions]──> Awaiting Approval

Awaiting Approval:
├─ [Approve] ──> Approved ──> (check all) ──> Completed
├─ [Reject] ──> Rejected ──> (can allow resubmit)
└─ (can request resubmit)

Overdue State:
└─ Auto-detect if deadline passed & pending
└─ Mark as "Overdue Pending"
```

---

## 🔔 Notification Strategy (SIMPLIFIED)

### Dashboard Only (No Email/WhatsApp)

| Trigger | Recipient | Dashboard Message |
|---------|-----------|-------------------|
| **Assignment Submitted (GM creates & activates)** | All assigned instructors | "New work assignment: {title}" |
| **Instructor Submits Work** | GM | "{Instructor name} submitted {title}" |
| **Work Approved by GM** | Instructor (optional) | "Your work has been APPROVED ✅" |
| **Work Rejected by GM** | Instructor (optional) | "Your work was REJECTED ❌" |
| **Assignment Complete** | GM (optional) | "Assignment {id} is complete" |

### Implementation

**Dashboard notifications only:**
```python
# When assignment submitted by GM
frappe.new_doc({
  "doctype": "Notification Log",
  "for_user": instructor_email,
  "type": "Alert",
  "subject": f"New Work Assignment: {title}",
  "document_type": "Work Assignment",
  "document_name": "WA-001",
  "link": "/app/my-assignments/WA-001"
}).insert()
```

**No email templates, no WhatsApp logic needed.**

---

## 📱 Frontend Components (Simplified)

### Pages to Build

```
GM Dashboard:
├─ /dashboard/general-manager/work-assignments/
│  ├─ LIST: All assignments (searchable, filterable by status/branch)
│  ├─ CREATE: Create new assignment form
│  ├─ DETAIL: View assignment + submissions table
│  └─ REVIEW: (inline on detail page, no modal)
│
Instructor Dashboard:
├─ /dashboard/instructor/my-assignments/
│  ├─ LIST: My active assignments (deadline badges)
│  └─ DETAIL: View assignment + submit form
```

### Components to Build

```
src/components/work-assignments/

1. WorkAssignmentForm.tsx
   ├─ Title input
   ├─ Description text area
   ├─ Topic input (optional, just label)
   ├─ For Branch selector
   ├─ General Deadline date picker
   ├─ Instructors table (add/remove)
   ├─ [Save Draft] [Submit] buttons
   └─ Validation

2. WorkAssignmentList.tsx (GM)
   ├─ Search & filters
   ├─ Table: ID, Title, Topic, Branch, Status, Progress
   ├─ Progress: "2/5 Approved"
   ├─ [View] [Edit] buttons
   └─ Sorting

3. WorkAssignmentDetail.tsx (GM Review)
   ├─ Assignment info (read-only)
   ├─ Submissions table:
   │  ├─ Instructor name
   │  ├─ Status badge
   │  ├─ Google Drive link (button)
   │  ├─ Submitted date
   │  ├─ [View Link] button
   │  ├─ [Approve] [Reject] buttons (inline)
   │  └─ Remarks text area
   └─ Progress bar

4. InstructorAssignmentList.tsx
   ├─ List of assigned work
   ├─ Title, Topic, Status, Deadline
   ├─ Deadline countdown (RED/ORANGE/GRAY)
   ├─ [View] buttons
   └─ Empty state

5. InstructorAssignmentDetail.tsx
   ├─ Assignment info (read-only)
   ├─ Topic (just display)
   ├─ Deadline with countdown
   ├─ Status badge
   ├─ Submission section:
   │  ├─ If not yet submitted:
   │  │  ├─ [Upload Google Drive Link] button
   │  │  └─ Modal: URL input + validation
   │  └─ If submitted:
   │     ├─ Shows link + submitted date
   │     ├─ Shows approval status
   │     └─ Shows remarks (if any)
   └─ After deadline: submit button disabled

6. UploadGoogleDriveModal.tsx (Simplified)
   ├─ Link input field
   ├─ Real-time URL validation
   ├─ [Submit] [Cancel] buttons
   └─ Error messages

7. StatusBadge.tsx
   ├─ Pending / Submitted / Approved / Rejected
   └─ Color coded

8. DeadlineIndicator.tsx
   ├─ Shows deadline with countdown
   ├─ RED if < 3 days
   ├─ ORANGE if < 7 days
   └─ GRAY if OK

No modal panels, no side drawers - all inline on detail pages.
```

---

## 🔗 Google Drive Integration (Same as v1)

### URL Validation Only

```typescript
// Frontend validation
VALID:
- https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
- https://drive.google.com/file/d/{FILE_ID}/view
- https://drive.google.com/open?id={FILE_ID}

INVALID:
- http://... (must be HTTPS)
- https://docs.google.com/...
- Shortened URLs (bit.ly, etc.)
```

### How It Works
1. Instructor enters link in modal
2. Frontend validates (regex)
3. Backend validates again
4. Store as plain text
5. GM clicks to open in new tab (simple window.open)
6. No API calls, no file downloads

---

## 🛡️ Permissions (Same as v1, Simplified)

### Role Access

| Role | Create | Assign | Review | Approve | See |
|------|--------|--------|--------|---------|-----|
| **Admin** | ✅ | ✅ | ✅ | ✅ | All |
| **Director** | ✅ | ✅ | ✅ | ✅ | All |
| **GM** | ✅ | ✅ Own Branch | ✅ | ✅ | Own Branch |
| **Instructor** | ❌ | ❌ | ❌ | ❌ | Self |

### Branch Scoping
- GM: For Branch filter shows only their branches
- Instructor selector: Only shows instructors from selected branch
- Dashboard: Only see own branch assignments

---

## 📊 Simplified Doctype Details

### Work Assignment Fields (Complete List)

```
Basic:
- name (auto: WA-001)
- title
- description
- topic (label only)
- created_by
- created_on

Scope:
- for_branch
- academic_year
- deadline (SAME for all instructors)
- enabled

Status:
- workflow_state (Draft/Active/Completed)
- status
- total_assigned (formula)
- submitted_count (formula)
- approved_count (formula)

Optional:
- instructions_file
- reference_link
- assignments (child table)
```

### Work Assignment Detail Fields (Complete List)

```
Instructor Info:
- idx
- instructor
- instructor_name (formula)
- employee (formula)
- department (formula)

Submission:
- submission_status (Pending/Submitted/Approved/Rejected)
- google_drive_link
- submitted_on
- submitted_by

Approval:
- approval_status (Pending/Approved/Rejected)
- approved_by
- approval_date
- approval_remarks
- rejection_reason
- can_resubmit
```

---

## 🔌 Simplified API Endpoints

### Endpoints Needed

```
POST   /api/resource/Work Assignment
       └─ Create new assignment

PUT    /api/resource/Work Assignment/{id}
       └─ Edit assignment (Draft only)

GET    /api/resource/Work Assignment/{id}
       └─ Get assignment details

POST   /api/method/work_assignment.submit_assignment
       └─ Activate assignment (submit)

POST   /api/method/work_assignment.submit_instructor_work
       └─ Instructor uploads Google Drive link
       
POST   /api/method/work_assignment.approve_submission
       └─ GM approves work
       
POST   /api/method/work_assignment.reject_submission
       └─ GM rejects work

GET    /api/resource/Work Assignment
       └─ List with filters (branch, status, etc)

GET    /api/resource/Work Assignment?filters=[...my assignments...]
       └─ Instructor's assignments
```

No bulk operations, no background jobs, keep it simple.

---

## 🧪 Test Cases (Simplified)

### Happy Path
1. GM creates assignment ✓
2. Instructor views on dashboard ✓
3. Instructor uploads link ✓
4. GM reviews & approves ✓
5. Instructor sees approved status ✓

### Edge Cases
1. Instructor uploads after deadline → Blocked ✓
2. GM rejects → Instructor can resubmit (if allowed) ✓
3. Overdue detection (deadline passed, no submission) ✓
4. Multiple instructors in same assignment (mixed statuses) ✓

### Permission Tests
1. GM can only see own branch ✓
2. Instructor only sees own assignments ✓
3. Instructor cannot create/edit/approve ✓

---

## 📈 Implementation Checklist (Simplified)

### Phase 1: Backend Doctypes
- [ ] Create Work Assignment doctype
- [ ] Create Work Assignment Detail child table
- [ ] Add validation rules
- [ ] Set up workflow transitions
- [ ] Set permissions

### Phase 2: API Endpoints
- [ ] CRUD endpoints
- [ ] Submit work endpoint
- [ ] Approve/reject endpoints
- [ ] List with filters

### Phase 3: GM Dashboard
- [ ] Create/edit form
- [ ] Assignment listing
- [ ] Detail page with submissions table
- [ ] Approve/reject inline

### Phase 4: Instructor Dashboard
- [ ] My assignments list
- [ ] Assignment detail page
- [ ] Google Drive upload modal

### Phase 5: Notifications
- [ ] Create Notification Log on triggers
- [ ] Dashboard alerts (no email/WhatsApp)

### Phase 6: Testing & QA
- [ ] Unit tests
- [ ] Integration tests
- [ ] User acceptance testing

---

## ⏱️ Revised Timeline

| Phase | What | Days |
|-------|------|------|
| **1** | Doctypes & validation | 1 |
| **2** | API endpoints | 2 |
| **3** | GM UI | 3 |
| **4** | Instructor UI | 2 |
| **5** | Notifications | 1 |
| **6** | Testing & QA | 2-3 |
| **Total** | **Full Feature** | **11-14 days** ✅ |

**Much faster due to simplified requirements!**

---

## 🔑 Key Differences from v1

| Aspect | v1 | v2 (Now) |
|--------|----|----|
| **Unique Topics** | ✅ Unique per instructor | ❌ Just a label |
| **Email Notifications** | ✅ Yes | ❌ No |
| **WhatsApp** | ✅ Yes | ❌ No |
| **Notification Type** | Email + WhatsApp + Dashboard | 🔔 Dashboard only |
| **Deadline** | Per instructor | ✅ Same for all |
| **Priority Field** | ✅ Yes | ❌ Removed |
| **Complexity** | Higher | Lower ✅ |
| **Components** | More complex | Simpler ✅ |
| **Implementation** | 4-5 weeks | 2-3 weeks ✅ |

---

## 🎯 Summary

### This Version (v2) Is:
✅ **Simpler** - No email/WhatsApp logic  
✅ **Faster** - 2-3 weeks instead of 4-5  
✅ **Cleaner** - Less code, fewer edge cases  
✅ **Focused** - Dashboard notifications only  
✅ **MVP-Ready** - Core features without extras  

### Still Includes:
✅ Multi-branch support  
✅ Instructor assignment tracking  
✅ Google Drive link submission  
✅ GM approval workflow  
✅ Status tracking & progress  
✅ Dashboard notifications  

### Removed from v1:
❌ Email notifications  
❌ WhatsApp notifications  
❌ Unique topic per instructor  
❌ Individual deadlines  
❌ Priority levels  
❌ Estimated hours  

---

## ✅ Ready for Review & Implementation

All changes incorporated. This is now a **true MVP** - focused, clean, fast to build.

**Next Step**: Confirm these changes look good, then say **"Implement now"** to start coding!

---

**Status**: Design Complete (v2 Simplified)  
**Confidence**: 95%  
**Ready for**: Implementation  
**Estimated Build Time**: 11-14 days
