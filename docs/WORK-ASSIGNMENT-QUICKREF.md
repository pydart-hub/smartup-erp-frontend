# 📌 Work Assignment Feature - Quick Reference

## One-Page Summary

### 🎯 What is This Feature?

**GM assigns unique work/topics to each instructor with deadlines:**
- GM creates assignment with multiple instructors
- Each instructor gets ONE unique topic
- Individual deadlines for each
- Instructors upload Google Drive links
- GM reviews, approves, or requests changes
- Dashboard notifications throughout

---

## Key Roles & Actions

| Role | Creates | Assigns | Reviews | Approves | Sees |
|------|---------|---------|---------|----------|------|
| 👤 **Admin** | ✅ | ✅ | ✅ | ✅ | All |
| 👤 **GM** | ✅ | ✅ Own Branch | ✅ | ✅ | Own Branch |
| 👤 **Instructor** | ❌ | ❌ | ❌ | ❌ | Self Only |

---

## 📋 Main Doctypes

### 1. **Work Assignment** (Parent)
```
Fields:
├─ title: "Q2 Assessment Preparation"
├─ category: "Assessment" 
├─ for_branch: "Thopumpadi"
├─ general_deadline: "2026-06-30"
├─ workflow_state: "Draft" → "Active" → "Completed"
└─ assignments: [] (child rows)
```

### 2. **Work Assignment Detail** (Child Table)
```
Fields (per instructor):
├─ instructor: "Aleesha Sharma"
├─ unique_topic: "Math - Fractions (Part 1)"
├─ assignment_deadline: "2026-06-28"
├─ priority: "High"
├─ google_drive_link: "https://drive.google.com/..."
├─ submission_status: "Pending" → "Submitted"
├─ approval_status: "Pending" → "Approved" / "Rejected"
└─ approval_remarks: "Excellent work!"
```

---

## 🔄 Workflow in 5 Steps

### **Step 1: GM Creates Assignment**
```
Create Form:
├─ Title, Description, Category
├─ For Branch
├─ General Deadline
└─ Add Instructors (rows)
   ├─ Select Instructor
   ├─ Enter Unique Topic
   ├─ Set Individual Deadline
   └─ Set Priority
```

### **Step 2: GM Submits (Activates)**
```
Click [Submit]:
└─ workflow_state → "Active"
└─ Notifications sent:
   ├─ 📧 Email
   ├─ 📱 WhatsApp
   └─ 🔔 Dashboard Alert
```

### **Step 3: Instructor Submits Work**
```
Instructor Dashboard:
├─ Click "My Assignments"
├─ See: Topic, Deadline, Status
├─ Click "Upload Work"
├─ Paste Google Drive Link
├─ Click [Submit]
└─ Status → "Submitted"
```

### **Step 4: GM Reviews & Decides**
```
GM Dashboard - Review Options:
├─ ✅ [APPROVE] → Add remarks → Confirm
├─ ⚠️ [REQUEST CHANGES] → Add feedback → Send
└─ ❌ [REJECT] → Add reason → Allow resubmit?
```

### **Step 5: Close When Complete**
```
Final State:
├─ All submissions processed
├─ Status → "Completed"
├─ Auto-archived
└─ History available for audit
```

---

## 📱 UI Components (What to Build)

### **GM Dashboard Pages**
```
/dashboard/general-manager/work-assignments/
├─ [LIST] Work assignments (searchable, filterable)
├─ [CREATE] Create new assignment form
├─ [DETAIL] View assignment with submissions
└─ [REVIEW] Review single submission (side panel)
```

### **Instructor Dashboard Pages**
```
/dashboard/instructor/my-assignments/
├─ [LIST] My active assignments (deadline badges)
├─ [DETAIL] View assignment details
└─ [SUBMIT] Upload Google Drive link modal
```

### **Shared Components**
```
├─ StatusBadge (Pending/Submitted/Approved/Rejected)
├─ DeadlineIndicator (RED/ORANGE/GRAY countdown)
├─ UploadGoogleDriveModal (Link input + validation)
├─ SubmissionReview (Side panel for GM)
└─ AuditLog (History timeline)
```

---

## 🔔 Notifications

### When Instructor is Notified
| Trigger | Message | Channels |
|---------|---------|----------|
| **Assignment Created** | "New work assignment: Q2 Assessment" | Email, WhatsApp, Dashboard |
| **Work Approved** | "Your work has been APPROVED! 🎉" | Email, Dashboard |
| **Changes Requested** | "Resubmission requested: Math - Fractions" | Email, Dashboard |
| **Work Rejected** | "Your work was rejected. Feedback: ..." | Email, Dashboard |

### When GM is Notified
| Trigger | Message |
|---------|---------|
| **Work Submitted** | "Aleesha submitted Q2 Assessment" |
| **Deadline Passed (no submit)** | "Raghu is OVERDUE: Q2 Assessment" (optional) |
| **All Complete** | "Work Assignment WA-001 is now COMPLETE" |

---

## 🔗 Google Drive Integration

### Validation Rules
```
✅ VALID URLs:
- https://drive.google.com/file/d/{FILE_ID}/view?usp=sharing
- https://drive.google.com/file/d/{FILE_ID}/view
- https://drive.google.com/open?id={FILE_ID}

❌ INVALID (Blocked):
- http://... (must be HTTPS)
- https://docs.google.com/... (only file storage)
- https://bit.ly/... (shortened URLs)
```

### How It Works
```
1. Instructor enters link in modal
2. Frontend validates format (regex)
3. Backend validates again
4. Store URL as plain text (no file download)
5. GM clicks to open in new tab
6. No direct Google Drive API integration needed
   (Instructor manages permissions themselves)
```

---

## 📊 Status Flow

```
Draft ──Submit──> Active ──Submissions──> Awaiting Approval

Awaiting Approval:
├─ Approve ──> Approved ──> (Check all done) ──> Completed
├─ Reject ──> Rejected ──> (Allow resubmit) ──> Back to Awaiting Approval
└─ Changes ──> Changes Requested ──> (Resubmit) ──> Back to Awaiting Approval

Overdue:
├─ If deadline passed & no submission
└─ Mark as Complete (Accept late or reject)
```

---

## 🛡️ Permissions

### Branch Scoping (CRITICAL)
```
✓ GM can ONLY:
  ├─ Create assignments for own branches
  ├─ Assign instructors from own branch
  └─ See submissions from own assignments

✓ Instructor can ONLY:
  ├─ See own assignments
  ├─ Submit to own assignments
  └─ View own feedback
```

### Doctype Permissions
```
Work Assignment:
├─ Read: All roles (filtered by branch)
├─ Write: Admin, Director, GM (own branch)
├─ Submit: Admin, Director, GM
├─ Approve: Admin, Director, GM
└─ Delete: Admin (Draft only)

Work Assignment Detail:
└─ Inherited from parent
```

---

## 🎨 Design Checklist

### For GM Create Form
- [ ] Title input (max 150 chars)
- [ ] Description rich text editor
- [ ] Category dropdown (5 options)
- [ ] For Branch selector (filtered to user's branches)
- [ ] General Deadline date picker (validation: future)
- [ ] Instructions file upload (optional)
- [ ] Instructors table (add/remove rows)
- [ ] Unique Topic text area (per row)
- [ ] Individual Deadline date picker (per row)
- [ ] Priority dropdown (per row)
- [ ] Estimated Hours number (per row)
- [ ] [Save Draft] [Submit] [Cancel] buttons
- [ ] Validation feedback + error toasts

### For Instructor Submit Modal
- [ ] Link input field
- [ ] Real-time URL validation feedback
- [ ] Description input (optional)
- [ ] Deadline display with countdown
- [ ] [Submit] [Cancel] buttons
- [ ] Disable submit if deadline passed
- [ ] Success/error toast messages

### For GM Review Panel
- [ ] Submission details (instructor, date, description)
- [ ] Google Drive link button (opens in new tab)
- [ ] Assignment context (topic, deadline)
- [ ] Remarks text area
- [ ] Action buttons: [Approve] [Request Changes] [Reject]
- [ ] Loading states during processing
- [ ] Confirmation modals for actions

---

## 🔌 API Endpoints to Build

```
POST   /api/resource/Work Assignment
PUT    /api/resource/Work Assignment/{id}
GET    /api/resource/Work Assignment/{id}

POST   /api/method/work_assignment.submit_instructor_response
POST   /api/method/work_assignment.approve_submission
POST   /api/method/work_assignment.request_changes
POST   /api/method/work_assignment.reject_submission

GET    /api/resource/Work Assignment
       (Listing with filters)
```

---

## 📈 Formula Fields (Auto-calculated)

```
Work Assignment:
├─ total_assigned = COUNT(assignments[])
├─ submitted_count = COUNT(assignments[submission_status="Submitted"])
├─ approved_count = COUNT(assignments[approval_status="Approved"])
├─ rejected_count = COUNT(assignments[approval_status="Rejected"])
└─ pending_count = total - (submitted + approved + rejected)
```

---

## 🧪 Test Cases

### Happy Path
1. GM creates assignment → Instructor gets notified ✓
2. Instructor submits work → GM gets notified ✓
3. GM approves → Instructor sees approval ✓
4. All approved → Assignment closes ✓

### Edge Cases
1. Instructor submits AFTER deadline → Blocked ✓
2. GM requests changes → Instructor can resubmit ✓
3. Deadline passed, no submission → Mark overdue ✓
4. Multiple instructors, mixed statuses → Progress tracked ✓

### Permission Tests
1. GM can only see own branch assignments ✓
2. Instructor only sees their own ✓
3. GM cannot assign instructors from other branches ✓

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [WORK-ASSIGNMENT-FEATURE.md](WORK-ASSIGNMENT-FEATURE.md) | **Complete spec** (10 sections) |
| [WORK-ASSIGNMENT-WORKFLOWS.md](WORK-ASSIGNMENT-WORKFLOWS.md) | **Visual diagrams** (10 diagrams) |
| [WORK-ASSIGNMENT-QUICKREF.md](WORK-ASSIGNMENT-QUICKREF.md) | **This file** - Quick reference |

---

## ⏭️ Next Steps

1. **Review** all 3 documentation files
2. **Confirm** business rules with stakeholders
3. **Start** Backend (Phase 1: Doctypes)
4. **Build** API Endpoints (Phase 2)
5. **Create** Frontend Components (Phase 3-4)
6. **Test** & Deploy (Phase 5-6)

---

## 🚨 Critical Notes

1. **Branch Scoping**: MUST enforce at every level (Frappe User Permissions)
2. **Google Drive URLs**: Only store URL text, no file downloads
3. **Notifications**: Use existing Frappe + WhatsApp stack
4. **Non-destructive**: Do NOT modify existing instructor records
5. **Audit Trail**: Keep history of all state changes

---

**Ready to Implement?** Confirm with user before starting coding.  
**Last Updated**: May 12, 2026  
**Confidence Level**: 95% (Complete understanding of SmartUp architecture)
