const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== Updating scholar-9-32-C Option in Database ===");
  const opt = await prisma.questionOption.update({
    where: { id: 'scholar-9-32-C' },
    data: { optionText: 'OPRUI' },
  });
  console.log("Updated QuestionOption:", opt);

  console.log("\n=== Updating any Class 9 ExamAttempt paperSnapshotJson containing scholar-9-32 ===");
  const attempts = await prisma.examAttempt.findMany({
    where: { classLevel: '9' },
    select: { id: true, studentName: true, paperSnapshotJson: true },
  });

  let count = 0;
  for (const att of attempts) {
    if (!att.paperSnapshotJson) continue;
    const raw = typeof att.paperSnapshotJson === 'string'
      ? JSON.parse(att.paperSnapshotJson)
      : att.paperSnapshotJson;

    let modified = false;
    if (Array.isArray(raw)) {
      for (const q of raw) {
        if (q.id === 'scholar-9-32' || q.displayOrder === 32) {
          if (Array.isArray(q.options)) {
            for (const o of q.options) {
              if (o.optionKey === 'C' && o.optionText === 'OPSUI') {
                o.optionText = 'OPRUI';
                modified = true;
              }
            }
          }
        }
      }
    }

    if (modified) {
      await prisma.examAttempt.update({
        where: { id: att.id },
        data: { paperSnapshotJson: JSON.stringify(raw) },
      });
      count++;
      console.log(`Updated attempt snapshot for [${att.id}] (${att.studentName})`);
    }
  }

  console.log(`Total exam attempts updated: ${count}`);

  // Verify
  const q = await prisma.question.findUnique({
    where: { id: 'scholar-9-32' },
    include: { options: { orderBy: { displayOrder: 'asc' } } },
  });
  console.log("\n=== Verification ===");
  console.log("scholar-9-32 Options now:", q.options.map(o => `${o.optionKey}: ${o.optionText}`));

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Failed to update:", err);
  process.exit(1);
});
