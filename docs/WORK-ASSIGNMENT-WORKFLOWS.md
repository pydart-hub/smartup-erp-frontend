# 🎯 Work Assignment Feature - Visual Workflows

## 1. Complete Workflow Diagram

```mermaid
graph TD
    A["🎯 General Manager<br/>Dashboard"] -->|Creates Assignment| B["📝 New Work Assignment<br/>Title, Description, Category"]
    
    B -->|Fills Details| C["🏢 Assignment Scope<br/>Branch, Deadline, Type"]
    
    C -->|Adds Instructors| D["👨‍🏫 Add Instructor Rows<br/>Topic, Deadline, Priority"]
    
    D -->|Reviews & Submits| E["✅ Work Assignment Created<br/>Status: ACTIVE"]
    
    E -->|Notifications Sent| F["📧 Instructors Receive<br/>Email + WhatsApp + Dashboard"]
    
    F -->|Instructor Reads| G["👁️ Instructor View<br/>Sees Topic & Deadline"]
    
    G -->|Decision Point| H{"Before<br/>Deadline?"}
    
    H -->|YES| I["📤 Instructor Uploads<br/>Google Drive Link"]
    H -->|NO| J["⏰ OVERDUE<br/>Cannot Submit"]
    
    I -->|Submission Received| K["🔔 GM Notification<br/>New Submission Ready"]
    
    K -->|GM Reviews| L["👀 GM Examines<br/>Work on Google Drive"]
    
    L -->|Decision Point| M{"Work Quality?"}
    
    M -->|APPROVED| N["✅ APPROVED<br/>Notify Instructor"]
    M -->|NEEDS CHANGES| O["⚠️ REQUEST CHANGES<br/>Send Feedback + Deadline"]
    M -->|REJECTED| P["❌ REJECTED<br/>Can Resubmit or Mark Complete"]
    
    O -->|Instructor Resubmits| I
    P -->|Instructor Resubmits| I
    
    N -->|Final Check| Q{"All Instructors<br/>Approved?"}
    Q -->|YES| R["🎉 ASSIGNMENT COMPLETE<br/>Close & Archive"]
    Q -->|NO| S["⏳ Still Waiting<br/>for Others"]
    
    S -->|More Submissions| K
    
    J -->|Mark as Overdue| T["📋 MARK COMPLETE<br/>Accept Late or Reject"]
    
    style A fill:#e1f5ff
    style E fill:#c8e6c9
    style F fill:#fff9c4
    style I fill:#ffe0b2
    style K fill:#fff9c4
    style N fill:#c8e6c9
    style O fill:#ffcc80
    style P fill:#ffcdd2
    style R fill:#c8e6c9
```

---

## 2. Instructor's Perspective (Swimlane)

```mermaid
sequenceDiagram
    participant GM as General Manager
    participant System as System/Notif
    participant Instr as Instructor
    participant GoogleDrive as Google Drive
    
    GM->>System: Creates & Submits<br/>Work Assignment (WA-001)
    System->>Instr: 📧 Email Notification<br/>📱 WhatsApp Alert<br/>🔔 Dashboard Alert
    
    Instr->>Instr: Reads Assignment<br/>Topic: "Fractions"<br/>Deadline: 2026-06-28
    
    Note over Instr: Prepares Work<br/>(writing, research, etc.)
    
    Instr->>GoogleDrive: Uploads File<br/>to Google Drive
    GoogleDrive->>Instr: 📄 File Created<br/>Gets Share Link
    
    Instr->>System: Submits Link<br/>+ Description
    System->>Instr: ✅ Submission Recorded
    System->>GM: 🔔 New Submission Alert
    
    alt Before Deadline
        Note over GM: <24 hours to review
        GM->>GoogleDrive: Opens Link<br/>Reviews Work
        GM->>System: Approves Work
        System->>Instr: 🎉 APPROVED!<br/>Email Confirmation
    else After Deadline
        Note over Instr: ❌ Cannot Submit<br/>Button Disabled
        GM->>System: Marks as Overdue<br/>Decides Action
    end
```

---

## 3. General Manager's Perspective (Swimlane)

```mermaid
sequenceDiagram
    participant GM as GM
    participant Form as Work Assignment<br/>Form
    participant System as System
    participant Instructors as Instructors
    participant Dashboard as GM Dashboard
    
    GM->>Form: 1. Opens Create Form
    GM->>Form: 2. Fills Basic Info<br/>(Title, Description, Category)
    GM->>Form: 3. Sets Branch & Deadline
    GM->>Form: 4. Adds Instructors & Topics<br/>(Row 1: Aleesha - Topic 1)<br/>(Row 2: Raghu - Topic 2)
    GM->>Form: 5. Saves as Draft
    
    Note over GM: Review Before Publishing
    
    GM->>Form: 6. Submits for Activation
    Form->>System: Creates WA-001 Document
    System->>Instructors: Sends Notifications<br/>to all assigned instructors
    
    Note over Dashboard: Waiting for Submissions...
    
    Instructors->>System: Instructor 1 Submits
    System->>Dashboard: Updates Progress<br/>(1/3 Submitted)
    System->>GM: 🔔 Notification Alert
    
    GM->>Dashboard: Clicks "Review" on WA-001
    Dashboard->>Dashboard: Shows Instructor 1 Submission
    GM->>Dashboard: Clicks "Open Link"<br/>Reviews work in Google Drive
    
    alt Approve
        GM->>Dashboard: Enters remarks<br/>"Excellent work!"
        GM->>Dashboard: Clicks [✅ Approve]
        System->>Instructors: Sends approval to Instr 1
    else Request Changes
        GM->>Dashboard: Enters feedback<br/>"Add more examples"
        GM->>Dashboard: Sets new deadline<br/>(+3 days)
        GM->>Dashboard: Clicks [⚠️ Request Changes]
        System->>Instructors: Sends feedback to Instr 1
    else Reject
        GM->>Dashboard: Enters rejection reason<br/>"Does not meet standards"
        GM->>Dashboard: Allows resubmit checkbox
        GM->>Dashboard: Clicks [❌ Reject]
        System->>Instructors: Sends rejection to Instr 1
    end
    
    Note over Dashboard: Waiting for more submissions...
    
    Instructors->>System: All instructors submit
    System->>Dashboard: Updates to "All Approved"
    System->>Dashboard: Status: COMPLETED
    System->>GM: 🎉 Assignment Complete!
```

---

## 4. Status State Machine

```mermaid
stateDiagram-v2
    [*] --> Draft
    
    Draft --> Active: Submit<br/>(GM clicks Submit)
    Draft --> [*]: Delete<br/>(If no data)
    
    Active --> AwaitingSubmission: All instructors notified
    
    AwaitingSubmission --> AwaitingSubmission: More submissions arrive
    AwaitingSubmission --> Submitted: Instructor submits work
    
    Submitted --> AwaitingApproval: Work received
    
    AwaitingApproval --> Approved: GM approves
    AwaitingApproval --> ChangesRequested: GM requests changes
    AwaitingApproval --> Rejected: GM rejects
    
    ChangesRequested --> AwaitingResubmission: Feedback sent<br/>Resubmit allowed
    AwaitingResubmission --> Submitted: Instructor resubmits
    
    Rejected --> AwaitingResubmission: Resubmit enabled
    Rejected --> Complete: Mark as final
    
    Approved --> Complete: All approved OR<br/>Mark Complete
    
    Complete --> [*]
    Overdue --> Complete: Manual mark
    
    Active --> Overdue: Deadline passed<br/>(No submission)
    Overdue --> Complete: Mark as final
    
    note right of Draft
        Can edit before submit
        Can delete
    end note
    
    note right of Active
        Assignment published
        Instructors notified
    end note
    
    note right of Submitted
        Work uploaded by instructor
        Awaiting GM review
    end note
    
    note right of Approved
        Work accepted
        Instructor sees checkmark
    end note
    
    note right of Complete
        All submissions processed
        Assignment archived
    end note
```

---

## 5. Role & Permission Access Map

```mermaid
graph LR
    subgraph "Admin/Director (Org-wide)"
        A1["Create Assignment<br/>(Any Branch)"]
        A2["Approve/Reject<br/>Any Submission"]
        A3["View All<br/>Assignments"]
        A4["Manage Roles"]
    end
    
    subgraph "General Manager (Branch-scoped)"
        B1["Create Assignment<br/>(Own Branches)"]
        B2["Assign Instructors<br/>(Own Branch Only)"]
        B3["Review Submissions<br/>(Own Assignments)"]
        B4["Approve/Reject"]
    end
    
    subgraph "Instructor (Personal)"
        C1["View My<br/>Assignments"]
        C2["Submit Work<br/>(Upload Link)"]
        C3["View Feedback"]
        C4["Request Extension<br/>(Optional)"]
    end
    
    subgraph "Branch Manager"
        D1["View Reports<br/>(Read-only)"]
    end
    
    Admin["👤 Admin/Director"]
    GM["👤 General Manager"]
    Instr["👤 Instructor"]
    BM["👤 Branch Manager"]
    
    Admin --> A1
    Admin --> A2
    Admin --> A3
    Admin --> A4
    
    GM --> B1
    GM --> B2
    GM --> B3
    GM --> B4
    
    Instr --> C1
    Instr --> C2
    Instr --> C3
    Instr --> C4
    
    BM --> D1
    
    style A1 fill:#e3f2fd
    style A2 fill:#e3f2fd
    style A3 fill:#e3f2fd
    style B1 fill:#f3e5f5
    style B2 fill:#f3e5f5
    style B3 fill:#f3e5f5
    style C1 fill:#e8f5e9
    style C2 fill:#e8f5e9
    style C3 fill:#e8f5e9
    style D1 fill:#fff3e0
```

---

## 6. Notification Flow Diagram

```mermaid
graph TD
    A["Work Assignment<br/>Submitted by GM"] -->|Trigger: State = Active| B["Create Notification Records"]
    
    B --> C1["Frappe<br/>Notification Log"]
    B --> C2["Send Email<br/>via SMTP"]
    B --> C3["Send WhatsApp<br/>via Meta API"]
    
    C1 -->|Dashboard Bell Icon| D1["Instructor 🔔<br/>Topbar Alert"]
    C2 -->|Email to Inbox| D2["Instructor 📧<br/>Email"]
    C3 -->|SMS to Phone| D3["Instructor 📱<br/>WhatsApp"]
    
    D1 --> E["Instructor Sees<br/>New Assignment"]
    D2 --> E
    D3 --> E
    
    E --> F["Instructor Submits<br/>Google Drive Link"]
    
    F -->|Trigger: Submission = Received| G["Create Notification<br/>for GM"]
    
    G --> H1["Notification Log"]
    G --> H2["Send Email"]
    
    H1 --> I["GM 🔔 Dashboard Alert"]
    H2 --> J["GM 📧 Email Notification"]
    
    I --> K["GM Reviews & Approves"]
    J --> K
    
    K -->|Trigger: Approval = Done| L["Create Notification<br/>for Instructor"]
    L --> M1["Notification Log"]
    L --> M2["Send Email"]
    
    M1 --> N["Instructor 🎉 Approval Alert"]
    M2 --> N
    
    style A fill:#fff3e0
    style B fill:#fff3e0
    style C1 fill:#e3f2fd
    style C2 fill:#c8e6c9
    style C3 fill:#e8eaf6
    style D1 fill:#e3f2fd
    style D2 fill:#c8e6c9
    style D3 fill:#e8eaf6
    style E fill:#f3e5f5
    style F fill:#fff9c4
    style G fill:#ffccbc
    style K fill:#c8e6c9
```

---

## 7. Google Drive Integration Flow

```mermaid
graph LR
    A["Instructor<br/>Dashboard"] -->|Clicks 'Upload'| B["Modal Opens:<br/>Paste Link"]
    
    B -->|Enters URL| C{"Validate<br/>Format"}
    
    C -->|Invalid| D["❌ Error Toast<br/>Invalid Link"]
    D -->|Fix| B
    
    C -->|Valid| E["✅ Link Accepted<br/>Extract Metadata"]
    
    E -->|Optional| F["Fetch File Info<br/>from Google API"]
    F --> G["Show File Preview<br/>(Name, Size)"]
    
    E --> H["Instructor<br/>Submits"]
    G --> H
    
    H -->|API Call| I["Backend Validates<br/>& Stores URL"]
    
    I -->|Success| J["✅ Submission Recorded<br/>Status = Submitted"]
    
    J -->|Notify GM| K["GM Gets Alert"]
    
    K -->|GM Clicks<br/>View Link| L["Opens in<br/>Google Drive<br/>New Tab"]
    
    L -->|Reviews| M["Reads/Downloads<br/>File"]
    
    M -->|Decision| N{"Approve?"}
    
    N -->|Yes| O["Click [✅ Approve]"]
    N -->|No| P["Click [❌ Reject]<br/>or [⚠️ Changes]"]
    
    O --> Q["Backend Records<br/>Approval"]
    P --> R["Backend Records<br/>Feedback"]
    
    Q --> S["Instructor<br/>Notified"]
    R --> S
    
    style A fill:#e8f5e9
    style B fill:#fff9c4
    style C fill:#ffe0b2
    style E fill:#c8e6c9
    style J fill:#c8e6c9
    style K fill:#fff9c4
    style L fill:#bbdefb
    style O fill:#c8e6c9
    style P fill:#ffcdd2
```

---

## 8. Timeline Example: Full Scenario

```mermaid
timeline
    title Work Assignment Lifecycle - Real Example (WA-001: "Q2 Assessment")
    
    2026-05-12 : GM Creates Assignment : Title: Q2 Assessment Preparation
                : Category: Assessment
                : General Deadline: 2026-06-30
    
    2026-05-12 : GM Adds Instructors : Aleesha (Topic: Fractions) | Deadline: 06-28
                : Raghu (Topic: Decimals) | Deadline: 06-29
                : Priya (Topic: Percentages) | Deadline: 06-30
    
    2026-05-12 : GM Submits Assignment : Work Assignment Status → ACTIVE
                : Notifications sent to all 3 instructors
                : Email, WhatsApp, Dashboard alerts
    
    2026-05-15 : Aleesha Uploads Link : Submits Google Drive document
                : Status → SUBMITTED
                : GM notified
    
    2026-05-15 : GM Reviews Aleesha's Work : Opens link, checks quality
                : Clicks [✅ APPROVE]
                : Aleesha gets approval notification
    
    2026-05-18 : Raghu Uploads Link : Submits Google Drive document
                : Status → SUBMITTED
                : GM notified
    
    2026-05-18 : GM Reviews Raghu's Work : Opens link
                : Work is incomplete - Clicks [⚠️ REQUEST CHANGES]
                : New deadline: 2026-07-02
                : Raghu gets feedback email
    
    2026-05-20 : Raghu Resubmits Link : Updated document with requested changes
                : Status → SUBMITTED (again)
                : GM notified
    
    2026-05-20 : GM Reviews Raghu's Work : Opens updated link
                : Clicks [✅ APPROVE]
                : Raghu gets approval notification
    
    2026-06-20 : Priya Not Submitted Yet : Deadline approaching (10 days left)
                : Optional reminder notification sent
    
    2026-06-28 : Priya Overdue : Deadline passed, no submission
                : Status → OVERDUE PENDING
                : GM sees red warning on dashboard
    
    2026-06-30 : GM Marks Priya Complete : Reviews, decides not to penalize
                : Marks as "Accepted Late" or "Rejected"
                : Priya notified of final decision
    
    2026-06-30 : Work Assignment Complete : All 3 instructors processed
                : Status → COMPLETED
                : Archive assignment
                : GM gets completion summary
```

---

## 9. Data Model Relationships

```mermaid
erDiagram
    USER ||--o{ WORK_ASSIGNMENT : creates
    WORK_ASSIGNMENT ||--|{ WORK_ASSIGNMENT_DETAIL : contains
    WORK_ASSIGNMENT ||--o{ COMPANY : "for_branch"
    WORK_ASSIGNMENT_DETAIL ||--o{ INSTRUCTOR : "assigned_to"
    WORK_ASSIGNMENT_DETAIL ||--o{ EMPLOYEE : "via_instructor"
    INSTRUCTOR ||--o{ EMPLOYEE : "links"
    INSTRUCTOR ||--o{ INSTRUCTOR_LOG : "contains"
    INSTRUCTOR_LOG ||--o{ COMPANY : "custom_branch"
    USER ||--o{ NOTIFICATION_LOG : "receives"
    WORK_ASSIGNMENT ||--o{ NOTIFICATION_LOG : "triggers"
    
    USER : string name
    USER : string email
    USER : string full_name
    USER : string role
    
    WORK_ASSIGNMENT : string name
    WORK_ASSIGNMENT : string title
    WORK_ASSIGNMENT : string description
    WORK_ASSIGNMENT : string category
    WORK_ASSIGNMENT : string for_branch
    WORK_ASSIGNMENT : date general_deadline
    WORK_ASSIGNMENT : string workflow_state
    WORK_ASSIGNMENT : int total_assigned
    WORK_ASSIGNMENT : int submitted_count
    WORK_ASSIGNMENT : int approved_count
    
    WORK_ASSIGNMENT_DETAIL : string instructor
    WORK_ASSIGNMENT_DETAIL : string unique_topic
    WORK_ASSIGNMENT_DETAIL : date assignment_deadline
    WORK_ASSIGNMENT_DETAIL : string priority
    WORK_ASSIGNMENT_DETAIL : string submission_status
    WORK_ASSIGNMENT_DETAIL : text google_drive_link
    WORK_ASSIGNMENT_DETAIL : string approval_status
    WORK_ASSIGNMENT_DETAIL : text approval_remarks
    
    INSTRUCTOR : string name
    INSTRUCTOR : string employee
    INSTRUCTOR : string status
    
    EMPLOYEE : string name
    EMPLOYEE : string employee_name
    
    COMPANY : string name
    COMPANY : string company_name
    
    NOTIFICATION_LOG : string name
    NOTIFICATION_LOG : string for_user
    NOTIFICATION_LOG : string document_type
    NOTIFICATION_LOG : string document_name
    NOTIFICATION_LOG : string subject
```

---

## 10. Implementation Priority Matrix

```mermaid
graph TD
    subgraph "🟢 CRITICAL (Do First)"
        C1["Doctype: Work Assignment"]
        C2["Doctype: Work Assignment Detail"]
        C3["Form: Create Assignment"]
        C4["Form: Submit Work"]
        C5["API: Approve/Reject"]
    end
    
    subgraph "🟡 HIGH (Week 2)"
        H1["Notification System"]
        H2["Dashboard Views"]
        H3["Google Drive Validation"]
        H4["Status Management"]
    end
    
    subgraph "🔵 MEDIUM (Week 3)"
        M1["Audit Log Display"]
        M2["Deadline Reminders"]
        M3["Reporting/Analytics"]
        M4["Admin Dashboard"]
    end
    
    subgraph "🟣 LOW (Week 4+)"
        L1["Email Templates Design"]
        L2["Performance Optimization"]
        L3["API Caching"]
        L4["Mobile Responsive"]
    end
    
    style C1 fill:#c8e6c9
    style C2 fill:#c8e6c9
    style C3 fill:#c8e6c9
    style C4 fill:#c8e6c9
    style C5 fill:#c8e6c9
    style H1 fill:#fff9c4
    style H2 fill:#fff9c4
    style H3 fill:#fff9c4
    style H4 fill:#fff9c4
    style M1 fill:#bbdefb
    style M2 fill:#bbdefb
    style M3 fill:#bbdefb
    style M4 fill:#bbdefb
    style L1 fill:#e1bee7
    style L2 fill:#e1bee7
    style L3 fill:#e1bee7
    style L4 fill:#e1bee7
```

---

**Visual Guide Complete!**  
Use these diagrams alongside [WORK-ASSIGNMENT-FEATURE.md](WORK-ASSIGNMENT-FEATURE.md) for full understanding.
