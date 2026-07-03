import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.examAttempt.groupBy({
    by: ['studentBranch'],
    _count: {
      id: true
    }
  });
  console.log("Exam attempts by branch:");
  console.log(JSON.stringify(counts, null, 2));

  // Let's also check a sample of attempts where studentBranch is "Kadavanthara"
  const sampleKadavanthara = await prisma.examAttempt.findMany({
    where: { studentBranch: "Kadavanthara" },
    take: 5,
    select: {
      id: true,
      studentName: true,
      studentBranch: true,
      classLevel: true,
      percentage: true,
      status: true,
    }
  });
  console.log("\nSample Kadavanthara attempts:");
  console.log(JSON.stringify(sampleKadavanthara, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
