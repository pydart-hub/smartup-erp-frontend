/**
 * study-angela-ajay-v3.mjs
 * Fetch 9th State fee structures, courses, and sample 9th PE for Thopumpadi
 */

const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';
const HEADERS = { 'Content-Type': 'application/json', Authorization: AUTH };

async function fGet(path) {
  const r = await fetch(BASE + path, { headers: HEADERS });
  const json = await r.json();
  if (!r.ok) {
    console.warn(`WARN: ${JSON.stringify(json).slice(0, 150)}`);
    return { data: null };
  }
  return json;
}

function step(msg) {
  console.log(`\n${'='.repeat(60)}\n  ${msg}\n${'='.repeat(60)}`);
}

async function main() {
  // 1. 9th State fee structures for Smart Up Thopumpadi
  step('9th State Fee Structures for Thopumpadi');
  const feeParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'program', 'academic_year', 'company']),
    filters: JSON.stringify([['company', '=', 'Smart Up Thopumpadi'], ['program', '=', '9th State']]),
    limit_page_length: '30',
  });
  const fees = (await fGet('/api/resource/Fee Structure?' + feeParams)).data || [];
  console.log(`9th State fee structures: ${fees.length}`);
  for (const f of fees) {
    console.log(`  ${f.name} | program: ${f.program} | year: ${f.academic_year}`);
  }

  // 2. Full details of 9th State Basic-4 fee structure (if exists)
  step('9th State Fee Structure Details (Basic-4 variant)');
  const basicFee = fees.find(f => f.name.includes('Basic-4') || f.name.includes('Basic'));
  if (basicFee) {
    const feeDoc = (await fGet('/api/resource/Fee Structure/' + encodeURIComponent(basicFee.name))).data;
    if (feeDoc) {
      console.log('name:', feeDoc.name);
      console.log('total_amount:', feeDoc.total_amount);
      console.log('components:', JSON.stringify(feeDoc.components, null, 2));
    }
  }

  // 3. Sample 9th State students in Thopumpadi
  step('Sample 9th State Students in Thopumpadi');
  const sg9 = (await fGet('/api/resource/Student Group/Thopumpadi-9th State-A')).data;
  const stus9 = (sg9?.students || []);
  console.log(`Students in 9th group: ${stus9.length}`);
  for (const s of stus9) {
    console.log(`  ${s.student} | ${s.student_name}`);
  }

  // 4. Fetch PE for first 9th State student to get fee pattern
  if (stus9.length > 0) {
    step('9th State PE details for existing student');
    for (const s of stus9.slice(0, 2)) {
      const peParams = new URLSearchParams({
        fields: JSON.stringify(['name', 'student', 'program', 'student_batch_name', 'enrollment_date', 'docstatus']),
        filters: JSON.stringify([['student', '=', s.student], ['program', '=', '9th State']]),
        limit_page_length: '5',
      });
      const pes = (await fGet('/api/resource/Program Enrollment?' + peParams)).data || [];
      for (const pe of pes) {
        const full = (await fGet('/api/resource/Program Enrollment/' + encodeURIComponent(pe.name))).data;
        if (full) {
          console.log(`\n--- ${full.name} ---`);
          console.log('student:', full.student, '|', full.student_name);
          console.log('program:', full.program);
          console.log('batch:', full.student_batch_name);
          console.log('academic_year:', full.academic_year);
          console.log('enrollment_date:', full.enrollment_date);
          console.log('custom_fee_structure:', full.custom_fee_structure);
          console.log('custom_plan:', full.custom_plan);
          console.log('custom_student_srr:', full.custom_student_srr);
          console.log('courses:', (full.courses || []).map(c => c.course).join(', '));
        }

        // Get their SO
        const soQ = new URLSearchParams({
          fields: JSON.stringify(['name', 'grand_total', 'status', 'docstatus', 'transaction_date']),
          filters: JSON.stringify([['customer', '=', s.student_name]]),
          limit_page_length: '5',
        });
        const soS = (await fGet('/api/resource/Sales Order?' + soQ)).data || [];
        for (const so of soS) {
          const soFull = (await fGet('/api/resource/Sales Order/' + encodeURIComponent(so.name))).data;
          if (soFull) {
            console.log(`\n  SO: ${so.name} | total: ${so.grand_total}`);
            for (const item of (soFull.items || [])) {
              console.log(`    item: ${item.item_code} | qty: ${item.qty} | rate: ${item.rate} | amount: ${item.amount}`);
            }
            console.log('  company:', soFull.company);
          }
        }

        // Get their SINVs
        const siQ = new URLSearchParams({
          fields: JSON.stringify(['name', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'due_date']),
          filters: JSON.stringify([['customer', '=', s.student_name]]),
          limit_page_length: '10',
        });
        const siS = (await fGet('/api/resource/Sales Invoice?' + siQ)).data || [];
        console.log(`  Invoices: ${siS.length}`);
        for (const si of siS) {
          console.log(`    SINV: ${si.name} | total: ${si.grand_total} | status: ${si.status} | due: ${si.due_date}`);
        }
      }
    }
  }

  // 5. 9th State courses
  step('9th State Courses');
  const courseParams = new URLSearchParams({
    fields: JSON.stringify(['name', 'course_name', 'default_grading_scale']),
    filters: JSON.stringify([['name', 'like', '9th%']]),
    limit_page_length: '30',
  });
  const courses = (await fGet('/api/resource/Course?' + courseParams)).data || [];
  console.log(`9th State courses: ${courses.length}`);
  for (const c of courses) {
    console.log(`  ${c.name} | ${c.course_name}`);
  }

  // 6. CE pattern for existing 9th student
  step('Course Enrollments for 9th student (by program_enrollment)');
  if (stus9.length > 0) {
    const s = stus9[0];
    const peParams2 = new URLSearchParams({
      fields: JSON.stringify(['name', 'program', 'student_batch_name', 'enrollment_date']),
      filters: JSON.stringify([['student', '=', s.student], ['program', '=', '9th State']]),
      limit_page_length: '5',
    });
    const pes2 = (await fGet('/api/resource/Program Enrollment?' + peParams2)).data || [];
    for (const pe of pes2) {
      const ceParams = new URLSearchParams({
        fields: JSON.stringify(['name', 'course', 'program_enrollment', 'docstatus']),
        filters: JSON.stringify([['program_enrollment', '=', pe.name]]),
        limit_page_length: '30',
      });
      const ces = (await fGet('/api/resource/Course Enrollment?' + ceParams)).data || [];
      console.log(`CEs for ${pe.name}: ${ces.length}`);
      for (const ce of ces) {
        console.log(`  CE: ${ce.name} | course: ${ce.course} | docstatus: ${ce.docstatus}`);
      }
    }
  }
}

main().catch(console.error);
