import { db } from "../lib/public-exam/db";

async function main() {
  const attempts = await db.examAttempt.findMany({
    where: {
      OR: [
        { studentName: { contains: "AADHIL", mode: "insensitive" } },
        { studentName: { contains: "SANTHIAVU", mode: "insensitive" } }
      ]
    },
    select: {
      id: true,
      studentName: true,
      studentPhone: true,
      studentBranch: true,
      classLevel: true,
      status: true,
      scoreObtained: true,
      totalMarks: true,
      publishing: {
        select: {
          title: true,
          subjectCode: true,
          subject: { select: { name: true } }
        }
      },
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });

  console.log("=== FOUND ATTEMPTS ===");
  console.log(JSON.stringify(attempts, null, 2));
}

main().catch(console.error).finally(() => process.exit(0));
