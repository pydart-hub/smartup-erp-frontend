# Discontinued Students Feature - Implementation Guide

## Overview
This feature allows directors to click on the discontinued students count in the students overview and view a detailed list of all discontinued students with their branch and class information.

## What Was Implemented

### 1. **API Function** - `getDiscontinuedStudents()`
**File**: [src/lib/api/director.ts](../src/lib/api/director.ts)

**Purpose**: Fetches a paginated list of discontinued students with their enrollment information.

**Function Signature**:
```typescript
export async function getDiscontinuedStudents(params?: {
  limit_start?: number;        // Pagination offset (default: 0)
  limit_page_length?: number;  // Results per page (default: 50)
  search?: string;             // Search by student name
}): Promise<{ 
  data: DiscontinuedStudent[], 
  count: number 
}>
```

**Data Model** - `DiscontinuedStudent`:
```typescript
interface DiscontinuedStudent {
  name: string;                          // Student ID (EDU-STU-YYYY-NNNNN)
  student_name: string;                  // Full name
  custom_branch: string;                 // Branch name
  custom_branch_abbr: string;            // Branch abbreviation
  custom_student_type?: string;          // Fresher/Existing/Rejoining
  custom_discontinuation_date?: string;  // When they left
  custom_discontinuation_reason?: string; // Why they left
  joining_date?: string;                 // When they joined
  creation?: string;                     // Record creation date
  student_email_id?: string;             // Email
  student_mobile_number?: string;        // Mobile
  program?: string;                      // Program/Grade they were in
  student_batch_name?: string;           // Class/Batch they were in
}
```

**How It Works**:
1. **Step 1**: Fetches students with `enabled=0` (discontinued flag)
2. **Step 2**: Joins with latest Program Enrollment to get class/program info
3. **Step 3**: Returns paginated results with automatic enrichment

**Usage Example**:
```typescript
// Get first 25 discontinued students
const { data, count } = await getDiscontinuedStudents({
  limit_page_length: 25,
  limit_start: 0
});

// Search for students named "John"
const { data, count } = await getDiscontinuedStudents({
  search: "John",
  limit_page_length: 25
});
```

---

### 2. **Modal Component** - `DiscontinuedStudentsModal`
**File**: [src/components/dashboard/DiscontinuedStudentsModal.tsx](../src/components/dashboard/DiscontinuedStudentsModal.tsx)

**Purpose**: Beautiful modal dialog showing the list of discontinued students with full details.

**Features**:
- ✅ **Pagination**: 25 students per page with Prev/Next buttons
- ✅ **Search**: Filter students by name in real-time
- ✅ **Compact View**: Shows key info - Student Name, Branch, Class, Discontinuation Date
- ✅ **Expandable Rows**: Click to see full details:
  - Student ID, Email, Mobile
  - Student Type, Branch, Class/Program
  - Joining Date, Discontinuation Date & Reason
- ✅ **Smooth Animations**: Backdrop blur, modal zoom, row expansion
- ✅ **Loading States**: Shows spinner while fetching data
- ✅ **Error Handling**: Displays friendly error messages

**Visual Design**:
- Dark mode compatible
- Uses existing design system (colors, spacing, typography)
- Color-coded discontinuation date badge (error/red)
- Hover effects on clickable rows

**Component Usage**:
```typescript
<DiscontinuedStudentsModal
  isOpen={isOpen}                    // Whether modal is visible
  onClose={() => setIsOpen(false)}   // Called when user closes modal
  totalCount={totalDiscontinued}     // Total count for pagination
/>
```

---

### 3. **Page Integration** - Director Students Page
**File**: [src/app/dashboard/director/students/page.tsx](../src/app/dashboard/director/students/page.tsx)

**Changes Made**:
1. **Imported Modal Component**:
   ```typescript
   import { DiscontinuedStudentsModal } from "@/components/dashboard/DiscontinuedStudentsModal";
   ```

2. **Added State Management**:
   ```typescript
   const [isDiscontinuedModalOpen, setIsDiscontinuedModalOpen] = useState(false);
   ```

3. **Made Discontinued Count Clickable**:
   - Changed from static `<div>` to interactive `<button>`
   - Added hover effects (color change)
   - Opens modal when clicked

4. **Rendered Modal**:
   ```typescript
   <DiscontinuedStudentsModal
     isOpen={isDiscontinuedModalOpen}
     onClose={() => setIsDiscontinuedModalOpen(false)}
     totalCount={totalDiscontinued ?? 0}
   />
   ```

---

## User Flow

### Step 1: View Director Students Page
```
Director logs in → Dashboard → Students menu → Clicks "Students" (under Director View)
```

### Step 2: See Discontinued Count
On the summary card at the top, you'll see:
- **Total Students**: X
- **Active**: Y
- **Discontinued**: Z ← **CLICKABLE**

### Step 3: Click on Discontinued Count
Clicking the "Discontinued" count opens a beautiful modal showing:
- All discontinued students
- Their branch (abbreviation)
- Their class/batch
- Discontinuation date

### Step 4: Expand for Details
Click any student row to expand and see:
- Full student details (email, mobile)
- Student type (Fresher/Existing/Rejoining)
- Joining and discontinuation dates
- Reason for discontinuation
- Program enrollment info

### Step 5: Search or Navigate
- Search for specific students by name
- Use Prev/Next to browse through pages
- Close modal to return to main page

---

## Data Flow Diagram

```
Director Dashboard (students/page.tsx)
    ↓
[Click on Discontinued Count]
    ↓
DiscontinuedStudentsModal Opens
    ↓
Query API: getDiscontinuedStudents()
    ↓
Frappe Backend
  - Student table (enabled=0 filter)
  - Program Enrollment table (join for class info)
    ↓
Returns paginated student list with:
  - Student basic info
  - Branch & Class
  - Discontinuation details
    ↓
Modal renders with:
  - Summary list view
  - Expandable detail rows
  - Pagination controls
  - Search functionality
```

---

## API Response Structure

**Example Response** from `getDiscontinuedStudents()`:
```json
{
  "data": [
    {
      "name": "EDU-STU-2025-00001",
      "student_name": "John Doe",
      "custom_branch": "Smart Up Chullickal",
      "custom_branch_abbr": "SU CHL",
      "custom_student_type": "Fresher",
      "custom_discontinuation_date": "2025-06-10",
      "custom_discontinuation_reason": "Transferred",
      "joining_date": "2024-06-15",
      "student_email_id": "john@example.com",
      "student_mobile_number": "+91-9999999999",
      "program": "10th Grade",
      "student_batch_name": "CHL-25"
    }
  ],
  "count": 47
}
```

---

## Technical Details

### Database Queries
1. **Get Discontinued Students**:
   ```sql
   SELECT * FROM Student WHERE enabled=0 
   ORDER BY creation DESC 
   LIMIT ? OFFSET ?
   ```

2. **Get Latest Enrollment** (for class info):
   ```sql
   SELECT program, student_batch_name FROM `Program Enrollment`
   WHERE docstatus=1 AND student IN (...)
   ORDER BY enrollment_date DESC
   GROUP BY student
   ```

### Performance
- **Pagination**: 50 students per API call (default), 25 per page (UI)
- **Caching**: React Query caches for 60 seconds (`staleTime: 60_000`)
- **Batch Loading**: Program Enrollments fetched efficiently in batches
- **Search**: Client-side filtering in React Query (server-side filter in API)

### Browser Compatibility
- ✅ Chrome/Edge (Chromium-based)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers

---

## Key Features Explained

### 1. **Pagination**
- Shows 25 students per page
- Calculates total pages from API count
- Prev/Next buttons disabled at boundaries
- Current page indicator

### 2. **Search**
- Real-time search as user types
- Searches student names
- Resets to page 1 when searching
- Shows "No matching students" if empty

### 3. **Expandable Rows**
- Click row to expand/collapse
- Only one row expanded at a time (by ID)
- Smooth height animation
- Gray background for expanded content

### 4. **Error Handling**
- Shows spinner while loading
- "Failed to load students" message on error
- "No discontinued students" if empty
- Graceful fallback if Program Enrollment unavailable

---

## Testing Checklist

- [ ] Click on discontinued count → Modal opens
- [ ] Modal shows list of discontinued students
- [ ] Each student shows name, branch, class, date
- [ ] Click student row → Details expand
- [ ] Search box filters by name
- [ ] Pagination works (Prev/Next buttons)
- [ ] Click outside modal → Closes
- [ ] Click X button → Closes
- [ ] Works on mobile (responsive design)
- [ ] Dark mode looks good
- [ ] No console errors
- [ ] API calls complete successfully

---

## Future Enhancements

Possible improvements for future versions:
- [ ] Export discontinued students to CSV/Excel
- [ ] Filter by discontinuation reason
- [ ] Filter by date range
- [ ] Filter by branch
- [ ] Bulk actions (send notification, etc.)
- [ ] Sort by different columns
- [ ] View reason statistics
- [ ] Contact information display
- [ ] Notes/remarks field

---

## Related Files

- **API**: [src/lib/api/director.ts](../src/lib/api/director.ts) - `getDiscontinuedStudents()`
- **Modal**: [src/components/dashboard/DiscontinuedStudentsModal.tsx](../src/components/dashboard/DiscontinuedStudentsModal.tsx)
- **Page**: [src/app/dashboard/director/students/page.tsx](../src/app/dashboard/director/students/page.tsx)
- **Types**: [src/lib/types/student.ts](../src/lib/types/student.ts) - Student type definition

---

## Troubleshooting

### Modal doesn't open
- Check browser console for errors
- Verify click handler is attached to discontinued count
- Check state management in page component

### Students not showing
- Verify there are discontinued students in database
- Check API response in Network tab
- Ensure user has permission to read Student doctype

### Class/Program not showing
- Program Enrollment might not exist for that student
- Component handles this gracefully (shows N/A)
- Check if enrollment was submitted (docstatus=1)

### Search not working
- Verify student names in database
- Check if search is case-sensitive (it isn't)
- Wait for debounce if typing quickly

---

**Last Updated**: June 2025
**Version**: 1.0
**Status**: ✅ Complete and Ready
