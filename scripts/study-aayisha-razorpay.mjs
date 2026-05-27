const BASE = 'https://smartup.m.frappe.cloud';
const AUTH = 'token 03330270e330d49:9c2261ae11ac2d2';

const STUDENT_NAME = 'AAYISHA ZEHAN';
const RAZORPAY_ID = 'pay_SsOzeT8kARTXdp';

async function api(path) {
  const r = await fetch(BASE + path, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json' }
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status} ${path}: ${t.slice(0, 500)}`);
  return JSON.parse(t);
}

async function getDoc(doctype, name) {
  return (await api(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`)).data;
}

function print(title, data) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  console.log(`Studying ${STUDENT_NAME} / Razorpay ${RAZORPAY_ID}`);

  const students = (await api(`/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["student_name","=",STUDENT_NAME]]))}&fields=${encodeURIComponent(JSON.stringify(["name","student_name","enabled"]))}&limit=10`)).data || [];
  print('Student by exact name', students);

  const studentsLike = (await api(`/api/resource/Student?filters=${encodeURIComponent(JSON.stringify([["student_name","like","%AAYISHA%"]]))}&fields=${encodeURIComponent(JSON.stringify(["name","student_name","enabled"]))}&limit=20`)).data || [];
  print('Student broad search', studentsLike);

  const peByRef = (await api(`/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["reference_no","=",RAZORPAY_ID]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party_type","party","party_name","company","paid_amount","received_amount","posting_date","mode_of_payment","reference_no","reference_date","docstatus","status","paid_from","paid_to"]))}&limit=20`)).data || [];
  print('Payment Entry by Razorpay reference_no', peByRef);

  let prByRazor = [];
  try {
    prByRazor = (await api(`/api/resource/Payment Request?filters=${encodeURIComponent(JSON.stringify([["razorpay_payment_id","=",RAZORPAY_ID]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party","party_name","grand_total","status","docstatus","razorpay_payment_id"]))}&limit=20`)).data || [];
  } catch (e) {
    print('Payment Request by razorpay_payment_id (query error)', { message: e.message });
  }
  if (prByRazor.length > 0) print('Payment Request by razorpay_payment_id', prByRazor);

  let rzLog = [];
  try {
    rzLog = (await api(`/api/resource/Razorpay Payment Log?filters=${encodeURIComponent(JSON.stringify([["payment_id","=",RAZORPAY_ID]]))}&fields=${encodeURIComponent(JSON.stringify(["name","payment_id","student","amount","status"]))}&limit=20`)).data || [];
  } catch (e) {
    print('Razorpay Payment Log by payment_id (query error)', { message: e.message });
  }
  if (rzLog.length > 0) print('Razorpay Payment Log by payment_id', rzLog);

  if (peByRef.length > 0) {
    const peName = peByRef[0].name;
    const peDoc = await getDoc('Payment Entry', peName);
    const references = peDoc.references || [];
    print(`Payment Entry full (${peName})`, {
      name: peDoc.name,
      party_type: peDoc.party_type,
      party: peDoc.party,
      party_name: peDoc.party_name,
      company: peDoc.company,
      posting_date: peDoc.posting_date,
      mode_of_payment: peDoc.mode_of_payment,
      paid_amount: peDoc.paid_amount,
      paid_from: peDoc.paid_from,
      paid_to: peDoc.paid_to,
      reference_no: peDoc.reference_no,
      reference_date: peDoc.reference_date,
      docstatus: peDoc.docstatus,
      status: peDoc.status,
      references,
    });

    for (const ref of references) {
      if (ref.reference_doctype === 'Sales Invoice' && ref.reference_name) {
        const inv = await getDoc('Sales Invoice', ref.reference_name);
        print(`Sales Invoice full (${ref.reference_name})`, {
          name: inv.name,
          customer: inv.customer,
          student: inv.student,
          company: inv.company,
          posting_date: inv.posting_date,
          due_date: inv.due_date,
          grand_total: inv.grand_total,
          outstanding_amount: inv.outstanding_amount,
          status: inv.status,
          docstatus: inv.docstatus,
          custom_academic_year: inv.custom_academic_year,
          custom_no_of_instalments: inv.custom_no_of_instalments,
          custom_plan: inv.custom_plan,
          items: (inv.items || []).map(i => ({
            idx: i.idx,
            item_code: i.item_code,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
            sales_order: i.sales_order,
            so_detail: i.so_detail,
            description: i.description,
          })),
          payments: (inv.payments || []).map(p => ({
            mode_of_payment: p.mode_of_payment,
            amount: p.amount,
          })),
        });

        const soName = inv.items?.[0]?.sales_order;
        if (soName) {
          const so = await getDoc('Sales Order', soName);
          print(`Sales Order full (${soName})`, {
            name: so.name,
            customer: so.customer,
            student: so.student,
            company: so.company,
            transaction_date: so.transaction_date,
            delivery_date: so.delivery_date,
            custom_academic_year: so.custom_academic_year,
            custom_no_of_instalments: so.custom_no_of_instalments,
            custom_plan: so.custom_plan,
            grand_total: so.grand_total,
            rounded_total: so.rounded_total,
            per_billed: so.per_billed,
            status: so.status,
            docstatus: so.docstatus,
            items: (so.items || []).map(i => ({
              idx: i.idx,
              item_code: i.item_code,
              qty: i.qty,
              rate: i.rate,
              amount: i.amount,
              billed_amt: i.billed_amt,
            })),
          });
        }
      }
    }
  }

  if (students.length > 0) {
    const sid = students[0].name;
    const studentDoc = await getDoc('Student', sid);
    print(`Student full (${sid})`, {
      name: studentDoc.name,
      student_name: studentDoc.student_name,
      enabled: studentDoc.enabled,
      branch: studentDoc.branch,
      custom_branch: studentDoc.custom_branch,
      company: studentDoc.company,
      student_email_id: studentDoc.student_email_id,
    });
    const pesByParty = (await api(`/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["party","=",sid]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party","party_name","company","paid_amount","posting_date","mode_of_payment","reference_no","docstatus","status"]))}&order_by=posting_date desc&limit=30`)).data || [];
    print(`Payment Entries by student id (${sid})`, pesByParty);

    const pesByPartyName = (await api(`/api/resource/Payment Entry?filters=${encodeURIComponent(JSON.stringify([["party_name","=",STUDENT_NAME]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party","party_name","company","paid_amount","posting_date","mode_of_payment","reference_no","docstatus","status"]))}&order_by=posting_date desc&limit=30`)).data || [];
    print(`Payment Entries by party_name (${STUDENT_NAME})`, pesByPartyName);

    const peDetailRows = [];
    for (const pe of pesByPartyName) {
      try {
        const peDoc = await getDoc('Payment Entry', pe.name);
        peDetailRows.push({
          name: peDoc.name,
          posting_date: peDoc.posting_date,
          company: peDoc.company,
          mode_of_payment: peDoc.mode_of_payment,
          paid_amount: peDoc.paid_amount,
          reference_no: peDoc.reference_no,
          paid_from: peDoc.paid_from,
          paid_to: peDoc.paid_to,
          docstatus: peDoc.docstatus,
          status: peDoc.status,
          references: (peDoc.references || []).map(r => ({
            reference_doctype: r.reference_doctype,
            reference_name: r.reference_name,
            allocated_amount: r.allocated_amount,
            total_amount: r.total_amount,
            outstanding_amount: r.outstanding_amount,
          })),
        });
      } catch (e) {
        peDetailRows.push({ name: pe.name, error: e.message });
      }
    }
    print('Payment Entry full details for student', peDetailRows);

    const refInvoices = [...new Set(peDetailRows
      .flatMap(p => p.references || [])
      .filter(r => r.reference_doctype === 'Sales Invoice' && r.reference_name)
      .map(r => r.reference_name))];

    const refInvoiceDocs = [];
    const refSoNames = new Set();
    for (const invName of refInvoices) {
      try {
        const inv = await getDoc('Sales Invoice', invName);
        refInvoiceDocs.push({
          name: inv.name,
          student: inv.student,
          company: inv.company,
          posting_date: inv.posting_date,
          due_date: inv.due_date,
          grand_total: inv.grand_total,
          outstanding_amount: inv.outstanding_amount,
          status: inv.status,
          docstatus: inv.docstatus,
          items: (inv.items || []).map(i => ({
            item_code: i.item_code,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
            sales_order: i.sales_order,
            so_detail: i.so_detail,
          })),
        });
        for (const it of inv.items || []) {
          if (it.sales_order) refSoNames.add(it.sales_order);
        }
      } catch (e) {
        refInvoiceDocs.push({ name: invName, error: e.message });
      }
    }
    print('Sales Invoice docs referenced by payment entries', refInvoiceDocs);

    const refSoDocs = [];
    for (const soName of refSoNames) {
      try {
        const so = await getDoc('Sales Order', soName);
        refSoDocs.push({
          name: so.name,
          student: so.student,
          company: so.company,
          transaction_date: so.transaction_date,
          delivery_date: so.delivery_date,
          custom_plan: so.custom_plan,
          custom_no_of_instalments: so.custom_no_of_instalments,
          grand_total: so.grand_total,
          per_billed: so.per_billed,
          status: so.status,
          docstatus: so.docstatus,
          items: (so.items || []).map(i => ({
            item_code: i.item_code,
            qty: i.qty,
            rate: i.rate,
            amount: i.amount,
            billed_amt: i.billed_amt,
          })),
        });
      } catch (e) {
        refSoDocs.push({ name: soName, error: e.message });
      }
    }
    print('Sales Order docs referenced by those invoices', refSoDocs);

    // Payment Request search by party and then inspect full docs for razorpay_payment_id
    const prListByParty = (await api(`/api/resource/Payment Request?filters=${encodeURIComponent(JSON.stringify([["party","=",sid]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party","party_name","status","docstatus"]))}&order_by=creation desc&limit=50`)).data || [];
    print(`Payment Request list by party (${sid})`, prListByParty);

    const prListByPartyName = (await api(`/api/resource/Payment Request?filters=${encodeURIComponent(JSON.stringify([["party_name","=",STUDENT_NAME]]))}&fields=${encodeURIComponent(JSON.stringify(["name","party","party_name","status","docstatus"]))}&order_by=creation desc&limit=50`)).data || [];
    print(`Payment Request list by party_name (${STUDENT_NAME})`, prListByPartyName);

    const allPrNames = [...new Set([...prListByParty, ...prListByPartyName].map(x => x.name))];
    const prDocs = [];
    for (const prName of allPrNames) {
      try {
        const doc = await getDoc('Payment Request', prName);
        prDocs.push({
          name: doc.name,
          party: doc.party,
          party_name: doc.party_name,
          grand_total: doc.grand_total,
          status: doc.status,
          docstatus: doc.docstatus,
          payment_gateway_account: doc.payment_gateway_account,
          razorpay_payment_id: doc.razorpay_payment_id,
          payment_order_id: doc.payment_order_id,
          reference_doctype: doc.reference_doctype,
          reference_name: doc.reference_name,
        });
      } catch (e) {
        prDocs.push({ name: prName, error: e.message });
      }
    }
    print('Payment Request full docs for student', prDocs);

    const matchingPr = prDocs.filter(d => d.razorpay_payment_id === RAZORPAY_ID);
    print(`Payment Request docs matching ${RAZORPAY_ID}`, matchingPr);

    const invoices = (await api(`/api/resource/Sales Invoice?filters=${encodeURIComponent(JSON.stringify([["student","=",sid]]))}&fields=${encodeURIComponent(JSON.stringify(["name","company","posting_date","due_date","grand_total","outstanding_amount","status","docstatus"]))}&order_by=posting_date desc&limit=30`)).data || [];
    print(`Sales Invoices by student (${sid})`, invoices);

    const enroll = (await api(`/api/resource/Program Enrollment?filters=${encodeURIComponent(JSON.stringify([["student","=",sid]]))}&fields=${encodeURIComponent(JSON.stringify(["name","student","student_name","docstatus"]))}&order_by=creation desc&limit=10`)).data || [];
    print(`Program Enrollment by student (${sid})`, enroll);

    for (const en of enroll) {
      try {
        const enDoc = await getDoc('Program Enrollment', en.name);
        print(`Program Enrollment full (${en.name})`, {
          name: enDoc.name,
          student: enDoc.student,
          student_name: enDoc.student_name,
          company: enDoc.company,
          academic_year: enDoc.academic_year,
          program: enDoc.program,
          branch: enDoc.branch,
          custom_branch: enDoc.custom_branch,
          custom_plan: enDoc.custom_plan,
          custom_no_of_instalments: enDoc.custom_no_of_instalments,
          docstatus: enDoc.docstatus,
        });
      } catch (e) {
        print(`Program Enrollment full (${en.name}) query error`, { message: e.message });
      }
    }
  }

  console.log('\n=== DONE ===');
}

main().catch((e) => {
  console.error('\nFAILED:', e.message);
  process.exit(1);
});
