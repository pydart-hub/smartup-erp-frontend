const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const base = 'https://smartup.m.frappe.cloud/api/resource';

const studentId = 'STU-SU THP-26-019';

async function cancelAndRecreatePE() {
  try {
    const peName = 'PEN-10th-Thopumpadi 26-27-019';
    
    // 1. Cancel existing PE
    const resCancel = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.cancel`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ doctype: 'Program Enrollment', name: peName })
    });
    console.log('Cancelled old PE:', await resCancel.json());

    // 2. Create new amended PE
    const resCreate = await fetch(`${base}/Program Enrollment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        student: studentId,
        custom_student_srr: '019',
        student_name: 'Henock joseph',
        enrollment_date: '2026-04-14',
        program: '10th State',
        custom_program_abb: '10th',
        academic_year: '2026-2027',
        student_batch_name: 'Thopumpadi 26-27',
        custom_fee_structure: 'SU THP-10th State-Basic-6',
        custom_plan: 'Basic',
        custom_no_of_instalments: '6',
        amended_from: peName
      })
    });
    const createData = await resCreate.json();
    console.log('Created amended PE:', createData.data?.name || createData);

    if (createData.data?.name) {
      // Submit PE
      const resSubmit = await fetch(`https://smartup.m.frappe.cloud/api/method/frappe.client.submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ doc: createData.data })
      });
      console.log('Submitted amended PE:', await resSubmit.json());
    }

  } catch (e) {
    console.error(e);
  }
}

cancelAndRecreatePE();
