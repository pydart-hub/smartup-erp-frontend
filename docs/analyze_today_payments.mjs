import fs from "fs";
import path from "path";

async function run() {
  try {
    const env = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const get = (k) => {
      const m = env.match(new RegExp(k + "=(.*)"));
      return m ? m[1].trim() : "";
    };

    const url = get("NEXT_PUBLIC_FRAPPE_URL");
    const key = get("FRAPPE_API_KEY");
    const secret = get("FRAPPE_API_SECRET");
    const auth = `token ${key}:${secret}`;

    // Get today's Payment Entries (created on 2026-08-31)
    const peRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["docstatus","=",1],["creation",">=","2026-08-31 00:00:00"]]&fields=["name","party_name","paid_amount","mode_of_payment","reference_no","creation"]&order_by=creation+desc&limit_page_length=50`, {
      headers: { Authorization: auth }
    });
    const peData = await peRes.json();
    const payments = peData.data || [];
    console.log(`Analyzing ${payments.length} payment entries recorded today...`);

    const missingReports = [];

    for (const pe of payments) {
      const peDetailRes = await fetch(`${url}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, {
        headers: { Authorization: auth }
      });
      const peDetail = await peDetailRes.json();
      const references = peDetail.data?.references || [];
      const invoiceNames = references.map(r => r.reference_name).filter(Boolean);

      for (const invName of invoiceNames) {
        const invRes = await fetch(`${url}/api/resource/Sales Invoice/${encodeURIComponent(invName)}?fields=["name","student","student_name","customer"]`, {
          headers: { Authorization: auth }
        });
        const invData = await invRes.json();
        const studentId = invData.data?.student;
        let mobile = null;
        let email = null;
        let guardianName = null;

        if (studentId) {
          const stuRes = await fetch(`${url}/api/resource/Student/${encodeURIComponent(studentId)}?fields=["name","student_name","student_mobile_number","student_email_id","custom_parent_name","custom_parent_phone","guardians"]`, {
            headers: { Authorization: auth }
          });
          const stuData = await stuRes.json();
          const stu = stuData.data;

          const guardianLink = stu?.guardians?.[0]?.guardian;
          if (guardianLink) {
            const gRes = await fetch(`${url}/api/resource/Guardian/${encodeURIComponent(guardianLink)}?fields=["name","guardian_name","mobile_number","email_address"]`, {
              headers: { Authorization: auth }
            });
            const gData = await gRes.json();
            mobile = gData.data?.mobile_number;
            email = gData.data?.email_address;
            guardianName = gData.data?.guardian_name;
          }
          if (!mobile) mobile = stu?.custom_parent_phone || stu?.student_mobile_number;
          if (!email) email = stu?.student_email_id;
          if (!guardianName) guardianName = stu?.custom_parent_name || stu?.student_name;
        }

        missingReports.push({
          paymentEntry: pe.name,
          invoiceId: invName,
          studentName: pe.party_name,
          amount: pe.paid_amount,
          mode: pe.mode_of_payment,
          ref: pe.reference_no,
          time: pe.creation,
          guardianName: guardianName || "N/A",
          mobile: mobile || "MISSING ❌",
          email: email || "MISSING ❌",
        });
      }
    }

    console.log("\n=== SUMMARY OF PAYMENTS RECORDED TODAY ===");
    console.table(missingReports);
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
