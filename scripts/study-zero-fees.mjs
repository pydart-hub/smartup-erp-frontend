const headers = {
  'Authorization': 'token 03330270e330d49:9c2261ae11ac2d2',
  'Content-Type': 'application/json'
};
const baseUrl = 'https://smartup.m.frappe.cloud';

async function investigate() {
  const targetStudents = [
    { name: 'RAZEENA T S', row: 525 },
    { name: 'PRANAV KRISHNA V', row: 630 },
    { name: 'Amal jacob', row: 686 },
    { name: 'Jewel Mariya Jino', row: 875 },
    { name: 'MUHAMMED NIHAL TS', row: 896 },
    { name: 'ALFIN THOMAS', row: 1079 },
    { name: 'FAYZA V SHAMEER', row: 1162 },
    { name: 'SHREYA KRISHNA M', row: 1170 },
    { name: 'Akash V.S', row: 1285 },
    { name: 'Lijoy george', row: 1323 },
    { name: 'Anton Yanis Jose', row: 1548 },
    { name: 'NEHA FATHIMA YASIR', row: 1550 },
    { name: 'THASMIN FATHIMA K I', row: 1551 },
    { name: 'RISANA BEEVI', row: 1592 },
    { name: 'RAFA QAIS', row: 1604 },
    { name: 'Fazan Faisal', row: 1627 },
    { name: 'Rachel Rinto', row: 1641 }
  ];

  for (const item of targetStudents) {
    console.log(`\n======================================================`);
    console.log(`Row ${item.row}: ${item.name}`);
    console.log(`======================================================`);

    const sRes = await fetch(`${baseUrl}/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([['student_name', 'like', `%${item.name}%`]]))}&fields=${encodeURIComponent(JSON.stringify(['*']))}`, { headers });
    const sData = (await sRes.json()).data;
    if (!sData || !sData.length) {
      console.log('No Student found!');
      continue;
    }
    const student = sData[0];
    console.log(`ID: ${student.name} | Customer: ${student.customer} | Branch: ${student.custom_branch}`);
    console.log(`Type: ${student.custom_student_type} | Joined: ${student.joining_date} | Enabled: ${student.enabled} | Disc Date: ${student.custom_discontinuation_date}`);
    console.log(`Created: ${student.creation} by ${student.owner}`);

    // Check Program Enrollment
    const peRes = await fetch(`${baseUrl}/api/resource/Program%20Enrollment?filters=${encodeURIComponent(JSON.stringify([['student', '=', student.name]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'docstatus', 'program', 'student_batch_name', 'custom_fee_structure', 'custom_plan', 'creation', 'owner']))}`, { headers });
    const peData = (await peRes.json()).data;
    console.log('Program Enrollment:', peData);

    // Check SO by customer
    let soByCust = [];
    if (student.customer) {
      const soRes = await fetch(`${baseUrl}/api/resource/Sales%20Order?filters=${encodeURIComponent(JSON.stringify([['customer', '=', student.customer]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'docstatus', 'grand_total', 'status', 'creation', 'owner']))}`, { headers });
      soByCust = (await soRes.json()).data || [];
    }
    console.log('Sales Orders by Customer:', soByCust);

    // Check SI by customer
    let siByCust = [];
    if (student.customer) {
      const siRes = await fetch(`${baseUrl}/api/resource/Sales%20Invoice?filters=${encodeURIComponent(JSON.stringify([['customer', '=', student.customer]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'docstatus', 'grand_total', 'outstanding_amount', 'posting_date', 'creation']))}`, { headers });
      siByCust = (await siRes.json()).data || [];
    }
    console.log('Sales Invoices by Customer:', siByCust);

    // Also check if any SO exists matching student name or mobile
    const soByName = await fetch(`${baseUrl}/api/resource/Sales%20Order?filters=${encodeURIComponent(JSON.stringify([['customer_name', 'like', `%${item.name}%`]]))}&fields=${encodeURIComponent(JSON.stringify(['name', 'customer', 'docstatus', 'grand_total']))}`, { headers });
    const soByNameData = (await soByName.json()).data || [];
    if (soByNameData.length && (!soByCust.length || soByNameData[0].name !== soByCust[0]?.name)) {
      console.log('⚠️ Sales Order found under different customer name:', soByNameData);
    }
  }
}

investigate();
