# 🎯 Work Assignment Feature - v2 SIMPLIFIED WORKFLOWS

**Version**: 2.0 (Simplified - Dashboard Only)  
**Changes**: No Email/WhatsApp, Topic is just a label, Same deadline for all

---

## 1. Simplified Main Workflow

```mermaid
graph TD
    A["🎯 GM Dashboard"] -->|Create Assignment| B["📝 New Work<br/>Title + Description"]
    
    B -->|Set Scope| C["🏢 Branch & Deadline<br/>Same deadline for all"]
    
    C -->|Add Instructors| D["👨‍🏫 Select Instructors<br/>Aleesha, Raghu, Priya"]
    
    D -->|Review & Submit| E["✅ ACTIVE<br/>Assignment Published"]
    
    E -->|🔔 Dashboard Alert| F["👁️ Each Instructor<br/>Sees on Dashboard"]
    
    F -->|Instructor Views| G["📋 Assignment Page<br/>Title, Description, Topic, Deadline"]
    
    G -->|Before Deadline?| H{"Deadline<br/>Passed?"}
    
    H -->|NO| I["📤 Upload<br/>Google Drive Link"]
    H -->|YES| J["⏰ BLOCKED<br/>Cannot Upload"]
    
    I -->|Submit| K["✅ SUBMITTED<br/>Work Recorded"]
    
    K -->|🔔 Dashboard Alert| L["GM Sees<br/>New Submission"]
    
    L -->|Review| M["👀 GM Opens<br/>Google Drive"]
    
    M -->|Decision| N{"Quality<br/>OK?"}
    
    N -->|YES| O["✅ APPROVE<br/>Add remarks"]
    N -->|NO| P["❌ REJECT<br/>Add reason"]
    
    O -->|Update| Q["✅ APPROVED<br/>Instructor sees"]
    P -->|Update| R["❌ REJECTED<br/>Instructor sees"]
    
    R -->|Can Resubmit?| S{Allow<br/>Resubmit?}
    S -->|YES| I
    S -->|NO| T["🏁 FINAL<br/>Assignment Complete"]
    
    Q -->|Check All| U{"All Done?"}
    U -->|YES| T
    U -->|NO| L
    
    J -->|Mark Done| T
    
    style E fill:#c8e6c9
    style F fill:#fff9c4
    style I fill:#ffe0b2
    style K fill:#c8e6c9
    style L fill:#fff9c4
    style O fill:#c8e6c9
    style P fill:#ffcdd2
    style T fill:#c8e6c9
```

---

## 2. Instructor's Simple Workflow

```mermaid
sequenceDiagram
    participant GM as General Manager
    participant System as System/Dashboard
    participant Instr as Instructor
    participant GDrive as Google Drive
    
    GM->>System: Creates & Submits<br/>Work Assignment (WA-001)
    System->>Instr: 🔔 Dashboard Notification<br/>"New work assignment"
    
    Note over Instr: Checks Dashboard
    Instr->>Instr: Reads Assignment<br/>Title, Description, Topic, Deadline
    
    Note over Instr: Prepares Work
    
    Instr->>GDrive: Uploads File
    GDrive->>Instr: Gets Share Link
    
    alt Before Deadline
        Instr->>System: Submits Link
        System->>Instr: ✅ Recorded
        System->>GM: 🔔 Dashboard Alert<br/>"New submission"
        
        GM->>GDrive: Opens & Reviews
        GM->>System: Approves
        System->>Instr: 🔔 Dashboard Alert<br/>"APPROVED ✅"
    else After Deadline
        Note over Instr: ❌ Cannot Submit<br/>Button Disabled
    end
```

---

## 3. GM's Simplified Workflow

```mermaid
sequenceDiagram
    participant GM as GM
    participant Form as Form
    participant System as System
    participant Instr as Instructors
    participant Dashboard as Dashboard
    
    GM->>Form: 1. Fill Title & Description
    GM->>Form: 2. Set Branch & Deadline<br/>(Same for all)
    GM->>Form: 3. Add Instructors<br/>(Aleesha, Raghu, Priya)
    GM->>Form: 4. Submit
    
    Form->>System: Create WA-001
    System->>Instr: 🔔 Notify all
    
    Note over Dashboard: Waiting for submissions...
    
    Instr->>System: Instr 1 submits
    System->>Dashboard: Update progress (1/3)
    System->>GM: 🔔 Alert
    
    GM->>Dashboard: Click submission row
    Note over Dashboard: Opens detail inline
    
    GM->>Dashboard: Click "Open Link"
    Dashboard->>Dashboard: New tab: Google Drive
    
    alt Approve
        GM->>Dashboard: Clicks [✅ Approve]
        System->>Instr: Status updated
    else Reject
        GM->>Dashboard: Clicks [❌ Reject]
        GM->>Dashboard: Enters reason
        System->>Instr: Status updated
    end
    
    Note over Dashboard: Wait for more submissions
    
    Instr->>System: All submit
    Dashboard->>Dashboard: Auto-close
```

---

## 4. Simplified Status States

```mermaid
stateDiagram-v2
    [*] --> Draft
    
    Draft --> Active: [Submit]<br/>GM activates
    Draft --> [*]: Delete
    
    Active --> Active: Submissions arrive
    
    Active --> Submitted: Instructor uploads
    
    Submitted --> Approved: GM approves
    Submitted --> Rejected: GM rejects
    
    Rejected --> Submitted: Instructor resubmits<br/>(if allowed)
    
    Approved --> Complete: (Check all done)
    Rejected --> Complete: (Final state reached)
    
    Overdue --> Complete: Mark as done
    
    Active --> Overdue: (Auto) Deadline passed<br/>no submission
    
    Complete --> [*]
    
    note right of Draft
        Can edit
        Can delete
    end note
    
    note right of Active
        Assignment published
        Instructors notified
    end note
    
    note right of Submitted
        Work received
        Awaiting GM review
    end note
    
    note right of Approved
        Work accepted
        Completed
    end note
```

---

## 5. Notification Flow (Dashboard Only)

```mermaid
graph LR
    A["GM Submits<br/>Assignment"] -->|Trigger| B["Create Notification<br/>Dashboard Log"]
    
    B --> C1["Instr 1 🔔"]
    B --> C2["Instr 2 🔔"]
    B --> C3["Instr 3 🔔"]
    
    C1 --> D["Dashboard<br/>Bell Icon"]
    C2 --> D
    C3 --> D
    
    D --> E["Click to view<br/>assignment"]
    
    E --> F["Submit<br/>Work"]
    
    F -->|Trigger| G["Notify GM<br/>New Submission"]
    
    G --> H["GM 🔔<br/>Dashboard"]
    
    H --> I["Review &<br/>Approve"]
    
    I -->|Trigger| J["Notify Instr<br/>Approval Done"]
    
    J --> K["Instr 🔔<br/>Dashboard"]
    
    style A fill:#fff3e0
    style B fill:#e3f2fd
    style C1 fill:#e3f2fd
    style C2 fill:#e3f2fd
    style C3 fill:#e3f2fd
    style D fill:#bbdefb
    style F fill:#fff9c4
    style G fill:#ffccbc
    style H fill:#ffb74d
    style I fill:#c8e6c9
    style J fill:#ffccbc
    style K fill:#bbdefb
    
    note right of B
        Frappe Notification Log
        NO Email
        NO WhatsApp
    end note
```

---

## 6. Component Hierarchy (Simplified)

```mermaid
graph TD
    A["Dashboard Pages"]
    
    A --> B["🏢 GM Dashboard"]
    A --> C["👨‍🏫 Instructor Dashboard"]
    
    B --> B1["WorkAssignmentList"]
    B --> B2["WorkAssignmentDetail<br/>+ Submissions Table"]
    B --> B3["CreateForm"]
    
    B2 --> B2A["Inline Actions:<br/>Approve/Reject"]
    B2 --> B2B["Inline Remarks<br/>Text Area"]
    
    C --> C1["MyAssignmentList"]
    C --> C2["AssignmentDetail"]
    
    C2 --> C2A["Upload Section<br/>if not submitted"]
    C2A --> C2A1["UploadGoogleDriveModal"]
    
    C2 --> C2B["Submission Status<br/>if submitted"]
    
    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#e8f5e9
    style B1 fill:#c5cae9
    style B2 fill:#ce93d8
    style B3 fill:#ce93d8
    style C1 fill:#a5d6a7
    style C2 fill:#a5d6a7
    style C2A fill:#81c784
    style C2B fill:#81c784
```

---

## 7. Data Flow (Simplified)

```mermaid
graph LR
    subgraph "Frontend (Next.js)"
        F1["GM Form"]
        F2["GM Dashboard"]
        F3["Instr Dashboard"]
    end
    
    subgraph "Backend (Frappe)"
        B1["Work Assignment<br/>Doctype"]
        B2["Work Assignment Detail<br/>Child Table"]
        B3["Notification Log<br/>Create"]
    end
    
    subgraph "External"
        E1["Google Drive<br/>Link Storage"]
    end
    
    F1 -->|POST /api/resource| B1
    F1 -->|POST submit| B1
    B1 --> B3
    B3 -->|Notify| F3
    
    F3 -->|PUT /api/method| B2
    B2 -->|Link| E1
    E1 -->|URL| F2
    
    F2 -->|POST approve| B2
    B2 --> B3
    B3 -->|Notify| F3
    
    style F1 fill:#e3f2fd
    style F2 fill:#e3f2fd
    style F3 fill:#e8f5e9
    style B1 fill:#f3e5f5
    style B2 fill:#f3e5f5
    style B3 fill:#fff9c4
    style E1 fill:#ffccbc
```

---

## 8. Real Example Timeline

```mermaid
timeline
    title WA-001 Complete Lifecycle (Simplified)
    
    May 12 : GM Creates : Title: Q2 Assessment
           : Topic: Math (just label)
           : Deadline: 2026-06-30
    
    May 12 : GM Adds & Submits : Instructors: Aleesha, Raghu, Priya
            : Status → ACTIVE
            : 🔔 Dashboard alerts sent
    
    May 15 : Aleesha Uploads : Google Drive link
            : Status → SUBMITTED
            : 🔔 GM alert
    
    May 15 : GM Reviews : Opens link
            : [✅ APPROVE]
            : Status → APPROVED
    
    May 18 : Raghu Uploads : Google Drive link
            : Status → SUBMITTED
            : 🔔 GM alert
    
    May 18 : GM Reviews : Opens link
            : [❌ REJECT]
            : Allows resubmit
            : Status → REJECTED
    
    May 20 : Raghu Resubmits : Updated link
            : [✅ APPROVE]
            : Status → APPROVED
    
    Jun 15 : Priya Not Submitted : Deadline 15 days ago
            : GM marks: OVERDUE
            : Decides action
    
    Jun 20 : Assignment Complete : All 3 processed
            : Status → COMPLETED
            : 🔔 GM notified (done)
```

---

## 9. Permission Access Map (Simplified)

```mermaid
graph LR
    subgraph "Admin/Director"
        A["All Access"]
    end
    
    subgraph "General Manager"
        B["Create Assignments<br/>(Own Branch)"]
        C["Review Submissions<br/>(Own Assignments)"]
        D["Approve/Reject"]
    end
    
    subgraph "Instructor"
        E["View Own<br/>Assignments"]
        F["Submit Work<br/>(Before Deadline)"]
        G["See Approval"]
    end
    
    style A fill:#e3f2fd
    style B fill:#f3e5f5
    style C fill:#f3e5f5
    style D fill:#f3e5f5
    style E fill:#e8f5e9
    style F fill:#e8f5e9
    style G fill:#e8f5e9
```

---

## 10. Implementation Priority (Simplified)

```mermaid
graph TD
    subgraph "🟢 WEEK 1"
        C1["Work Assignment<br/>Doctype"]
        C2["Work Assignment Detail<br/>Child Table"]
        C3["API Endpoints<br/>CRUD + Approve/Reject"]
    end
    
    subgraph "🟡 WEEK 2"
        H1["GM Dashboard<br/>List + Detail + Inline Actions"]
        H2["Instructor Dashboard<br/>List + Detail + Upload Modal"]
        H3["Notification Creation<br/>Dashboard Log"]
    end
    
    subgraph "🟢 WEEK 3"
        M1["Testing<br/>All scenarios"]
        M2["QA & Fixes"]
    end
    
    style C1 fill:#c8e6c9
    style C2 fill:#c8e6c9
    style C3 fill:#c8e6c9
    style H1 fill:#fff9c4
    style H2 fill:#fff9c4
    style H3 fill:#fff9c4
    style M1 fill:#c8e6c9
    style M2 fill:#c8e6c9
```

---

## Summary of Simplifications

### ✅ What's Still Included
- ✅ Multi-branch support
- ✅ Assignment creation & activation
- ✅ Instructor assignment
- ✅ Google Drive link submission
- ✅ GM approval workflow
- ✅ Status tracking
- ✅ Dashboard notifications

### ❌ What's Removed
- ❌ Email notifications
- ❌ WhatsApp notifications
- ❌ Unique topic requirement
- ❌ Individual deadlines per instructor
- ❌ Priority levels
- ❌ Estimated hours
- ❌ Complex modal workflows

### 🟢 Result
- **Simpler code** - Less logic, fewer edge cases
- **Faster delivery** - 11-14 days vs 4-5 weeks
- **Easier testing** - Fewer scenarios
- **Cleaner UX** - Inline actions vs modals
- **True MVP** - Core features only

---

**These diagrams work with [WORK-ASSIGNMENT-REVISED-v2.md](WORK-ASSIGNMENT-REVISED-v2.md)**

Ready to implement!
