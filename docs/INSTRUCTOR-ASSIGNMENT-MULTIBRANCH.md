# Multi-Branch Instructor Assignment Workflow
## How to Assign Instructors Across Multiple Branches

---

## 📌 CURRENT STATE: Instructor Role Assignment (Incomplete)

### Current Flow (Single-Branch Only)

```
Branch Manager @ Thopumpadi
    ↓
Visit: /dashboard/branch-manager/employees/manage-instructors
    ↓
[1] System shows Active Employees in Thopumpadi
    └─ Ramesh (Employee)
    └─ Aleesha (Employee)
    └─ Priya (Employee)
    ↓
[2] Click: "Assign Instructor Role" → Bulk action
    ↓
[3] For each employee:
    ├─ Create Instructor doc (links employee.name → Instructor.name)
    ├─ Add "Instructor" role to their user account
    └─ Result: Employee → Instructor mapping
    ↓
[4] ❌ STOPS HERE — No course/program/branch assignment yet!
    
What's Missing:
  ❌ instructor_log entries (program + course + branch)
  ❌ No way to specify which programs/courses they teach
  ❌ No way to assign to multiple branches
```

### What Actually Happens After

**Currently:**
- Instructors are created but `instructor_log` (child table) is EMPTY
- When course scheduling UI fetches instructors for a program, it gets ALL instructors
- There's NO filtering by program or course
- This only works because currently all instructors are local to one branch

**The instructor_log Child Table Structure:**
```
Instructor: "INS-001" (created from employee)
  └─ instructor_log[] (child table):
    - Row 1: { program: "10th State", course: "Hindi", custom_branch: "Thopumpadi" }
    - Row 2: { program: "11th State", course: "Hindi", custom_branch: "Thopumpadi" }
    - Row 3: { program: "10th State", course: "Hindi", custom_branch: "Palluruthy" } ← MULTI-BRANCH
```

---

## 🎯 SOLUTION: Multi-Step Instructor Assignment Workflow

### Step 1: Create Instructor (Current - Works)

**Who:** Any Branch Manager or Administrator

**Where:** `/dashboard/branch-manager/employees/manage-instructors`

**What Happens:**
```
1. Branch Manager sees list of Active Employees in their branch
2. Clicks "Assign Instructor Role"
3. System creates Instructor doc linked to each employee
4. System adds "Instructor" role to their user
5. Result: Employee ↔ Instructor mapping (1:1)

SQL Result:
  Instructor (name="INS-001")
    - employee: "EMP-001"
    - instructor_log: [] (EMPTY)
```

---

### Step 2: Assign Programs & Courses (NEW - Missing!)

**Who:** Branch Managers (for their branch), or Director (for multiple branches)

**Where:** NEW page needed: `/dashboard/branch-manager/instructors/assignments`

**What Needs to Happen:**

```
Branch Manager @ Thopumpadi views: "Assign Instructor Courses"
    ↓
[1] See list of instructors at this branch
    ├─ Aleesha (Instructor)
    ├─ Ramesh (Instructor)
    └─ Priya (Instructor)
    ↓
[2] Click on "Aleesha" → Assignment form
    ↓
[3] Form shows:
    - Name: Aleesha
    - Branch: Thopumpadi (auto-filled, cannot change)
    - Programs taught: [Checkbox list]
      ☑ 10th State
      ☐ 11th State
      ☑ 11th Science
    - For each program, list courses:
      ☑ 10th State:
        ☑ Mathematics
        ☑ Hindi
        ☐ Science
      ☑ 11th Science:
        ☑ Physics
        ☐ Chemistry
    ↓
[4] Save → Creates instructor_log entries
    
Result:
  Instructor: "INS-001"
    - instructor_log[0]: {program: "10th State", course: "Mathematics", custom_branch: "Thopumpadi"}
    - instructor_log[1]: {program: "10th State", course: "Hindi", custom_branch: "Thopumpadi"}
    - instructor_log[2]: {program: "11th Science", course: "Physics", custom_branch: "Thopumpadi"}
```

---

### Step 3: Add Cross-Branch Assignments (NEW - For Multi-Branch)

**Scenario:** Aleesha needs to teach at BOTH Thopumpadi AND Palluruthy

**Who:** Director or Administrator (only they can assign across branches)

**Where:** NEW feature: Director dashboard `/dashboard/director/instructor-assignments`

**Workflow:**

```
Director views: "Cross-Branch Instructor Management"
    ↓
[1] Search for instructor: "Aleesha"
    ↓
[2] System shows:
    Current Assignments:
    ✅ Thopumpadi
      ├─ 10th State: Mathematics, Hindi
      ├─ 11th Science: Physics
      └─ [Remove]
    
    Other Branches (Available):
    ⏳ Palluruthy
    ⏳ Kochi
    ⏳ Aluva
    
    [+ Add Another Branch]
    ↓
[3] Click "+ Add Another Branch" → Select "Palluruthy"
    ↓
[4] Form appears:
    Branch: Palluruthy (locked)
    Programs taught at this branch:
      ☑ 10th State
      ☑ 11th State
      ☐ 12th Science
    Courses per program:
      ☑ 10th State > Hindi
      ☑ 11th State > Hindi
    ↓
[5] Save → Creates new instructor_log entries
    
Result:
  Instructor: "INS-001"
    - instructor_log[0]: {program: "10th State", course: "Mathematics", custom_branch: "Thopumpadi"}
    - instructor_log[1]: {program: "10th State", course: "Hindi", custom_branch: "Thopumpadi"}
    - instructor_log[2]: {program: "11th Science", course: "Physics", custom_branch: "Thopumpadi"}
    - instructor_log[3]: {program: "10th State", course: "Hindi", custom_branch: "Palluruthy"} ← NEW
    - instructor_log[4]: {program: "11th State", course: "Hindi", custom_branch: "Palluruthy"} ← NEW
```

---

## 🏗️ IMPLEMENTATION STRUCTURE

### New Pages Needed

#### 1. Branch Manager: Instructor Course Assignment
**Page:** `/dashboard/branch-manager/instructors/assignments`

**Features:**
```typescript
export default function InstructorAssignmentsPage() {
  const { defaultCompany } = useAuth();  // Their branch
  
  // 1. List all instructors in this branch
  const instructors = getInstructorsWithCourses(defaultCompany);
  
  // 2. Click instructor → Edit form
  // 3. Form shows:
  //    - Programs available in this branch
  //    - Courses per program (checkboxes)
  //    - Current selections (pre-filled from instructor_log)
  
  // 4. Save:
  //    - For each (program, course) pair:
  //      - If NOT in instructor_log → Create new entry
  //      - If in instructor_log → Keep it
  //      - If checked but not in log → Add it
  //      - If unchecked but in log → Remove it
  
  return (
    <div>
      <h1>Assign Instructor Courses - {defaultCompany}</h1>
      
      <InstructorList instructors={instructors} />
      
      {selectedInstructor && (
        <InstructorAssignmentForm
          instructor={selectedInstructor}
          branch={defaultCompany}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
```

**Components:**

```typescript
function InstructorAssignmentForm({ instructor, branch, onSave }) {
  const [form, setForm] = useState({
    programs: new Set(),  // Selected program names
    courses: {},          // { program: Set<course_names> }
  });
  
  // Load current assignments from instructor_log
  useEffect(() => {
    const currentAssignments = instructor.instructor_log.filter(
      log => log.custom_branch === branch
    );
    
    const programs = new Set(currentAssignments.map(log => log.program));
    const courses = {};
    currentAssignments.forEach(log => {
      if (log.course) {
        if (!courses[log.program]) courses[log.program] = new Set();
        courses[log.program].add(log.course);
      }
    });
    
    setForm({ programs, courses });
  }, [instructor, branch]);
  
  const handleSave = async () => {
    // Build new instructor_log entries for this branch
    const newLog = [];
    
    // Keep all entries NOT for this branch
    instructor.instructor_log
      .filter(log => log.custom_branch !== branch)
      .forEach(log => newLog.push(log));
    
    // Add new entries for selected programs/courses in this branch
    form.programs.forEach(program => {
      const programCourses = form.courses[program] || new Set();
      if (programCourses.size === 0) {
        // Program selected but no courses → add empty entry
        newLog.push({
          program,
          course: undefined,
          custom_branch: branch,
        });
      } else {
        // Add entry for each selected course
        programCourses.forEach(course => {
          newLog.push({
            program,
            course,
            custom_branch: branch,
          });
        });
      }
    });
    
    // Update instructor_log via API
    await updateInstructorLog(instructor.name, newLog);
    onSave();
  };
  
  return (
    <form onSubmit={handleSave}>
      <h2>Assign Programs & Courses for {instructor.instructor_name}</h2>
      
      {/* Available Programs */}
      <ProgramSelector
        availablePrograms={getAvailablePrograms(branch)}
        selected={form.programs}
        onToggle={(program) => {
          const next = new Set(form.programs);
          if (next.has(program)) next.delete(program);
          else next.add(program);
          setForm(prev => ({ ...prev, programs: next }));
        }}
      />
      
      {/* Courses per Program */}
      {form.programs.map(program => (
        <CourseSelector
          key={program}
          program={program}
          availableCourses={getCoursesForProgram(program)}
          selected={form.courses[program] || new Set()}
          onToggle={(course) => {
            setForm(prev => ({
              ...prev,
              courses: {
                ...prev.courses,
                [program]: toggleSet(prev.courses[program], course),
              },
            }));
          }}
        />
      ))}
      
      <button type="submit">Save Assignments</button>
    </form>
  );
}
```

---

#### 2. Director: Cross-Branch Instructor Management
**Page:** `/dashboard/director/instructor-assignments`

**Features:**
```typescript
export default function DirectorInstructorAssignmentsPage() {
  const [selectedInstructor, setSelectedInstructor] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  
  // 1. Search/select instructor (across all branches)
  const allInstructors = getAllInstructorsAllBranches();
  
  // 2. Show current assignments per branch
  // 3. Allow adding/removing branches
  // 4. Allow setting programs/courses per branch
  
  return (
    <div>
      <h1>Cross-Branch Instructor Assignments</h1>
      
      {/* Search instructor */}
      <InstructorSearch
        instructors={allInstructors}
        onSelect={setSelectedInstructor}
      />
      
      {selectedInstructor && (
        <div>
          {/* Current assignments (grouped by branch) */}
          <BranchAssignmentList
            instructor={selectedInstructor}
            onEdit={(branch) => showEditForm(selectedInstructor, branch)}
            onRemove={(branch) => removeFromBranch(selectedInstructor, branch)}
          />
          
          {/* Add to another branch */}
          <AddToBranchForm
            instructor={selectedInstructor}
            excludeBranches={selectedInstructor.instructor_log.map(log => log.custom_branch)}
            onAdd={(branch) => showAddForm(selectedInstructor, branch)}
          />
        </div>
      )}
    </div>
  );
}
```

---

### New API Endpoints Needed

#### 1. Get Available Programs for Branch
```typescript
// GET /api/method/get-programs-for-branch?branch=Thopumpadi
// Returns: ["10th State", "11th Science", ...]
```

#### 2. Update Instructor Log Entries
```typescript
// POST /api/method/update-instructor-log
// Body:
{
  instructor: "INS-001",
  instructor_log: [
    { program: "10th State", course: "Hindi", custom_branch: "Thopumpadi" },
    { program: "10th State", course: "Hindi", custom_branch: "Palluruthy" },
  ]
}
// Result: Updates instructor.instructor_log child table
```

#### 3. Get Cross-Branch Assignments
```typescript
// GET /api/method/instructor-assignments?instructor=INS-001
// Returns:
{
  instructor: "INS-001",
  instructor_name: "Aleesha",
  branches: [
    {
      branch: "Thopumpadi",
      programs: ["10th State", "11th Science"],
      courses: {
        "10th State": ["Mathematics", "Hindi"],
        "11th Science": ["Physics"]
      }
    },
    {
      branch: "Palluruthy",
      programs: ["10th State"],
      courses: {
        "10th State": ["Hindi"]
      }
    }
  ]
}
```

---

## 🔄 COMPLETE WORKFLOW (Multi-Branch Scenario)

### Scenario: Aleesha Teaches at Thopumpadi & Palluruthy

```
STEP 1: Director Creates Instructor Role
  Branch Manager @ Thopumpadi
    → /dashboard/branch-manager/employees/manage-instructors
    → Sees: Aleesha (Active Employee)
    → Clicks: "Assign Instructor Role"
    → Result: Instructor doc created (INS-001), instructor_log is EMPTY
    
STEP 2: Branch Manager @ Thopumpadi Assigns Courses
  Branch Manager @ Thopumpadi
    → /dashboard/branch-manager/instructors/assignments
    → Selects: Aleesha
    → Checks: 10th State (Mathematics, Hindi), 11th State (Hindi)
    → Saves
    → Result: instructor_log has 3 entries for Thopumpadi
    
STEP 3: Director Adds Palluruthy Assignment
  Director
    → /dashboard/director/instructor-assignments
    → Searches: Aleesha
    → Sees current: Thopumpadi (3 courses)
    → Clicks: "+ Add Branch"
    → Selects: Palluruthy
    → Checks: 10th State (Hindi), 11th State (Hindi)
    → Saves
    → Result: instructor_log now has 5 entries (3 + 2)

STEP 4: Branch Manager @ Palluruthy Can Schedule
  Branch Manager @ Palluruthy
    → /dashboard/branch-manager/course-schedule/new
    → Selects batch: "CHL-10th-25-2" (Palluruthy)
    → Instructor dropdown shows: Aleesha ✅ (has instructor_log entry for Palluruthy + 10th State)
    → Selects: Aleesha
    → Course dropdown auto-filters to: [Hindi] (only course she teaches at Palluruthy for 10th)
    → Creates schedule
    
STEP 5: Thopumpadi Branch Manager Can Also Schedule
  Branch Manager @ Thopumpadi
    → /dashboard/branch-manager/course-schedule/new
    → Selects batch: "CHL-10th-25-1" (Thopumpadi)
    → Instructor dropdown shows: Aleesha ✅ (has instructor_log entry for Thopumpadi + 10th State)
    → Selects: Aleesha
    → Course dropdown auto-filters to: [Mathematics, Hindi] (her courses at Thopumpadi for 10th)
    → Creates schedule
    
NOTE: System now knows Aleesha teaches at BOTH branches!
      ✅ Can detect conflicts (same time at different branches)
      ✅ Can show cross-branch workload
      ✅ Each branch manager can independently schedule
```

---

## 📊 DATA MODEL CHANGES

### No new doctypes needed, but:

1. **Frappe side:** `Instructor` doctype already has `instructor_log` child table
   - This is managed in Frappe backend (or custom UI)

2. **Frontend needs:**
   - `UPDATE /api/method/update-instructor-log` endpoint (to update child table)
   - New UI pages to manage assignments
   - Enhanced instructor fetching to show cross-branch status

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Backend API (1-2 days)
```
☐ Create /api/method/update-instructor-log
  - Input: instructor_name, new instructor_log array
  - Validates program + course + branch combinations
  - Updates Frappe instructor doc via PUT
  
☐ Create /api/method/get-programs-for-branch
  - Input: branch
  - Returns: list of programs active in that branch
  
☐ Enhance /api/method/instructor-assignments
  - Returns structured data (branches, programs, courses)
```

### Phase 2: Branch Manager UI (2 days)
```
☐ Create page: /dashboard/branch-manager/instructors/assignments
☐ Build InstructorList component
☐ Build InstructorAssignmentForm component
☐ Add logic to track changes and save via API
☐ Add success/error feedback
```

### Phase 3: Director UI (1-2 days)
```
☐ Create page: /dashboard/director/instructor-assignments
☐ Build InstructorSearch component
☐ Build BranchAssignmentList component
☐ Build AddToBranchForm component
☐ Allow adding/removing branches
```

### Phase 4: Integration (1 day)
```
☐ Update course schedule form to filter instructors by branch + program
☐ Test: Verify filtering works when instructor_log has entries
☐ Test: Conflict detection when instructor at multiple branches
☐ Test: Each branch manager can independently assign
```

---

## 🎯 KEY DECISIONS NEEDED

- [ ] Should Branch Managers be allowed to REMOVE instructors from programs? (Currently can only add)
- [ ] Should instructors have a "max teaching load" per week? (For conflict prevention)
- [ ] Should Director be able to override branch manager assignments?
- [ ] Should assignment changes be tracked/audited?
- [ ] How should program enrollment be handled when instructor transferred mid-year?

---

## ✅ WORKFLOW SUMMARY

```
┌─────────────────────────────────────────────────────────┐
│ Instructor Management Workflow (Proposed)              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 1. Create Instructor Role (Existing)                  │
│    ├─ Branch Manager: manage-instructors page         │
│    └─ Result: Instructor doc created                  │
│                                                         │
│ 2. Assign Courses (NEW - Branch Level)                │
│    ├─ Branch Manager: instructors/assignments page    │
│    ├─ Select programs + courses for their branch      │
│    └─ Result: instructor_log entries created          │
│                                                         │
│ 3. Add Cross-Branch (NEW - Director Level)            │
│    ├─ Director: instructor-assignments page           │
│    ├─ Select additional branches + courses            │
│    └─ Result: More instructor_log entries             │
│                                                         │
│ 4. Schedule Classes (Existing - Now Works!)           │
│    ├─ Branch Manager: course-schedule/new             │
│    ├─ Instructors filtered by instructor_log entries  │
│    └─ Result: Course schedules created per branch     │
│                                                         │
│ 5. Mark Attendance (Existing - Now Works!)            │
│    ├─ Instructor: attendance page                     │
│    ├─ See sessions from all assigned branches         │
│    └─ Result: Attendance marked                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🏃 QUICK START STEPS

**If you want to implement this now:**

1. **Backend:** Create `/api/method/update-instructor-log` endpoint
   - Fetch instructor doc
   - Update instructor_log child table
   - Handle validations

2. **Frontend:** Create `/dashboard/branch-manager/instructors/assignments`
   - Show instructors list
   - Allow selecting programs/courses
   - Call update API

3. **Test:** Verify course scheduling now filters by instructor_log

4. **Extend:** Add director cross-branch UI later

---

## 📝 NOTES

- `instructor_log` already exists in Frappe — no migration needed
- Current system just doesn't populate it
- Once populated, filtering in course scheduling automatically works
- No new permission model needed — uses existing Branch Manager scoping
- Can be implemented incrementally (branch first, then director)

