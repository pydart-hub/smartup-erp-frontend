# 🎯 Work Assignment Feature - Complete Structure & Workflow

**Status**: Design Phase (Not Yet Implemented)  
**Created**: May 12, 2026  
**Scope**: General Manager (GM) assigns work to instructors with approval workflow  

---

## 📋 Table of Contents
1. [Core Concept](#core-concept)
2. [Doctype Architecture](#doctype-architecture)
3. [Data Model & Relationships](#data-model--relationships)
4. [Complete Workflow Flow](#complete-workflow-flow)
5. [Role & Permission Matrix](#role--permission-matrix)
6. [API Endpoints](#api-endpoints)
7. [Frontend Components](#frontend-components)
8. [Notification Strategy](#notification-strategy)
9. [Google Drive Integration](#google-drive-integration)
10. [Database Schema](#database-schema)

---

## Core Concept

### Use Case
- **Actor 1 (GM)**: Assigns unique work/topics to individual instructors with deadlines
- **Actor 2 (Instructor)**: 
  - Receives dashboard notification
  - Reviews assignment with deadline
  - Uploads Google Drive link (before deadline)
  - Waits for GM approval/rejection
- **Actor 3 (GM)**: Reviews submissions, approves or rejects with feedback

### Key Features
✅ One-to-one assignment (each instructor gets unique work)  
✅ Deadline enforcement with visual indicators  
✅ Multi-branch support (GM creates cross-branch assignments)  
✅ Google Drive link submission  
✅ Approval/Rejection workflow  
✅ Dashboard notifications  
✅ Audit trail (who assigned, when, approvals)  

---

## Doctype Architecture

### Primary Doctypes Required

#### 1️⃣ **Work Assignment** (Parent Doctype)
```
Doctype Name: "Work Assignment"
Module: "Academic"
Is Submittable: True (tracks state changes)
Naming: AUTO (WA-001, WA-002, etc.)
```

**Fields (Parent Document)**:
```
Section: Basic Information
  □ work_assignment_id        String (Auto)      | e.g., "WA-001"
  □ title                      String (150 chars) | "Q2 Assessment Preparation"
  □ description                Text               | Detailed task description
  □ created_by                 Link:User          | Auto-filled, GM who created
  □ created_date               Datetime           | Auto-filled

Section: Timing & Scope
  □ academic_year              Link:Academic Year | e.g., "2025-2026"
  □ for_branch                 Link:Company       | Branch(es) assignment applies to
  □ assignment_type            Select             | ["Topic", "Course", "Assessment", "Project", "Other"]
  □ category                   Select             | ["Teaching Prep", "Evaluation", "Content", "Admin", "Professional Dev"]

Section: Status & Control
  □ workflow_state             Select (Read-only) | "Draft" → "Active" → "Completed" / "Closed"
  □ status                     Select (Read-only) | "Active", "Completed", "Cancelled"
  □ created_on                 Date               | When assignment was created
  □ general_deadline           Date               | Master deadline (ALL instructors must finish by this)
  □ enabled                    Checkbox           | Disable/enable assignments

Section: Tracking
  □ total_assigned             Int (Formula)      | COUNT(assignments[])
  □ submitted_count            Int (Formula)      | COUNT(assignments[status="Submitted"])
  □ approved_count             Int (Formula)      | COUNT(assignments[approval_status="Approved"])
  □ rejected_count             Int (Formula)      | COUNT(assignments[approval_status="Rejected"])
  □ pending_count              Int (Formula)      | total - (submitted + approved + rejected)

Section: Attachments
  □ reference_document         Link:DocType       | Optional link to related document (e.g., curriculum)
  □ instructions_file          Attachment         | File to be reviewed by instructors
```

---

#### 2️⃣ **Work Assignment Detail** (Child Table)
Embedded in Work Assignment (parent).

```
Doctype Name: "Work Assignment Detail"
Fieldname (in parent): "assignments"
```

**Fields (Child Table Row)**:
```
Section: Instructor Assignment
  □ idx                        Int                | Line number (auto)
  □ instructor                 Link:Instructor    | The instructor assigned this work
  □ instructor_name            String (Formula)   | Auto-filled from Instructor
  □ employee                   Link:Employee      | Auto-fetched from Instructor relationship
  □ department                 String (Read-only) | Auto-filled from Instructor

Section: Assignment Details
  □ unique_topic               Text               | UNIQUE topic/work for this instructor
  □ topic_sequence_number      Int                | Optional (for ordering topics: 1,2,3...)
  □ assignment_deadline        Date               | Individual deadline for this instructor
  □ priority                   Select             | "Low", "Normal", "High", "Urgent"
  □ estimated_hours            Float              | Hours estimated to complete

Section: Submission & Approval
  □ submission_status          Select (Formula)   | "Pending", "Submitted", "Rejected"
  □ google_drive_link          Data (Text)        | URL of submitted work
  □ google_drive_link_name     String             | Display name / description of link
  □ submitted_on               Datetime           | When instructor submitted
  □ submitted_by               Link:User          | Auto-filled (instructor user)

Section: Approval Workflow
  □ approval_status            Select             | "Pending", "Approved", "Rejected", "Conditional Approval"
  □ approved_by                Link:User          | Who approved (GM)
  □ approval_date              Datetime           | When approved
  □ approval_remarks           Text               | Comments from approver
  □ rejection_reason           Text               | Why rejected (if rejected)
  □ resubmit_request           Checkbox           | True if GM asks for resubmit

Section: Audit Trail
  □ created_time               Datetime           | When this assignment was created
  □ last_modified              Datetime           | Last change timestamp
  □ status_change_log          Text (Read-only)   | History: "2026-05-12 14:30 - Assigned by Manager"
```

---

### Supporting Doctypes (Existing, Extended)

#### 3️⃣ **Instructor** (Existing Doctype - NO CHANGES)
Already has:
- `instructor` (PK)
- `instructor_name`
- `employee` (Link to Employee)
- `instructor_log[]` (Branch assignments)

No modifications needed for work assignment feature.

---

#### 4️⃣ **Notification Log** (Existing - Used As-Is)
SmartUp already uses Frappe's Notification Log for dashboard notifications.

---

### Relationship Diagram
```
┌─────────────────────────────┐
│   General Manager (User)     │
│   - Role: "General Manager"  │
│   - Assigned branches        │
└────────────┬────────────────┘
             │ creates
             ▼
┌──────────────────────────────┐
│   Work Assignment (Parent)   │
│   - Title: "Q2 Assessment"   │
│   - For Branch: "Thopumpadi" │
│   - Deadline: 2026-06-30     │
└──────────────┬───────────────┘
               │ contains (child)
               ▼
    ┌────────────────────────────┐
    │  Work Assignment Detail[i] │
    │  - Instructor: Aleesha     │
    │  - Topic: "Fractions"      │
    │  - Deadline: 2026-06-28    │
    └────────────┬───────────────┘
                 │ references
                 ▼
    ┌────────────────────────────┐
    │   Instructor (Aleesha)     │
    │   - Employee Link          │
    │   - Department: "Academic" │
    │   - instructor_log[]       │
    │     {branch, program, ...} │
    └────────────────────────────┘
```

---

## Data Model & Relationships

### Hierarchy & Ownership

| Level | Doctype | Primary Key | Owner | Notes |
|-------|---------|-------------|-------|-------|
| **L1** | User (GM) | `name` (email) | Admin | Role = "General Manager" |
| **L2** | Work Assignment | `name` (WA-001) | GM | Submittable, status-tracked |
| **L3** | Work Assignment Detail | Child row | Auto | Embedded in WA; one per instructor |
| **L4** | Instructor | `name` | Admin | Represents instructor |
| **L5** | Employee | `name` | Admin | HR record, linked from Instructor |

### Cross-Branch Support

**Design**: One Work Assignment can assign to instructors across multiple branches  
**Implementation**:
```javascript
// A GM creates ONE "Work Assignment"
Work Assignment {
  name: "WA-001",
  for_branch: "Thopumpadi",  // Or null for "all branches"
  assignments: [
    {
      instructor: "Aleesha",
      unique_topic: "Fractions - Part 1",
      assignment_deadline: "2026-06-28"
    },
    {
      instructor: "Raghu",
      unique_topic: "Fractions - Part 2",
      assignment_deadline: "2026-06-29"
    }
  ]
}
```

If `for_branch = null`, assignment visible to instructors at ALL branches.  
If `for_branch = "Thopumpadi"`, only those instructor assignments from that branch.

---

## Complete Workflow Flow

### 🔄 Full Lifecycle (10 States)

```
┌────────────────────────────────────────────────────────────────┐
│                       STATE MACHINE FLOW                        │
└────────────────────────────────────────────────────────────────┘

                              ┌─────────────┐
                              │   DRAFT     │
                              └──────┬──────┘
                                     │ (GM clicks "Create Assignment")
                                     ▼
                        ┌────────────────────────┐
                        │  ACTIVE (Assigned)     │
                        │ Notif → Instructor     │
                        └────┬──────────┬────────┘
                             │          │
                ┌────────────┘          └─────────────┐
                │                                     │
                ▼ (Deadline passes - auto-mark)       ▼ (Instructor submits work)
        ┌──────────────────┐                   ┌──────────────────┐
        │ OVERDUE PENDING  │                   │ AWAITING APPROVAL│
        │ (No submission)  │                   │ (Work uploaded)  │
        └────────┬─────────┘                   └────┬──────┬──────┘
                 │                                  │      │
                 │ (GM can still accept late)       │      │
                 │                                  │      │
        ┌────────▼──────────┐         ┌────────────┘      │
        │ REJECTED - Can    │         │                   │
        │ Resubmit or       │    (GM clicks "Approve")    │
        │ Mark Complete     │         │                   ▼
        └───────┬───────────┘    ┌────▼─────────────┐
                │                │ APPROVED        │
                │                │ (Work accepted) │
                │                └────┬────────────┘
                │                     │
                │ (Resubmit requested)│
                └─────────────────────┘
                         │
                         ▼
                  ┌──────────────────┐
                  │ COMPLETED        │
                  │ (Final state)    │
                  └──────────────────┘
```

### Step-by-Step Actions

#### **Phase 1: Assignment Creation (GM)**

```
ACTOR: General Manager (GM)
LOCATION: GM Dashboard → "Work Assignments" section
TIME: Anytime during academic year

STEP 1: Click "Create New Work Assignment"
├─ Opens form with:
│  ├─ Title field
│  ├─ Description
│  ├─ Category dropdown (Teaching Prep, Evaluation, etc.)
│  ├─ For Branch selector (single or multi-select)
│  ├─ General Deadline date picker
│  ├─ Optional instructions file upload
│  └─ "Add Row" button to add instructor assignments

STEP 2: Fill in basic info
├─ Title: "Q2 Assessment Preparation"
├─ Description: "Prepare mock exam papers for..."
├─ For Branch: "Thopumpadi"
├─ General Deadline: "2026-06-30"
└─ Category: "Assessment"

STEP 3: Add instructor assignments (child rows)
├─ Click "Add Row" in assignments table
├─ Select Instructor: "Aleesha Sharma"
│  └─ Auto-fills: Employee, Department
├─ Enter Unique Topic: "Math - Fractions (Part 1)"
├─ Enter Individual Deadline: "2026-06-28"
├─ Priority: "High"
├─ Estimated Hours: "4"
└─ Repeat for each instructor...

STEP 4: Review & Submit
├─ Click "Save as Draft" (workflow_state="Draft")
├─ Click "Submit" (workflow_state="Active")
│  └─ Triggers:
│     ├─ Email to all assigned instructors
│     ├─ WhatsApp notification: "New work assignment: Q2 Assessment..."
│     ├─ Dashboard notification for each instructor
│     └─ Status → "Active"
└─ Confirmation toast: "Work Assignment WA-001 created and activated"
```

#### **Phase 2: Instructor Receives & Reviews Assignment**

```
ACTOR: Instructor (e.g., Aleesha Sharma)
LOCATION: Instructor Dashboard
TIME: Within hours of assignment creation

TRIGGER: Notification arrives
├─ Sonner toast: "New work assignment: Q2 Assessment Preparation"
├─ Red dot on Notification Bell (topbar)
├─ Email in inbox
└─ WhatsApp message (if enabled)

STEP 1: Click notification / navigate to "My Assignments"
├─ Opens list of all active assignments for this instructor
├─ Columns: Assignment Title | Category | Unique Topic | Deadline | Status
├─ Shows deadline in RED if < 3 days away
├─ Shows deadline in ORANGE if < 7 days away
└─ Shows deadline in GRAY if > 7 days away

STEP 2: Click on assignment to view details
├─ Shows:
│  ├─ Title: "Q2 Assessment Preparation"
│  ├─ Your Topic: "Math - Fractions (Part 1)"
│  ├─ Your Deadline: "2026-06-28" (5 days remaining)
│  ├─ Priority: "High"
│  ├─ Estimated Hours: "4"
│  ├─ Description from GM
│  ├─ Optional instructions file (downloadable)
│  ├─ Status: "Pending Submission"
│  └─ Section: "Submit Your Work"

STEP 3: Option A - Before Deadline (Normal Submission)
├─ Click "Upload Google Drive Link"
├─ Modal opens:
│  ├─ Text field: Paste Google Drive URL
│  ├─ Text field: Description/Name (e.g., "Assessment_Draft_v1")
│  ├─ Optional: Add multiple links (if allowed)
│  └─ Buttons: [Submit] [Cancel]
├─ Instructor clicks "Submit"
│  └─ System validates:
│     ├─ Link is valid Google Drive URL (drive.google.com/...)
│     ├─ Deadline not passed (now < deadline)
│     └─ Not already submitted (or allow resubmit before deadline)
├─ On success:
│  ├─ Status → "Submitted" (in child row)
│  ├─ google_drive_link populated
│  ├─ submitted_on set to current datetime
│  ├─ Toast: "Work submitted successfully! Awaiting GM approval"
│  ├─ Notification sent to GM: "Aleesha submitted Q2 Assessment"
│  └─ Row now shows: [Submitted] [Awaiting Approval] [Date: 2026-05-20 14:30]

STEP 4: Option B - After Deadline (Late Submission - Blocked)
├─ Shows message: "Deadline passed (2026-06-28)"
├─ Button "Upload" is DISABLED
├─ Alternative: Red button "Request Extension"
│  └─ Sends notification to GM for consideration
└─ Status stays "Pending" in GM dashboard with [OVERDUE] badge
```

#### **Phase 3: GM Reviews & Approves/Rejects**

```
ACTOR: General Manager (GM)
LOCATION: GM Dashboard → "Work Assignments" section
TIME: Anytime after instructor submits

TRIGGER: GM sees notification
├─ Notification bell: "Aleesha submitted Q2 Assessment"
├─ Email: "[Q2 Assessment] New submission from Aleesha"
└─ Dashboard summary card: "3 submissions awaiting approval"

STEP 1: Navigate to specific Work Assignment
├─ GM clicks "View Assignment" (WA-001)
├─ Opens detailed view:
│  ├─ Assignment Info (title, description, deadline)
│  ├─ Table of submissions:
│  │  ├─ Instructor | Topic | Deadline | Status | Link | Approval Date | Actions
│  │  ├─ Aleesha | Math-Fractions | 06-28 | ✅ Submitted | [View Link] | - | [Approve] [Reject] [Request Changes]
│  │  ├─ Raghu | Math-Decimals | 06-29 | ⏳ Pending | - | - | -
│  │  └─ Priya | Math-Percentages | 06-30 | ⏱️ OVERDUE | - | - | [Mark Late / Reject]
│  └─ Summary: "2 Pending | 1 Submitted | 1 Overdue | 0 Approved"

STEP 2: Review Submission
├─ Click on submitted row or [View Link] button
├─ Opens side panel:
│  ├─ Submission Details:
│  │  ├─ Submitted by: Aleesha Sharma
│  │  ├─ Submitted on: 2026-05-20 14:30
│  │  ├─ Google Drive Link: [Link Preview or Button to open]
│  │  └─ Submission Description: "Assessment_Draft_v1"
│  ├─ Assignment Details (for reference):
│  │  ├─ Topic: "Math - Fractions (Part 1)"
│  │  ├─ Deadline: "2026-06-28"
│  │  └─ Instructions: [Optional file]
│  ├─ Approval Section:
│  │  ├─ Text area: "Add approval remarks (optional)"
│  │  ├─ Buttons:
│  │  │  ├─ [✅ Approve] - Green
│  │  │  ├─ [Request Changes] - Yellow
│  │  │  ├─ [❌ Reject] - Red
│  │  │  └─ [Download Link] - Blue
│  │  └─ Auto-date: Will be set to current datetime

STEP 3: Option A - Approve
├─ GM clicks [✅ Approve]
├─ Optional: Add remarks (e.g., "Excellent work, well done!")
├─ System updates:
│  ├─ approval_status → "Approved"
│  ├─ approved_by → GM user
│  ├─ approval_date → current datetime
│  ├─ approval_remarks → text entered
│  ├─ Status badge in table → "✅ Approved"
│  └─ Notifications:
│     ├─ Instructor gets toast: "Your work has been APPROVED! 🎉"
│     ├─ Dashboard notification sent
│     └─ Email: "[Approved] Q2 Assessment - Aleesha Sharma"
└─ Status in child row → "Approved"

STEP 4: Option B - Request Changes
├─ GM clicks [Request Changes]
├─ Modal opens:
│  ├─ Text area: "What needs to be changed?"
│  ├─ New deadline selector: "Set new deadline (optional)"
│  └─ Buttons: [Send Request] [Cancel]
├─ GM enters: "Please improve the assessment difficulty. Add more conceptual questions."
├─ System updates:
│  ├─ approval_status → "Conditional Approval"
│  ├─ resubmit_request → true
│  ├─ rejection_reason → GM's text
│  ├─ Status badge → "⚠️ Changes Requested"
│  └─ Notifications to Instructor:
│     ├─ Toast: "Changes requested for your submission"
│     ├─ Email with feedback text
│     └─ Assignment status → "Pending Resubmission"
└─ Deadline extended (if GM set new deadline)

STEP 5: Option C - Reject
├─ GM clicks [❌ Reject]
├─ Modal opens:
│  ├─ Text area: "Reason for rejection"
│  ├─ Options: [ ] Allow resubmit [ ] Final rejection
│  └─ Buttons: [Reject] [Cancel]
├─ GM checks "Allow resubmit" and enters: "Does not meet requirements. Please redo."
├─ System updates:
│  ├─ approval_status → "Rejected"
│  ├─ rejection_reason → text
│  ├─ resubmit_request → true (if allowed)
│  ├─ Status badge → "❌ Rejected - Redo Allowed"
│  └─ Instructor gets notification:
│     ├─ Toast: "Your work was REJECTED. Resubmission allowed."
│     ├─ Email with rejection reason
│     └─ Deadline reset to 3 days from now
└─ Assignment returns to "Submitted" state for resubmit

STEP 6: Track Progress
├─ Summary card updates: "3 Pending | 0 Submitted | 1 Approved | 0 Rejected"
├─ Color indicators:
│  ├─ Green checkmark = Approved
│  ├─ Red X = Rejected
│  ├─ Yellow hourglass = Changes Requested
│  └─ Gray minus = Pending
└─ Auto-close assignment when all submissions approved or rejected
```

#### **Phase 4: Final State & Audit**

```
ACTOR: System (Automated)
TIME: After all instructor submissions processed

TRIGGER: All assignments in Work Assignment have approval_status set
├─ System checks: COUNT(assignments[approval_status IN ("Approved", "Rejected")])
├─ If COUNT = total_assigned:
│  └─ workflow_state → "Completed"
│  └─ status → "Completed"
│  └─ Notification to GM: "Work Assignment WA-001 is now COMPLETE"
└─ Audit trail entry: "2026-05-25 16:45 - All submissions processed. Status: Completed"

ACCESSIBLE HISTORY:
├─ GM can view "Audit Log" for the assignment:
│  ├─ "2026-05-12 10:00 - Created by Manager"
│  ├─ "2026-05-12 10:05 - Submitted for activation"
│  ├─ "2026-05-12 10:06 - Activated. 5 instructors assigned"
│  ├─ "2026-05-20 14:30 - Aleesha submitted work"
│  ├─ "2026-05-20 15:00 - Aleesha's work approved by Manager"
│  ├─ "2026-05-21 09:15 - Raghu submitted work"
│  ├─ "2026-05-21 09:30 - Raghu's work approved by Manager"
│  ├─ "2026-05-25 16:45 - Assignment completed"
│  └─ [Download Report] button for export
└─ Instructor can see their own history:
   ├─ Submission date/time
   ├─ Approval date/time
   ├─ Any feedback from GM
   └─ Final status
```

---

## Role & Permission Matrix

### Roles Involved

| Role | Can Create | Can Assign | Can Review | Can Approve | Can View | Notes |
|------|-----------|-----------|-----------|------------|---------|-------|
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | Full access |
| **Director** | ✅ | ✅ | ✅ | ✅ | ✅ | Org-wide oversight |
| **General Manager (GM)** | ✅ | ✅ | ✅ | ✅ | ✅ | Branch-scoped assignments |
| **Branch Manager** | ❌ | ❌ | ❌ | ❌ | 👀 | Read-only (for info) |
| **Instructor** | ❌ | ❌ | ❌ | ❌ | 👀 | Only their own assignments |
| **HR Manager** | ❌ | ❌ | ❌ | ❌ | ❌ | Not involved |

### Permission Implementation (Frappe User Permissions)

```
Work Assignment:
├─ Read: Admin, Director, GM, Instructor (self)
├─ Write (Create/Edit): Admin, Director, GM
├─ Submit: Admin, Director, GM
├─ Approve: Admin, Director, GM
└─ Delete: Admin

Work Assignment Detail (Child):
└─ Inherited from parent (no separate permissions)

Instructor (referenced):
├─ Read: All roles
├─ Write: Admin
└─ Link in assignments: GM can assign instructors from own branch(es)

Google Drive Link (submitted):
├─ Read: GM, Instructor (own assignment)
└─ Write: Instructor (submit before deadline)
```

### Branch Scoping (Critical for GM)

```
RULE 1: GM can ONLY create assignments for their assigned branches
├─ Frappe User Permissions enforced on "for_branch" field
├─ When creating Work Assignment:
│  └─ Branch dropdown shows only user's branches
└─ Filter: custom_branch IN (user.branch_assignments)

RULE 2: GM can ONLY assign instructors from their branches
├─ Instructor dropdown auto-filtered
├─ When adding child row (Work Assignment Detail):
│  └─ Instructor selector only shows instructors linked to work_assignment.for_branch
└─ Filter: instructor.instructor_log[].custom_branch = work_assignment.for_branch

RULE 3: GM sees only their submissions on dashboard
├─ My Assignments (Instructor view):
│  └─ Filter: assignments[].instructor = current_user.linked_instructor
├─ My Branch's Assignments (GM view):
│  └─ Filter: work_assignment.for_branch IN (current_user.branches)
└─ Instructor sees assignments only if assigned by their branch's GM
```

---

## API Endpoints

### Create Work Assignment

```http
POST /api/resource/Work Assignment

REQUEST BODY:
{
  "title": "Q2 Assessment Preparation",
  "description": "Prepare mock exam papers for Q2 assessment",
  "category": "Assessment",
  "for_branch": "Thopumpadi",
  "general_deadline": "2026-06-30",
  "assignment_type": "Assessment",
  "created_on": "2026-05-12",
  "instructions_file": null,
  "assignments": [
    {
      "instructor": "Aleesha Sharma",
      "unique_topic": "Math - Fractions (Part 1)",
      "assignment_deadline": "2026-06-28",
      "priority": "High",
      "estimated_hours": 4,
      "topic_sequence_number": 1
    },
    {
      "instructor": "Raghu Menon",
      "unique_topic": "Math - Decimals (Part 1)",
      "assignment_deadline": "2026-06-29",
      "priority": "Normal",
      "estimated_hours": 3,
      "topic_sequence_number": 2
    }
  ]
}

RESPONSE:
{
  "data": {
    "name": "WA-001",
    "workflow_state": "Draft",
    "status": "Draft",
    "created_date": "2026-05-12T10:00:00Z",
    "total_assigned": 2,
    "submitted_count": 0,
    "approved_count": 0,
    "rejected_count": 0
  }
}
```

### Submit Work Assignment (Activate)

```http
PUT /api/resource/Work Assignment/WA-001

REQUEST BODY:
{
  "docstatus": 1,
  "workflow_state": "Active"
}

RESPONSE:
{
  "data": {
    "name": "WA-001",
    "workflow_state": "Active",
    "status": "Active",
    "docstatus": 1
  }
}

SIDE EFFECTS:
├─ Send notification to all instructors in assignments[]
├─ Send WhatsApp: "New work assignment: Q2 Assessment Preparation"
├─ Send email to all assigned instructors
└─ Update status to "Active"
```

### Submit Instructor Response (Upload Link)

```http
POST /api/method/work_assignment.submit_instructor_response

REQUEST BODY:
{
  "work_assignment_id": "WA-001",
  "instructor_name": "Aleesha Sharma",
  "google_drive_link": "https://drive.google.com/file/d/1abc123xyz/view?usp=sharing",
  "google_drive_link_name": "Assessment_Draft_v1"
}

RESPONSE:
{
  "status": "success",
  "message": "Work submitted successfully",
  "data": {
    "assignment_id": "WA-001",
    "assignment_row_idx": 1,
    "submission_status": "Submitted",
    "submitted_on": "2026-05-20T14:30:00Z",
    "approval_status": "Pending"
  }
}

VALIDATION:
├─ google_drive_link must match https://drive.google.com/...
├─ Deadline must not have passed (now < assignment_deadline)
├─ Instructor must be assigned to this work_assignment
└─ Submission status must be "Pending" (not already submitted, unless resubmit allowed)

SIDE EFFECTS:
├─ Update child row: google_drive_link, google_drive_link_name, submitted_on, submission_status
├─ Create Notification Log for GM: "Aleesha submitted Q2 Assessment"
├─ Send email to GM with submission link and details
└─ Toast to instructor: "Work submitted successfully!"
```

### Approve Submission

```http
POST /api/method/work_assignment.approve_submission

REQUEST BODY:
{
  "work_assignment_id": "WA-001",
  "assignment_row_idx": 1,
  "approval_status": "Approved",
  "approval_remarks": "Excellent work, well done!"
}

RESPONSE:
{
  "status": "success",
  "message": "Submission approved",
  "data": {
    "assignment_row_idx": 1,
    "approval_status": "Approved",
    "approved_by": "manager@smartup.com",
    "approval_date": "2026-05-20T15:00:00Z"
  }
}

VALIDATION:
├─ Current user must be GM or Admin
├─ Assignment must have submission_status = "Submitted"
└─ User must have approval permission for this assignment

SIDE EFFECTS:
├─ Update child row: approval_status, approved_by, approval_date, approval_remarks
├─ Create Notification Log for instructor: "Your work has been APPROVED!"
├─ Send email to instructor with approval confirmation
├─ Toast to GM: "Submission approved"
├─ Check if all assignments approved → close Work Assignment if complete
└─ Update formula fields (approved_count, etc.)
```

### Request Changes / Reject

```http
POST /api/method/work_assignment.request_changes

REQUEST BODY:
{
  "work_assignment_id": "WA-001",
  "assignment_row_idx": 1,
  "action": "request_changes",  // or "reject"
  "reason": "Please improve the assessment difficulty. Add more conceptual questions.",
  "new_deadline": "2026-07-05"
}

RESPONSE:
{
  "status": "success",
  "message": "Changes requested",
  "data": {
    "assignment_row_idx": 1,
    "approval_status": "Conditional Approval",
    "resubmit_request": true,
    "rejection_reason": "Please improve..."
  }
}

SIDE EFFECTS:
├─ Update child row: approval_status, resubmit_request, rejection_reason
├─ If new_deadline provided: update assignment_deadline to new value
├─ Update submission_status → "Pending" (allow resubmit)
├─ Reset google_drive_link and submitted_on (optional)
├─ Create Notification Log for instructor: "Changes requested for your work"
├─ Send email with feedback text
└─ Toast to GM: "Feedback sent to instructor"
```

### Get Work Assignments (Instructor View)

```http
GET /api/resource/Work Assignment?filters=[["for_branch","=","Thopumpadi"],["workflow_state","=","Active"]]&fields=["name","title","description","general_deadline","category"]

RESPONSE:
{
  "data": [
    {
      "name": "WA-001",
      "title": "Q2 Assessment Preparation",
      "description": "Prepare mock exam papers...",
      "general_deadline": "2026-06-30",
      "category": "Assessment",
      "assignments": [
        {
          "idx": 1,
          "instructor": "Aleesha Sharma",
          "unique_topic": "Math - Fractions (Part 1)",
          "assignment_deadline": "2026-06-28",
          "priority": "High",
          "estimated_hours": 4,
          "submission_status": "Pending",
          "approval_status": "Pending",
          "google_drive_link": null,
          "submitted_on": null
        }
      ]
    }
  ]
}
```

### Get Work Assignment Detail (GM Review)

```http
GET /api/resource/Work Assignment/WA-001?fields=["*","assignments"]

RESPONSE:
{
  "data": {
    "name": "WA-001",
    "title": "Q2 Assessment Preparation",
    "for_branch": "Thopumpadi",
    "workflow_state": "Active",
    "status": "Active",
    "total_assigned": 2,
    "submitted_count": 1,
    "approved_count": 0,
    "rejected_count": 0,
    "pending_count": 1,
    "assignments": [
      {
        "idx": 1,
        "instructor": "Aleesha Sharma",
        "unique_topic": "Math - Fractions (Part 1)",
        "assignment_deadline": "2026-06-28",
        "submission_status": "Submitted",
        "google_drive_link": "https://drive.google.com/file/d/1abc123xyz/view",
        "google_drive_link_name": "Assessment_Draft_v1",
        "submitted_on": "2026-05-20T14:30:00Z",
        "approval_status": "Pending",
        "approved_by": null,
        "approval_date": null
      },
      {
        "idx": 2,
        "instructor": "Raghu Menon",
        "unique_topic": "Math - Decimals (Part 1)",
        "assignment_deadline": "2026-06-29",
        "submission_status": "Pending",
        "google_drive_link": null,
        "approval_status": "Pending"
      }
    ]
  }
}
```

---

## Frontend Components

### Component Tree & Routes

```
src/app/dashboard/
├── general-manager/
│   └── work-assignments/
│       ├── page.tsx                    (Main listing page)
│       ├── [id]/
│       │   └── page.tsx                (Assignment detail & review page)
│       └── create/
│           └── page.tsx                (Create new assignment form)
│
└── instructor/
    └── my-assignments/
        ├── page.tsx                    (Instructor's assignment list)
        └── [id]/
            └── page.tsx                (Instructor detail & submission page)

src/components/
├── work-assignments/
│   ├── WorkAssignmentForm.tsx          (Create/Edit assignment form)
│   ├── WorkAssignmentList.tsx          (GM's list of all assignments)
│   ├── WorkAssignmentDetail.tsx        (GM's review view)
│   ├── SubmissionReview.tsx            (GM reviews single submission)
│   ├── InstructorAssignmentList.tsx    (Instructor's list)
│   ├── InstructorAssignmentDetail.tsx  (Instructor's view & submit form)
│   ├── UploadGoogleDriveModal.tsx      (Google Drive link upload modal)
│   ├── DeadlineIndicator.tsx           (Visual deadline indicator)
│   ├── StatusBadge.tsx                 (Status display component)
│   └── AuditLog.tsx                    (History/audit trail display)
│
├── ui/
│   ├── DeadlineCountdown.tsx           (Timer to deadline)
│   └── SubmissionStatus.tsx            (Status icons & colors)
```

### Key Component Details

#### 1. **WorkAssignmentForm.tsx** (GM creates/edits)

```typescript
interface WorkAssignmentFormProps {
  workAssignmentId?: string;  // undefined = create, else = edit
  onSuccess?: () => void;
}

SECTIONS:
1. Basic Information
   ├─ Title (text input, 150 chars max, validation)
   ├─ Description (rich text editor)
   ├─ Category (dropdown: Teaching Prep, Evaluation, etc.)
   └─ Assignment Type (dropdown: Topic, Course, Assessment, etc.)

2. Scope & Deadline
   ├─ For Branch (select, filtered by user's branches)
   ├─ General Deadline (date picker, validation: future date)
   └─ Academic Year (auto-filled from system settings)

3. Instructions
   ├─ File upload (optional, for instructions)
   └─ Link upload (optional)

4. Instructor Assignments (Dynamic table)
   ├─ Add Row button
   ├─ Instructor selector (filtered by branch)
   ├─ Unique Topic (text, unique per work_assignment)
   ├─ Individual Deadline (date picker)
   ├─ Priority (dropdown: Low, Normal, High, Urgent)
   ├─ Estimated Hours (number)
   ├─ Delete Row button
   └─ Sequence number (auto-calculated if needed)

5. Actions
   ├─ Save as Draft (disabled submission until ready)
   ├─ Submit (publish assignment to instructors)
   └─ Cancel (discard changes)

VALIDATION:
- Title: required, 3-150 chars
- For Branch: required
- Deadline: required, must be in future
- At least 1 instructor assignment
- Each instructor assigned only once
- Individual deadlines <= general deadline
- Unique topics within assignment

ERROR HANDLING:
- Toast on save success/failure
- Form field validation with inline error messages
- Prevent duplicate instructor assignment (warning)
```

#### 2. **InstructorAssignmentDetail.tsx** (Instructor views & submits)

```typescript
interface InstructorAssignmentDetailProps {
  workAssignmentId: string;
  assignmentRowIdx: number;
}

SECTIONS:
1. Assignment Info (Read-only)
   ├─ Title
   ├─ Category
   ├─ Your Unique Topic
   ├─ Your Deadline (with visual indicator: RED/ORANGE/GRAY)
   ├─ Time Remaining (countdown timer)
   ├─ Priority & Estimated Hours
   ├─ Created by (GM name)
   └─ Description

2. Instructions (Read-only)
   ├─ Full description text
   └─ Downloadable instructions file (if attached)

3. Submission Status
   ├─ Current Status badge (Pending/Submitted/Approved/Rejected/etc.)
   ├─ Submitted Date/Time (if submitted)
   ├─ Approval Status (if reviewed)
   └─ Feedback from GM (if rejected or changes requested)

4. Submission Form (if not yet submitted or resubmit allowed)
   ├─ Google Drive Link input field
   ├─ Link Description input
   ├─ [Upload] button
   ├─ Help text: "Share a public link to your Google Drive file"
   └─ Link validation (must be drive.google.com)

5. Resubmission Instructions (if changes requested)
   ├─ Red banner: "Resubmission requested"
   ├─ Feedback from GM displayed
   ├─ New deadline shown (if extended)
   └─ [Resubmit] button active

INTERACTIONS:
- Click [Upload]: Validates link, submits via API
- Toast: "Work submitted successfully!"
- Component updates to show submitted status
- GM receives notification immediately

DEADLINE LOGIC:
- If now < deadline: Allow submission (button enabled)
- If now >= deadline: Block submission (button disabled, message shown)
- Time remaining calculated and updated every second
- Color: RED (<3 days), ORANGE (<7 days), GRAY (>=7 days)
```

#### 3. **SubmissionReview.tsx** (GM reviews)

```typescript
interface SubmissionReviewProps {
  workAssignmentId: string;
  assignmentRowIdx: number;
  onClose: () => void;
}

LAYOUT:
1. Side Panel (Right side of screen, modal or drawer)
   ├─ Header: Close button
   └─ Content sections

2. Submission Details
   ├─ Instructor Name (link to profile)
   ├─ Topic (read-only)
   ├─ Submitted: 2026-05-20 14:30
   ├─ Google Drive Link: [Button to open in new tab]
   ├─ Link Preview: (if API available, show file preview)
   └─ Submission Description: "Assessment_Draft_v1"

3. Assignment Context
   ├─ Deadline: 2026-06-28
   ├─ Priority: High
   ├─ Estimated Hours: 4
   └─ Submission is: [ON TIME / LATE / WITHIN EXTENSION]

4. Approval Actions
   ├─ Remarks text area: "Add your feedback (optional)"
   ├─ Action buttons:
   │  ├─ [✅ Approve] - Green (primary action)
   │  ├─ [⚠️ Request Changes] - Yellow
   │  ├─ [❌ Reject] - Red
   │  └─ [💾 Download] - Blue (opens link in new tab)
   └─ Loading state while processing

MODALS (triggered by action buttons):
├─ [Approve] → Optional remarks → [Confirm Approve]
├─ [Request Changes] → Modal with:
│  ├─ Reason text area (required)
│  ├─ New deadline picker (optional)
│  └─ [Send] button
└─ [Reject] → Modal with:
   ├─ Reason text area (required)
   ├─ Checkbox: "Allow instructor to resubmit"
   └─ [Confirm Reject] button

ERROR HANDLING:
- Show error toast if API fails
- Disable buttons during submission
- Prevent accidental duplicate approvals (confirm modal)
```

#### 4. **UploadGoogleDriveModal.tsx** (File submission modal)

```typescript
interface UploadGoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (link: string, description: string) => Promise<void>;
  deadline: string;
}

MODAL CONTENT:
1. Title: "Submit Your Work"

2. Instructions
   ├─ "Paste the Google Drive link below"
   ├─ "Make sure the file is accessible (shared with view access)"
   ├─ "Deadline: 2026-06-28 (3 days remaining)"

3. Form Fields
   ├─ Label: "Google Drive Link *"
   ├─ Input: Paste URL (e.g., https://drive.google.com/file/d/...)
   ├─ Validation feedback: "✅ Valid Google Drive link" or "❌ Invalid link"
   │
   ├─ Label: "Description / File Name"
   ├─ Input: e.g., "Assessment_Draft_v1"
   └─ Helper: "Help your manager identify the submission"

4. Actions
   ├─ [Submit] button (primary, enabled after valid link)
   ├─ [Cancel] button (secondary)
   └─ Loading: "Submitting..." spinner

5. Deadline Check
   ├─ If deadline passed: Show error, disable submit
   └─ If deadline < 3 hours: Show warning (orange banner)

VALIDATION:
- Link must start with "https://drive.google.com/"
- Link must not be empty
- Description is optional
- Real-time validation as user types

ERROR HANDLING:
- Toast on success: "Work submitted successfully!"
- Toast on error: "Failed to submit. Please try again."
- Retry button for failed submissions
```

#### 5. **WorkAssignmentList.tsx** (GM's dashboard listing)

```typescript
interface WorkAssignmentListProps {
  filters?: { status?: string; branch?: string };
  onRefresh?: () => void;
}

LAYOUT:
1. Header
   ├─ Title: "Work Assignments"
   ├─ [Create New] button (green)
   └─ Search & filters

2. Filter Bar
   ├─ Search: Quick search by title
   ├─ Status filter: All / Active / Completed / Cancelled
   ├─ Branch filter: (multi-select based on user's branches)
   ├─ Date range: From/To created date
   └─ [Clear Filters] button

3. Summary Cards (Top row)
   ├─ Total Assignments: 5
   ├─ Active: 3
   ├─ Completed: 1
   ├─ Pending Submissions: 7
   └─ [View All] links

4. Table Listing
   ├─ Columns:
   │  ├─ ID (WA-001)
   │  ├─ Title
   │  ├─ Category
   │  ├─ Branch
   │  ├─ Created By
   │  ├─ General Deadline
   │  ├─ Status badge
   │  ├─ Progress: "3/5 Approved"
   │  ├─ Total Assigned / Submitted / Approved
   │  └─ Actions: [View] [Edit] [Delete] (delete only if Draft)
   │
   ├─ Sorting: Clickable column headers
   ├─ Pagination: 20 per page with next/prev
   └─ Empty state: "No work assignments yet. Create one to get started."

ROW INTERACTIONS:
- Click row → Opens detail/review page
- Click [View] → Same as above
- Click [Edit] → Opens form (only if Draft)
- Click [Delete] → Confirm modal, then delete (only if Draft)

STYLING:
- Status badges: Colors (Green=Active, Gray=Completed, Red=Cancelled)
- Deadline badges: RED if < 3 days, ORANGE if < 7 days
- Progress bar: Visual indicator of approval status
```

---

## Notification Strategy

### Notification Types & Triggers

| Trigger | Recipient | Type | Channel | Template |
|---------|-----------|------|---------|----------|
| **WA created & submitted** | All instructors in assignment | Dashboard + Email + WhatsApp | In-app, Email, SMS | "New work assignment: {title}" |
| **Instructor submits work** | GM who created WA | Dashboard + Email | In-app, Email | "{Instructor} submitted work for {title}" |
| **Work approved** | Instructor | Dashboard + Email | In-app, Email | "Your work has been APPROVED! ✅" |
| **Work rejected** | Instructor | Dashboard + Email | In-app, Email | "Your work was rejected. Feedback: ..." |
| **Changes requested** | Instructor | Dashboard + Email | In-app, Email | "Changes requested for your work: ..." |
| **Deadline approaching** | Instructor | Dashboard | In-app | "Deadline in 3 days: {title}" (optional) |
| **Deadline passed (no submission)** | GM | Dashboard + Email | In-app, Email | "{Instructor} overdue: {title}" (optional) |
| **All submissions processed** | GM | Dashboard | In-app | "Work assignment {id} is now complete" |

### Notification Implementation

#### Dashboard Notifications (Existing Frappe Integration)
```python
# Backend: On assignment creation + submit
frappe.new_doc({
  "doctype": "Notification Log",
  "for_user": instructor_user_email,
  "type": "Alert",
  "subject": "New Work Assignment: Q2 Assessment Preparation",
  "document_type": "Work Assignment",
  "document_name": "WA-001",
  "link": f"/app/work-assignment/{work_assignment_id}",
}).insert()
```

#### Email Notifications
```python
# Backend: On various triggers
frappe.sendmail(
  recipients=[instructor_email],
  subject="[SmartUp] New Work Assignment: Q2 Assessment Preparation",
  template="work_assignment_notification",
  args={
    "assignment_title": "Q2 Assessment Preparation",
    "unique_topic": "Math - Fractions (Part 1)",
    "deadline": "2026-06-28",
    "action_url": "/app/my-assignments/WA-001"
  }
)
```

#### WhatsApp Notifications
```python
# Backend: On assignment creation
send_whatsapp(
  recipient_phone=instructor_phone,
  template_name="work_assignment_created",
  template_params={
    "instructor_name": "Aleesha",
    "assignment_title": "Q2 Assessment Preparation",
    "topic": "Math - Fractions (Part 1)",
    "deadline": "2026-06-28"
  }
)
```

### UI Notification Display (Frontend)

#### Toast Notifications (Sonner)
```typescript
// On success submission
toast.success("Work submitted successfully! Awaiting GM approval", {
  duration: 4000,
  action: {
    label: "View",
    onClick: () => router.push(`/app/my-assignments/${workAssignmentId}`)
  }
});

// On GM approval
toast.success("Submission approved! 🎉", {
  duration: 4000
});

// On rejection
toast.error("Your work was rejected. Please review feedback and resubmit.", {
  duration: 5000,
  action: {
    label: "View Feedback",
    onClick: () => scrollToFeedback()
  }
});
```

#### Bell Icon Notification (Topbar)
```typescript
// Existing pattern (enhance existing)
- Red dot indicates new notifications
- Dropdown shows: "5 new notifications"
- List:
  ├─ "New work assignment: Q2 Assessment" (5 min ago)
  ├─ "Your work approved by Manager" (1 hour ago)
  └─ [View All Notifications]
- Click to navigate to relevant assignment
```

---

## Google Drive Integration

### URL Validation & Security

#### Allowed URL Formats
```
VALID:
- https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
- https://drive.google.com/file/d/{FILE_ID}/view
- https://drive.google.com/open?id={FILE_ID}

INVALID (blocked):
- http://drive.google.com/... (must be HTTPS)
- https://docs.google.com/... (docs, sheets, forms - NOT file storage)
- https://example.com/... (non-Google links)
- Shortened URLs (bit.ly, etc. - require expansion)
```

#### Frontend Validation
```typescript
function validateGoogleDriveUrl(url: string): boolean {
  const patterns = [
    /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/view/,
    /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/,
    /^https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+/
  ];
  return patterns.some(p => p.test(url));
}
```

#### Backend Validation (Frappe)
```python
def validate_google_drive_url(url):
    # Similar regex validation
    valid_patterns = [
        r'^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+',
        r'^https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+'
    ]
    if not any(re.match(p, url) for p in valid_patterns):
        frappe.throw("Invalid Google Drive URL")
```

### Link Opening in UI

```typescript
// GM views submitted link
function openGoogleDriveLink(url: string): void {
  // Validate URL format
  if (!validateGoogleDriveUrl(url)) {
    toast.error("Invalid link format");
    return;
  }
  
  // Open in new tab
  window.open(url, "_blank", "noopener,noreferrer");
}

// UI Button
<button 
  onClick={() => openGoogleDriveLink(submission.google_drive_link)}
  className="btn btn-secondary"
>
  📄 Open in Google Drive
</button>
```

### Metadata Storage (Optional Enhancement)

If needed, store file metadata to show preview:
```typescript
interface GoogleDriveFileMetadata {
  fileId: string;
  fileName: string;
  mimeType: string;
  modifiedTime: string;
  fileSize: number;
  driveLink: string;
}

// Could fetch via Google Drive API if credentials available
// For now, just store the URL and user-provided description
```

---

## Database Schema

### Work Assignment Table

```sql
CREATE TABLE `tabWork Assignment` (
  `name` VARCHAR(255) PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` LONGTEXT,
  `category` VARCHAR(100),
  `assignment_type` VARCHAR(100),
  `for_branch` VARCHAR(255),
  `general_deadline` DATE NOT NULL,
  `academic_year` VARCHAR(50),
  `created_on` DATE,
  `created_by` VARCHAR(255),
  `workflow_state` VARCHAR(50) DEFAULT "Draft",
  `status` VARCHAR(50) DEFAULT "Draft",
  `enabled` TINYINT(1) DEFAULT 1,
  `total_assigned` INT DEFAULT 0,
  `submitted_count` INT DEFAULT 0,
  `approved_count` INT DEFAULT 0,
  `rejected_count` INT DEFAULT 0,
  `pending_count` INT DEFAULT 0,
  `reference_document` VARCHAR(255),
  `instructions_file` VARCHAR(255),
  `docstatus` INT DEFAULT 0,
  `owner` VARCHAR(255),
  `modified_by` VARCHAR(255),
  `creation` DATETIME,
  `modified` DATETIME,
  `_assign` TEXT,
  `_comments` TEXT,
  `_liked_by` TEXT,
  KEY `idx_status` (`status`),
  KEY `idx_for_branch` (`for_branch`),
  KEY `idx_workflow_state` (`workflow_state`),
  KEY `idx_created_by` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Work Assignment Detail Table (Child)

```sql
CREATE TABLE `tabWork Assignment Detail` (
  `name` VARCHAR(255) PRIMARY KEY,
  `parent` VARCHAR(255) NOT NULL,
  `parenttype` VARCHAR(255) DEFAULT "Work Assignment",
  `parentfield` VARCHAR(255) DEFAULT "assignments",
  `idx` INT,
  `instructor` VARCHAR(255),
  `instructor_name` VARCHAR(255),
  `employee` VARCHAR(255),
  `department` VARCHAR(255),
  `unique_topic` LONGTEXT NOT NULL,
  `topic_sequence_number` INT,
  `assignment_deadline` DATE NOT NULL,
  `priority` VARCHAR(50) DEFAULT "Normal",
  `estimated_hours` FLOAT,
  `submission_status` VARCHAR(50) DEFAULT "Pending",
  `google_drive_link` TEXT,
  `google_drive_link_name` VARCHAR(255),
  `submitted_on` DATETIME,
  `submitted_by` VARCHAR(255),
  `approval_status` VARCHAR(50) DEFAULT "Pending",
  `approved_by` VARCHAR(255),
  `approval_date` DATETIME,
  `approval_remarks` LONGTEXT,
  `rejection_reason` LONGTEXT,
  `resubmit_request` TINYINT(1) DEFAULT 0,
  `created_time` DATETIME,
  `last_modified` DATETIME,
  `status_change_log` LONGTEXT,
  FOREIGN KEY (`parent`) REFERENCES `tabWork Assignment` (`name`) ON DELETE CASCADE,
  KEY `idx_parent` (`parent`),
  KEY `idx_instructor` (`instructor`),
  KEY `idx_approval_status` (`approval_status`),
  KEY `idx_submission_status` (`submission_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## Implementation Checklist (Ready for Development)

### Phase 1: Backend Doctypes
- [ ] Create `Work Assignment` doctype in Frappe
- [ ] Create `Work Assignment Detail` child table
- [ ] Add validation rules & hooks
- [ ] Add workflow state changes
- [ ] Set up permissions & roles

### Phase 2: API Endpoints
- [ ] `/api/resource/Work Assignment` (CRUD)
- [ ] `/api/method/work_assignment.submit_instructor_response`
- [ ] `/api/method/work_assignment.approve_submission`
- [ ] `/api/method/work_assignment.request_changes`
- [ ] `/api/method/work_assignment.reject_submission`
- [ ] Listing endpoints with filters

### Phase 3: Frontend - GM Dashboard
- [ ] WorkAssignmentForm component
- [ ] WorkAssignmentList component
- [ ] WorkAssignmentDetail component
- [ ] SubmissionReview component
- [ ] Routes: `/dashboard/general-manager/work-assignments/*`

### Phase 4: Frontend - Instructor Dashboard
- [ ] InstructorAssignmentList component
- [ ] InstructorAssignmentDetail component
- [ ] UploadGoogleDriveModal component
- [ ] Routes: `/dashboard/instructor/my-assignments/*`

### Phase 5: Notifications & Integration
- [ ] Notification trigger code (Python)
- [ ] WhatsApp template creation
- [ ] Email template creation
- [ ] Deadline reminder logic (optional)

### Phase 6: Testing & Deployment
- [ ] Unit tests
- [ ] Integration tests
- [ ] QA testing
- [ ] Rollout plan

---

## Next Steps

1. **Review this document** with stakeholders
2. **Confirm business rules** (deadline enforcement, resubmit policy, etc.)
3. **Finalize UI/UX mockups** (optional design step)
4. **Begin backend implementation** (Phase 1)
5. **Then API endpoints** (Phase 2)
6. **Then frontend** (Phases 3-4)
7. **Integration & testing** (Phases 5-6)

---

**Status**: Ready for implementation (AWAITING USER CONFIRMATION)  
**Last Updated**: May 12, 2026  
**Document Owner**: Development Team
