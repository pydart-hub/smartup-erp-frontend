const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanText(text) {
  if (typeof text !== 'string') return text;
  return text.replace(/\s*---\s*PAGE\s*\d+\s*---\s*/gi, '').trim();
}

async function main() {
  console.log("=== Starting Scholarship Question & Option Cleaning ===");

  // 1. Clean Questions
  const dirtyQuestions = await prisma.question.findMany({
    where: {
      OR: [
        { questionText: { contains: "PAGE", mode: "insensitive" } },
        { questionText: { contains: "---" } },
      ],
    },
    select: { id: true, questionText: true },
  });

  console.log(`Found ${dirtyQuestions.length} dirty questions in DB.`);
  for (const q of dirtyQuestions) {
    const cleaned = cleanText(q.questionText);
    await prisma.question.update({
      where: { id: q.id },
      data: { questionText: cleaned },
    });
    console.log(`Updated question [${q.id}]: "${q.questionText}" -> "${cleaned}"`);
  }

  // 2. Clean Options
  const dirtyOptions = await prisma.questionOption.findMany({
    where: {
      OR: [
        { optionText: { contains: "PAGE", mode: "insensitive" } },
        { optionText: { contains: "---" } },
      ],
    },
    select: { id: true, questionId: true, optionKey: true, optionText: true },
  });

  console.log(`Found ${dirtyOptions.length} dirty options in DB.`);
  for (const o of dirtyOptions) {
    const cleaned = cleanText(o.optionText);
    await prisma.questionOption.update({
      where: { id: o.id },
      data: { optionText: cleaned },
    });
    console.log(`Updated option [${o.id}] (Q ${o.questionId} ${o.optionKey}): "${o.optionText}" -> "${cleaned}"`);
  }

  // 3. Clean ExamAttempt paperSnapshotJson
  console.log("\n=== Checking ExamAttempt records with snapshot noise ===");
  const allAttempts = await prisma.examAttempt.findMany({
    select: { id: true, studentName: true, classLevel: true, paperSnapshotJson: true },
  });

  let fixedAttemptsCount = 0;
  for (const att of allAttempts) {
    if (!att.paperSnapshotJson) continue;
    const rawStr = typeof att.paperSnapshotJson === 'string' 
      ? att.paperSnapshotJson 
      : JSON.stringify(att.paperSnapshotJson);
    
    if (rawStr.includes("PAGE") || rawStr.includes("---")) {
      const parsed = typeof att.paperSnapshotJson === 'string'
        ? JSON.parse(att.paperSnapshotJson)
        : att.paperSnapshotJson;
      
      let modified = false;
      if (Array.isArray(parsed)) {
        for (const q of parsed) {
          const cleanedQ = cleanText(q.questionText);
          if (q.questionText !== cleanedQ) {
            q.questionText = cleanedQ;
            modified = true;
          }
          if (Array.isArray(q.options)) {
            for (const opt of q.options) {
              const cleanedOpt = cleanText(opt.optionText);
              if (opt.optionText !== cleanedOpt) {
                opt.optionText = cleanedOpt;
                modified = true;
              }
            }
          }
        }
      }

      if (modified) {
        await prisma.examAttempt.update({
          where: { id: att.id },
          data: {
            paperSnapshotJson: JSON.stringify(parsed),
          },
        });
        fixedAttemptsCount++;
        console.log(`Cleaned attempt snapshot for [${att.id}] (${att.studentName}, class ${att.classLevel})`);
      }
    }
  }

  console.log(`Total ExamAttempt records updated: ${fixedAttemptsCount}`);

  // 4. Verification
  const remainingQs = await prisma.question.count({
    where: {
      OR: [
        { questionText: { contains: "PAGE", mode: "insensitive" } },
        { questionText: { contains: "---" } },
      ],
    },
  });
  const remainingOpts = await prisma.questionOption.count({
    where: {
      OR: [
        { optionText: { contains: "PAGE", mode: "insensitive" } },
        { optionText: { contains: "---" } },
      ],
    },
  });

  console.log(`\n=== Verification Results ===`);
  console.log(`Remaining dirty questions in DB: ${remainingQs}`);
  console.log(`Remaining dirty options in DB: ${remainingOpts}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error executing fix:", err);
  process.exit(1);
});
