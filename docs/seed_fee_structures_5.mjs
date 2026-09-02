import fs from 'fs';

const baseUrl = 'https://smartup.m.frappe.cloud';
const apiKey = '03330270e330d49';
const apiSecret = '9c2261ae11ac2d2';

const headers = {
  'Authorization': `token ${apiKey}:${apiSecret}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

const branchList = [
  { company: 'Smart Up Chullickal', abbr: 'SU CHL', branchGroup: 'Tier 1' },
  { company: 'Smart Up Fortkochi', abbr: 'SU FKO', branchGroup: 'Tier 1' },
  { company: 'Smart Up Palluruthy', abbr: 'SU PLR', branchGroup: 'Tier 1' },
  { company: 'Smart Up Eraveli', abbr: 'SU ERV', branchGroup: 'Eraveli' },
  { company: 'Smart Up Thopumpadi', abbr: 'SU THP', branchGroup: 'Thoppumpady' },
  { company: 'Smart Up Moolamkuzhi', abbr: 'SU MMK', branchGroup: 'Moolamkuzhi' },
  { company: 'Smart Up Vennala', abbr: 'SU VYT', branchGroup: 'Vennala' },
  { company: 'Smart Up Kadavanthara', abbr: 'SU KDV', branchGroup: 'Kadavanthara' },
  { company: 'Smart Up Edappally', abbr: 'SU EDPLY', branchGroup: 'Edapally' }
];

const programToClassMap = {
  '8th State': '8 State',
  '8th CBSE': '8 Cbse',
  '9th State': '9 State',
  '9th CBSE': '9 Cbse',
  '10th State': '10 State',
  '10th CBSE': '10 Cbse',
  '11th Science State': 'Plus One',
  '11th Science CBSE': 'Plus One',
  '12th Science State': 'Plus Two',
  '12th Science CBSE': 'Plus Two'
};

async function seedFeeStructures5() {
  const feeConfig = JSON.parse(fs.readFileSync('docs/fee_structure_parsed.json', 'utf8'));

  console.log("Starting creation of Fee Structure records with custom_no_of_instalments = '5'...");

  let createdCount = 0;
  let alreadyExistsCount = 0;

  for (const branch of branchList) {
    for (const [progName, clsName] of Object.entries(programToClassMap)) {
      const key = `${branch.branchGroup}|Basic|${clsName}`;
      const entry = feeConfig[key];
      if (!entry) continue; // Branch does not offer this class

      const fsName = `${branch.abbr}-${progName}-Basic-5`;
      const totalAmount = entry.annual_fee;
      const tuitionAmount = totalAmount - 1000;
      const admissionFee = 1000;

      // 1. Check if already exists
      const checkRes = await fetch(`${baseUrl}/api/resource/Fee%20Structure/${encodeURIComponent(fsName)}`, { headers });
      if (checkRes.status === 200) {
        // Already exists, check if total_amount matches
        const existingDoc = (await checkRes.json()).data;
        if (existingDoc?.total_amount !== totalAmount) {
          console.log(`Updating existing ${fsName} amount from ${existingDoc.total_amount} -> ${totalAmount}`);
          await fetch(`${baseUrl}/api/resource/Fee%20Structure/${encodeURIComponent(fsName)}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              total_amount: totalAmount,
              components: [
                { fees_category: `${progName} Tuition Fee`, amount: tuitionAmount, item: `${progName} Tuition Fee`, total: tuitionAmount },
                { fees_category: 'Admission Fee', amount: admissionFee, item: 'Admission Fee', total: admissionFee }
              ]
            })
          });
        }
        alreadyExistsCount++;
        continue;
      }

      // 2. Create new Fee Structure
      const payload = {
        doctype: "Fee Structure",
        name: fsName,
        program: progName,
        custom_plan: "Basic",
        academic_year: "2026-2027",
        custom_no_of_instalments: "5",
        total_amount: totalAmount,
        receivable_account: `Debtors - ${branch.abbr}`,
        custom_branch_abbr: branch.abbr,
        company: branch.company,
        cost_center: `Main - ${branch.abbr}`,
        docstatus: 1,
        components: [
          {
            fees_category: `${progName} Tuition Fee`,
            amount: tuitionAmount,
            item: `${progName} Tuition Fee`,
            discount: 0,
            total: tuitionAmount
          },
          {
            fees_category: "Admission Fee",
            amount: admissionFee,
            item: "Admission Fee",
            discount: 0,
            total: admissionFee
          }
        ]
      };

      const createRes = await fetch(`${baseUrl}/api/resource/Fee%20Structure`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const createData = await createRes.json();
      if (createData.data?.name) {
        console.log(`✓ Created Fee Structure: ${createData.data.name} (₹${totalAmount})`);
        createdCount++;
      } else {
        console.error(`✗ Error creating ${fsName}:`, createData);
      }
    }
  }

  console.log(`\n================ COMPLETED ================`);
  console.log(`Created: ${createdCount} new Fee Structures`);
  console.log(`Already Existing: ${alreadyExistsCount}`);
}

seedFeeStructures5().catch(console.error);
