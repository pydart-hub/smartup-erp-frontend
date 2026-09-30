import { getAllBranchesSummary } from "../src/app/api/director/report-summary/route.ts";

async function run() {
  const summary = await getAllBranchesSummary();
  console.log("Director Summary:", JSON.stringify(summary, null, 2));
  const totals = summary.reduce(
    (acc, r) => ({
      totalStudents: acc.totalStudents + r.totalStudents,
      active: acc.active + r.active,
      discontinued: acc.discontinued + r.discontinued,
      staff: acc.staff + r.staff,
      totalFee: acc.totalFee + r.totalFee,
      collectedFee: acc.collectedFee + r.collectedFee,
      pendingFee: acc.pendingFee + r.pendingFee,
    }),
    { totalStudents: 0, active: 0, discontinued: 0, staff: 0, totalFee: 0, collectedFee: 0, pendingFee: 0 }
  );
  console.log("TOTALS:", totals);
}

run().catch(console.error);
