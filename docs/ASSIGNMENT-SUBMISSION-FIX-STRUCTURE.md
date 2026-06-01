# Assignment Submission Link Upload Fix - Structure Analysis

**Problem:** Only Google Drive links are accepted. Other link types (PPT links, OneDrive, Dropbox, etc.) fail with "invalid drive link" error.

**Solution:** Accept any valid URL/link format, not just Google Drive.

---

## 📊 Current Architecture (Google Drive Only)

### 1. **Frontend Flow**
```
InstructorAssignmentDetail.tsx
    ↓
UploadGoogleDriveModal.tsx
    ├─ Input: Google Drive link only
    ├─ Validate: validateGoogleDriveUrl()
    │  └─ Pattern: https://drive.google.com/file/d/[ID]
    ├─ Submit: submitInstructorWork()
    └─ Save: google_drive_link field
```

### 2. **Files Involved**

| File | Purpose | Current Limitation |
|------|---------|-------------------|
| `UploadGoogleDriveModal.tsx` | UI Modal for submissions | Only Google Drive input |
| `InstructorAssignmentDetail.tsx` | Shows assignment & calls modal | No file upload logic |
| `workAssignment.ts` (API) | `submitInstructorWork()` | Only accepts google_drive_link |
| `workAssignment.ts` (Validation) | `validateGoogleDriveUrl()` | Hard regex for Google Drive only |
| `workAssignment.ts` (Types) | `SubmitWorkPayload` | Only has google_drive_link field |

### 3. **Backend Schema**
```
Work Assignment Detail (Child Table)
├─ instructor
├─ unique_topic
├─ submission_status: "Pending" | "Submitted"
├─ google_drive_link: String  ← ONLY FIELD FOR SUBMISSIONS
├─ approval_status: "Pending" | "Approved" | "Rejected"
├─ submitted_on
└─ can_resubmit
```

---

## 🔧 Solution Architecture (Google Drive + File Uploads)

### **Phase 1: Validation Logic Only (No Backend Schema Change)**

Keep existing `google_drive_link` field but enhance validation to accept multiple link types:

```
Supported Link Types:
├─ Google Drive: https://drive.google.com/...
├─ OneDrive: https://onedrive.live.com/...
├─ Dropbox: https://www.dropbox.com/...
├─ GitHub: https://github.com/...
├─ Direct links: https://example.com/file.ppt
└─ Any valid URL
```

**Rationale:** No backend changes needed. Just make frontend validation more flexible.

---Validation Function Update (workAssignment.ts)**

**Current:**
```typescript
export function validateGoogleDriveUrl(url: string): boolean {
  if (!url) return false;
  
  const patterns = [
    /^https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+/,
    /^https:\/\/drive\.google\.com\/open\?id=[a-zA-Z0-9_-]+/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}
```

**Updated:**
```typescript
export function validateSubmissionLink(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  
  try {
    // Accept any valid URL (http:// or https://)
    new URL(url.trim());
    return true;
  } catch {
    return false;
  }
}
```

**Why it works:**
- `new URL()` constructor validates URL format
- Accepts Google Drive, OneDrive, Dropbox, GitHub, direct links
- Simple and flexible;
}
```

---

### **Phase 3: Modal Enhancement (UploadGoogleDriveModal.tsx)**

**Updated Modal - Single Input, Multiple Link Types:**

```
┌─────────────────────────────────────────┐
│  Submit Your Work                       │
├─────────────────────────────────────────┤
│ Submission Link (Google Drive, OneDrive,│
│ Dropbox, GitHub, or any direct link)    │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ https://...                         │ │ ← Accept any valid URL
│ └─────────────────────────────────────┘ │
│                                         │
│ Examples:                               │
│ • Google Drive: https://drive.google...│
│ • OneDrive: https://onedrive.live...   │
│ • Dropbox: https://www.dropbox.com...  │
│ • Direct Link: https://example.com/... │
│                                         │
│ [Cancel] [Submit Work]                  │
└─────────────────────────────────────────┘
```

**Key Changes:**
- Remove tab selector (only link input)
- Update placeholder & examples to show multiple link types
- Update validation feedback message
- Remove file-related UI completely

---

### **Phase 4: API Updates (workAssignment.ts)**

**Single Change - Replace validation function:**

```typescript
// ❌ OLD: validateGoogleDriveUrl() - Too restrictive
// ✅ NEW: validateSubmissionLink() - Accepts any valid URL

export function validateSubmissionLink(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  
  try {
    new URL(url.trim()); // Validates URL format
    return true;
  } catch {
    return false;
  }
}
```

**That's it!** No other API changes needed. `submitInstructorWork()` already saves to `google_drive_link` field correctly.

---

### **Phase 5: Backend API Endpoint (Frappe Python)**

**Location:** `apps/smartup/smartup/doctype/work_assignment/work_assignment.py`

```python
# Add custom method to Work Assignment doctype
@frappe.whitelist()
def upload_submission_file(doctype, name, instructor_id):
    """
    Handle file upload for instructor submissions.
    Frappe handles file storage securely.
    """
    # Frappe automatically creates File doctype linked to parent
    # Store reference in Work Assignment Detail row
    file_obj = frappe.get_last_doc('File')
    
    # Update the work assignment row
    wa = frappe.get_doc('Work Assignment', name)
    for row in wa.assignments:
        if row.instructor == instructor_id:
            row.submission_file = file_obj.name
            row.submission_type = 'file_upload'
            row.submission_status = 'Submitted'
            row.submitted_on = frappe.utils.now()
    
    wa.save()
    return {'status': 'success', 'file_name': file_obj.name}
```

---

## 📋 Implementation Checklist

### **Backend (Frappe)**
- [ ] Add `submission_type` field to Work Assignment Detail
- [ ] Add `submission_file` field (Link to File doctype)
- [ ] Add `file_size`, `file_type` fields for metadata
- [ ] Create custom method for file upload handling
- [ ] Add file security/access control (ensure only submitter & approver can see)
- [ ] Set up "Work Assignment Submissions" folder in File doctype

### **Frontend - Types**
- [ ] Update `SubmitWorkPayload` interface
- [ ] Update `WorkAssignmentDetail` interface
- [ ] Add new types: `UploadResponse`, `FileValidationResult`

### **Frontend - Modal UI**
- [ ] Refactor `UploadGoogleDriveModal.tsx` → `SubmissionModal.tsx`
- [ ] Add Tab selector: "Google Drive" | "Upload File"
- [ ] Add file input with type/size validation
- [ ] Add drag & drop zone
- [ ] Add file preview
- [ ] Add upload progress indicator
- [ ] Add visual feedback for each submission method

### **Frontend - API**
- [ ] Add `validateUploadFile()` function
- [ ] Add `uploadSubmissionFile()` function
- [ ] Update `submitInstructorWork()` to handle both types
- [ ] Add error handling for upload failures

### **Frontend - Display**
- [ ] Update `InstructorAssignmentDetail.tsx` to show uploaded file (if type is file_upload)
- [ ] Add download link for submitted files
- [ ] Show file metadata (size, upload date, type)

### **Frontend - Review (GM Side)**
- [ ] Update work assignment detail view to show file downloads
### **Phase 5: Modal Component Update (UploadGoogleDriveModal.tsx)**

**Changes needed:**

```typescript
// OLD
import { validateGoogleDriveUrl } from "@/lib/api/workAssignment";

const isValidLink = link.trim().length > 0 && validateGoogleDriveUrl(link.trim());

if (validateGoogleDriveUrl(value.trim())) {
  setValidationError(null);
} else {
  setValidationError("Invalid Google Drive URL. Must be https://drive.google.com/...");
}

// NEW
import { validateSubmissionLink } from "@/lib/api/workAssignment";

const isValidLink = link.trim().length > 0 && validateSubmissionLink(link.trim());

if (validateSubmissionLink(value.trim())) {
  setValidationError(null);
} else {
  setValidationError("Invalid URL format. Must be a valid web link (http:// or https://)");
}
```

**Update placeholder text:**
```
OLD: placeholder="https://drive.google.com/file/d/..."
NEW: placeholder="https://drive.google.com/file/d/... or any link"
```

**Update tips section:**
```
OLD:
- Make sure the file is shared with view access
- Use the publicly shared link from Google Drive
- Check that the deadline hasn't passed

NEW:
- Works with Google Drive, OneDrive, Dropbox, GitHub, or any web link
- Make sure the link is publicly accessible
- Check that the deadline hasn't passed
```
Stored in "google_drive_link" column
```

### **NEW: Both Methods**
```
User
  ↓
SubmissionModal (Tab: "Google Drive" | "Upload File")
  ├─ Tab 1: Google Drive Input
  │   ├─ validateGoogleDriveUrl()
  │   └─ submitInstructorWork(submission_type: "google_drive", google_drive_link)
  │
  └─ Tab 2: File Upload
      ├─ validateUploadFile()
      ├─ uploadSubmissionFile() → Frappe File doctype
      └─ submitInstructorWork(submission_type: "file_upload", submission_file)
  ↓
Frappe REST: update Work Assignment Detail row
  ├─ submission_type: "google_drive" | "file_upload"
  ├─ google_drive_link: (if type=google_drive)
  └─ submission_file: (if type=file_upload)
```

---

## 🚀 Priority

**Single Phase - Quick Fix**

1. Update validation function (2 min)
2. Update modal component (5 min)
3. Test with various link types (5 min)

**Total: ~15 minutes**

---

## 📌 Key Notes

1. **No Backend Changes Needed:** Field `google_drive_link` works for any link type
2. **Simple Validation:** JavaScript's `URL` constructor handles all URL validation
3. **Backward Compatible:** All existing Google Drive links still work
4. **Future-Proof:** Supports any new link type (S3, Azure Blob, custom hosts, etc.)
5. **Flexible:** Users can paste PPT links, video links, presentation links, anything

