const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function fixRupee(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/■/g, '₹');
}

async function run() {
  console.log("=== Fixing Rupee symbol (■ -> ₹) in Questions ===");
  const questions = await prisma.question.findMany({
    where: {
      questionText: { contains: '■' },
    },
  });
  console.log(`Found ${questions.length} questions with ■`);
  for (const q of questions) {
    const updated = fixRupee(q.questionText);
    await prisma.question.update({
      where: { id: q.id },
      data: { questionText: updated },
    });
    console.log(`Updated question [${q.id}]: ${q.questionText} -> ${updated}`);
  }

  console.log("\n=== Fixing Rupee symbol (■ -> ₹) in Options ===");
  const options = await prisma.questionOption.findMany({
    where: {
      optionText: { contains: '■' },
    },
  });
  console.log(`Found ${options.length} options with ■`);
  for (const o of options) {
    const updated = fixRupee(o.optionText);
    await prisma.questionOption.update({
      where: { id: o.id },
      data: { optionText: updated },
    });
    console.log(`Updated option [${o.id}]: ${o.optionText} -> ${updated}`);
  }

  console.log("\n=== Fixing Rupee symbol in ExamAttempt paperSnapshotJson ===");
  const attempts = await prisma.examAttempt.findMany({
    where: { classLevel: '9' },
    select: { id: true, studentName: true, paperSnapshotJson: true },
  });
  let attemptCount = 0;
  for (const att of attempts) {
    if (!att.paperSnapshotJson) continue;
    const rawStr = typeof att.paperSnapshotJson === 'string'
      ? att.paperSnapshotJson
      : JSON.stringify(att.paperSnapshotJson);
    if (rawStr.includes('■')) {
      const fixedStr = fixRupee(rawStr);
      await prisma.examAttempt.update({
        where: { id: att.id },
        data: { paperSnapshotJson: JSON.parse(fixedStr) },
      });
      attemptCount++;
      console.log(`Cleaned attempt [${att.id}] for ${att.studentName}`);
    }
  }
  console.log(`Fixed ${attemptCount} exam attempts.`);

  await prisma.$disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
