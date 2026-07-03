import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting to clear all ExamAttempt and AttemptAnswer data...");

  // Cascade delete is active, but manually deleting both ensures clean truncation
  const deleteAnswersResult = await prisma.attemptAnswer.deleteMany({});
  console.log(`Deleted ${deleteAnswersResult.count} AttemptAnswer records.`);

  const deleteAttemptsResult = await prisma.examAttempt.deleteMany({});
  console.log(`Deleted ${deleteAttemptsResult.count} ExamAttempt records.`);

  console.log("Database clear completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
