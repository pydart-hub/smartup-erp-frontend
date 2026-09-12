const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("=== Updating scholar-11-3-B in Database ===");
  const opt = await prisma.questionOption.update({
    where: { id: 'scholar-11-3-B' },
    data: { optionText: 'Centre of curvature' },
  });
  console.log("Updated QuestionOption scholar-11-3-B:", opt);

  console.log("\n=== Updating Class 11 ExamAttempt paperSnapshotJson ===");
  const attempts = await prisma.examAttempt.findMany({
    where: { classLevel: '11' },
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
        if (q.id === 'scholar-11-3' || q.displayOrder === 3) {
          if (Array.isArray(q.options)) {
            for (const o of q.options) {
              if (o.optionKey === 'B' && o.optionText.includes('1. 2. 3. 4.')) {
                o.optionText = 'Centre of curvature';
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
    where: { id: 'scholar-11-3' },
    include: { options: { orderBy: { displayOrder: 'asc' } } },
  });
  console.log("\n=== Verification ===");
  console.log("Question Text:", q.questionText);
  console.log("Options now:", q.options.map(o => `${o.optionKey}: ${o.optionText}`));

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Failed to update:", err);
  process.exit(1);
});
