/**
 * Create Syllabus Configuration + Syllabus Part Completion DocTypes on Frappe Cloud.
 *
 * Usage: node docs/create_syllabus_doctypes.mjs
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const headers = { 'Authorization': AUTH, 'Content-Type': 'application/json' };

async function createDocType(payload) {
  const r = await fetch(`${BASE}/api/resource/DocType`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) {
    // Check if already exists
    if (j.exc_type === 'DuplicateEntryError' || j._server_messages?.includes('already exists')) {
      console.log(`  ⚠ Already exists: ${payload.name}`);
      return null;
    }
    console.error(`  ✗ Failed to create ${payload.name}:`, r.status, JSON.stringify(j).slice(0, 500));
    return null;
  }
  console.log(`  ✓ Created: ${payload.name}`);
  return j.data;
}

async function main() {
  // ────────────────────────────────────────────────────────────
  // 1. Child table: Syllabus Configuration Part
  // ────────────────────────────────────────────────────────────
  console.log('\n1. Creating child table: Syllabus Configuration Part...');
  await createDocType({
    name: 'Syllabus Configuration Part',
    module: 'Custom',
    custom: 1,
    istable: 1,
    editable_grid: 1,
    track_changes: 0,
    fields: [
      {
        fieldname: 'part_number',
        fieldtype: 'Int',
        label: 'Part Number',
        reqd: 1,
        in_list_view: 1,
        columns: 1,
      },
      {
        fieldname: 'part_title',
        fieldtype: 'Data',
        label: 'Part Title',
        reqd: 1,
        in_list_view: 1,
        columns: 4,
      },
    ],
    permissions: [],
  });

  // ────────────────────────────────────────────────────────────
  // 2. Parent: Syllabus Configuration
  // ────────────────────────────────────────────────────────────
  console.log('\n2. Creating DocType: Syllabus Configuration...');
  await createDocType({
    name: 'Syllabus Configuration',
    module: 'Custom',
    custom: 1,
    naming_rule: 'Expression',
    autoname: 'SYLCFG-.YYYY.-.#####',
    is_submittable: 0,
    track_changes: 1,
    allow_rename: 0,
    fields: [
      {
        fieldname: 'course',
        fieldtype: 'Link',
        label: 'Course',
        options: 'Course',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'company',
        fieldtype: 'Link',
        label: 'Branch',
        options: 'Company',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'academic_year',
        fieldtype: 'Link',
        label: 'Academic Year',
        options: 'Academic Year',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'total_parts',
        fieldtype: 'Int',
        label: 'Total Parts',
        reqd: 1,
        in_list_view: 1,
      },
      {
        fieldname: 'configured_by',
        fieldtype: 'Link',
        label: 'Configured By',
        options: 'User',
        read_only: 1,
      },
      {
        fieldname: 'sb_parts',
        fieldtype: 'Section Break',
        label: 'Parts',
      },
      {
        fieldname: 'parts',
        fieldtype: 'Table',
        label: 'Parts',
        options: 'Syllabus Configuration Part',
        reqd: 1,
      },
    ],
    permissions: [
      { role: 'Branch Manager', read: 1, write: 1, create: 1, delete: 1, permlevel: 0 },
      { role: 'Director', read: 1, write: 0, create: 0, permlevel: 0 },
      { role: 'Instructor', read: 1, write: 0, create: 0, permlevel: 0 },
      { role: 'System Manager', read: 1, write: 1, create: 1, delete: 1, permlevel: 0 },
    ],
  });

  // ────────────────────────────────────────────────────────────
  // 3. Main tracking: Syllabus Part Completion
  // ────────────────────────────────────────────────────────────
  console.log('\n3. Creating DocType: Syllabus Part Completion...');
  await createDocType({
    name: 'Syllabus Part Completion',
    module: 'Custom',
    custom: 1,
    naming_rule: 'Expression',
    autoname: 'SPC-.YYYY.-.#####',
    is_submittable: 0,
    track_changes: 1,
    allow_rename: 0,
    fields: [
      // Section: Assignment
      {
        fieldname: 'syllabus_config',
        fieldtype: 'Link',
        label: 'Syllabus Configuration',
        options: 'Syllabus Configuration',
        reqd: 1,
        read_only: 1,
      },
      {
        fieldname: 'instructor',
        fieldtype: 'Link',
        label: 'Instructor',
        options: 'Instructor',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'instructor_name',
        fieldtype: 'Data',
        label: 'Instructor Name',
        read_only: 1,
        fetch_from: 'instructor.instructor_name',
        in_list_view: 1,
      },
      {
        fieldname: 'cb1',
        fieldtype: 'Column Break',
      },
      {
        fieldname: 'course',
        fieldtype: 'Link',
        label: 'Course',
        options: 'Course',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'program',
        fieldtype: 'Link',
        label: 'Program',
        options: 'Program',
        reqd: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'student_group',
        fieldtype: 'Link',
        label: 'Student Group',
        options: 'Student Group',
      },
      // Section: Scope
      {
        fieldname: 'sb_scope',
        fieldtype: 'Section Break',
        label: 'Scope',
      },
      {
        fieldname: 'academic_year',
        fieldtype: 'Link',
        label: 'Academic Year',
        options: 'Academic Year',
        reqd: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'company',
        fieldtype: 'Link',
        label: 'Branch',
        options: 'Company',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      // Section: Part Details
      {
        fieldname: 'sb_part',
        fieldtype: 'Section Break',
        label: 'Part Details',
      },
      {
        fieldname: 'part_number',
        fieldtype: 'Int',
        label: 'Part Number',
        reqd: 1,
        in_list_view: 1,
      },
      {
        fieldname: 'part_title',
        fieldtype: 'Data',
        label: 'Part Title',
        reqd: 1,
        in_list_view: 1,
      },
      {
        fieldname: 'total_parts',
        fieldtype: 'Int',
        label: 'Total Parts',
        reqd: 1,
      },
      // Section: Status & Tracking
      {
        fieldname: 'sb_status',
        fieldtype: 'Section Break',
        label: 'Status',
      },
      {
        fieldname: 'status',
        fieldtype: 'Select',
        label: 'Status',
        options: 'Not Started\nPending Approval\nCompleted\nRejected',
        default: 'Not Started',
        reqd: 1,
        in_list_view: 1,
        in_standard_filter: 1,
      },
      {
        fieldname: 'completed_date',
        fieldtype: 'Date',
        label: 'Completed Date',
      },
      {
        fieldname: 'cb_status',
        fieldtype: 'Column Break',
      },
      {
        fieldname: 'approved_date',
        fieldtype: 'Date',
        label: 'Approved Date',
      },
      {
        fieldname: 'approved_by',
        fieldtype: 'Link',
        label: 'Approved By',
        options: 'User',
        read_only: 1,
      },
      // Section: Notes
      {
        fieldname: 'sb_notes',
        fieldtype: 'Section Break',
        label: 'Notes',
      },
      {
        fieldname: 'remarks',
        fieldtype: 'Small Text',
        label: 'Remarks',
      },
      {
        fieldname: 'rejection_reason',
        fieldtype: 'Small Text',
        label: 'Rejection Reason',
        read_only: 1,
      },
    ],
    permissions: [
      { role: 'Instructor', read: 1, write: 1, create: 0, delete: 0, permlevel: 0 },
      { role: 'Branch Manager', read: 1, write: 1, create: 1, delete: 1, permlevel: 0 },
      { role: 'Director', read: 1, write: 0, create: 0, permlevel: 0 },
      { role: 'System Manager', read: 1, write: 1, create: 1, delete: 1, permlevel: 0 },
    ],
  });

  // ────────────────────────────────────────────────────────────
  // 4. Verify creation
  // ────────────────────────────────────────────────────────────
  console.log('\n4. Verifying...');
  for (const dt of ['Syllabus Configuration Part', 'Syllabus Configuration', 'Syllabus Part Completion']) {
    const r = await fetch(`${BASE}/api/resource/DocType/${encodeURIComponent(dt)}?fields=["name","module","istable"]`, { headers });
    const j = await r.json();
    if (r.ok && j.data) {
      console.log(`  ✓ ${dt} exists (module=${j.data.module}, istable=${j.data.istable})`);
    } else {
      console.log(`  ✗ ${dt} NOT FOUND`);
    }
  }

  console.log('\nDone!');
}

main().catch(e => console.error(e));
