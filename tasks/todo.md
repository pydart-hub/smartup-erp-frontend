# Teacher Profiles View Redesign Plan

## Objective
Replace the congested, dual-sidebar drill-down layout with a **Modern Clean Teacher Directory & Analytics Drawer**:
- **Main View**: High-end directory cards with clean search, branch pills/selector, subject filters, designation filters, and quick stats (Pass Rate, Attendance %, CWC Rate).
- **Details Drawer (Slide-out Modal / Side Panel)**: Deep-dive view for the selected teacher, containing their 4 rich tabs (Weekly Exams, Attendance Log, CWC Exam Performance, Work Assignments).
- **Branch Grid Tab**: Retain the 3D interactive branch card overview for quick branch switching.

## Proposed Changes
1. **`src/components/director/TeacherDetailDrawer.tsx`**:
   - Clean, slide-out drawer or full-width modal for the teacher profile.
   - Header with teacher avatar, designation, branch badge, employee ID, phone, subjects.
   - Key stats strip: Weekly Exam Pass Rate, Attendance %, CWC Pass Rate, Work Assignments %.
   - Clean tabbed interface: Weekly Exams (table), Attendance (table), CWC Performance (cards), Work Assignments (cards + drive links).
   - Close button (`X`), escape key, backdrop blur.

2. **`src/components/director/TeacherDirectory.tsx`**:
   - Branch selector bar with clean pills (All Branches, Edappally, Chullickal, Vennala, etc.).
   - Search input for teacher name or subject.
   - Subject & designation quick filters.
   - Beautiful grid of Teacher Cards:
     - Avatar with initial & status indicator.
     - Teacher name, designation, branch badge.
     - Assigned subject pills.
     - Mini KPI stats pills: e.g. Attendance, Weekly Exam Pass Rate.
     - "View Full Profile" button that opens the drawer.

3. **`src/app/dashboard/director/teachers/page.tsx`**:
   - Seamless integration with the new `TeacherDirectory`.
   - Toggle between **Teacher Directory** (default) and **3D Branch Overview Grid**.

4. **Verification**:
   - Type-check via `npx tsc --noEmit`.
   - Verify build and responsive view.
