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

    // 1. Check recent Payment Entries
    console.log("=== CHECKING RECENT PAYMENT ENTRIES (Last 30 days) ===");
    const peRes = await fetch(`${url}/api/resource/Payment Entry?filters=[["docstatus","=",1]]&fields=["name","posting_date","party_name","paid_amount","mode_of_payment","reference_no","creation"]&order_by=creation+desc&limit_page_length=20`, {
      headers: { Authorization: auth }
    });
    const peData = await peRes.json();
    const payments = peData.data || [];
    console.log(`Found ${payments.length} recent submitted Payment Entries.`);

    // 2. Inspect linked invoices and references
    for (const pe of payments.slice(0, 10)) {
      console.log(`\n--------------------------------------------------`);
      console.log(`Payment Entry: ${pe.name} | Date: ${pe.posting_date} | Amount: ₹${pe.paid_amount} | Mode: ${pe.mode_of_payment}`);
      console.log(`Party: ${pe.party_name} | Ref: ${pe.reference_no} | Created: ${pe.creation}`);
      
      // Get detailed references
      const peDetailRes = await fetch(`${url}/api/resource/Payment Entry/${encodeURIComponent(pe.name)}`, {
        headers: { Authorization: auth }
      });
      const peDetail = await peDetailRes.json();
      const references = peDetail.data?.references || [];
      const invoiceNames = references.map(r => r.reference_name).filter(Boolean);
      console.log(`Linked Invoice(s):`, invoiceNames);

      // Check comments / logs on the invoice
      for (const invName of invoiceNames) {
        const invRes = await fetch(`${url}/api/resource/Sales Invoice/${encodeURIComponent(invName)}?fields=["name","student","student_name","customer"]`, {
          headers: { Authorization: auth }
        });
        const invData = await invRes.json();
        const studentId = invData.data?.student;
        console.log(`  -> Invoice: ${invName} | Student: ${studentId || "NONE"} (${invData.data?.student_name || "N/A"})`);

        if (studentId) {
          const stuRes = await fetch(`${url}/api/resource/Student/${encodeURIComponent(studentId)}?fields=["name","student_name","student_mobile_number","student_email_id","custom_parent_name","custom_parent_phone","guardians"]`, {
            headers: { Authorization: auth }
          });
          const stuData = await stuRes.json();
          const stu = stuData.data;
          console.log(`     Student Doc Contact: Mobile="${stu?.student_mobile_number || ''}", ParentPhone="${stu?.custom_parent_phone || ''}", Email="${stu?.student_email_id || ''}"`);
          const guardianLink = stu?.guardians?.[0]?.guardian;
          if (guardianLink) {
            const gRes = await fetch(`${url}/api/resource/Guardian/${encodeURIComponent(guardianLink)}?fields=["name","guardian_name","mobile_number","email_address"]`, {
              headers: { Authorization: auth }
            });
            const gData = await gRes.json();
            console.log(`     Guardian Doc (${guardianLink}): Name="${gData.data?.guardian_name}", Mobile="${gData.data?.mobile_number}", Email="${gData.data?.email_address}"`);
          } else {
            console.log(`     Guardian Doc: ❌ NO GUARDIAN LINKED`);
          }
        }
      }
    }

  } catch (err) {
    console.error("Error inspecting payments:", err);
  }
}

run();
