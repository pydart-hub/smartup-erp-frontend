# Fix Class and Batch Display for Discontinued Students

## Background
On `/dashboard/director/students/all`, discontinued students (e.g. `AADIDEV NITHIN`) showed `—` for Class and Batch.
When a student is discontinued in Frappe, their `Program Enrollment` is marked as cancelled (`docstatus: 2`).

In `/api/director/student-enrollments`:
- Querying for submitted program enrollments (`docstatus: 1`) returned rows for active students in that chunk (e.g. 24 rows).
- Because `rows.length > 0`, the chunk never fell back to querying without the `docstatus` filter (`fallbackRows = rows.length ? rows : await tryQuery()`). Therefore discontinued students with cancelled program enrollments (`docstatus: 2`) received no enrollment data.
- Similarly, in `/api/director/export-students`, the query hardcoded `["docstatus", "=", 1]`, omitting discontinued students' program and batch from exported reports.

## Todo List
- [x] 1. Update `/api/director/student-enrollments/route.ts` to order by `docstatus asc, enrollment_date desc` (preferring docstatus 1 submitted over cancelled 2, but including both) and map enrollment data for all students.
- [x] 2. Update `/api/director/export-students/route.ts` to fetch program enrollments with `order_by: "docstatus asc, enrollment_date desc"` and without the docstatus=1 restriction so export PDF/Excel files also contain class & batch for discontinued students.
- [x] 3. Make student name clickable link to `/dashboard/director/students/${encodeURIComponent(student.name)}` in `all/page.tsx`.
- [x] 4. Update student detail page query to also support discontinued students' latest enrollment data.
- [x] 5. Verify with TypeScript typecheck (`npx tsc --noEmit`).
- [x] 6. Fix student fee calculation when date filter is applied (separate student joining date filter from invoice sums in export-students and all/page.tsx so future instalments are not excluded).
- [x] 7. Redesign placeholder into modern, elegant Under Development UI without 'We are' phrasing across Director, Branch Manager, and Parent roles.
