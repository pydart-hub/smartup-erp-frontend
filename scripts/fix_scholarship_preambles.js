const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function cleanQuestionText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\s*---\s*PAGE\s*\d+\s*---\s*/gi, "")
    .replace(/^All questions are compulsory.*?\b\d+\.\s*/i, "")
    .replace(/^\s*(?:\d+\.\s*){2,}/, "")
    .trim();
}

async function fix() {
  console.log("=== 1. Updating scholar-9-1 in Database ===");
  const cleanQ9_1 = "Which of the following is both a physical and chemical change?";
  await prisma.question.update({
    where: { id: "scholar-9-1" },
    data: { questionText: cleanQ9_1 },
  });
  console.log("scholar-9-1 updated successfully.");

  console.log("\n=== 2. Fixing Class 12 Q1 and Q3 in Database ===");
  // Question 1 of Class 12: "A body is projected vertically upward..."
  const cleanQ12_1 = "A body is projected vertically upward with velocity 40 m/s. The ratio of time taken to reach half the maximum height to the total time of flight is:";
  await prisma.question.update({
    where: { id: "scholar-12-1" },
    data: {
      questionText: cleanQ12_1,
      correctOption: "B",
      explanation: "Scholarship Exam Question 1",
    },
  });
  // Reset options for scholar-12-1
  await prisma.questionOption.deleteMany({ where: { questionId: "scholar-12-1" } });
  const optData12_1 = [
    { key: "A", text: "1:2", order: 1 },
    { key: "B", text: "1:(2+√2)", order: 2 },
    { key: "C", text: "(√2−1):1", order: 3 },
    { key: "D", text: "1:√2", order: 4 },
  ];
  for (const opt of optData12_1) {
    await prisma.questionOption.create({
      data: {
        id: `scholar-12-1-${opt.key}`,
        questionId: "scholar-12-1",
        optionKey: opt.key,
        optionText: opt.text,
        displayOrder: opt.order,
      },
    });
  }
  console.log("scholar-12-1 restored with its 4 options.");

  // Question 3 of Class 12: "A particle moves such that its displacement..."
  const cleanQ12_3 = "A particle moves such that its displacement is given by x = t³ − 6t² + 9t + 4. The acceleration at t = 2 s is:";
  await prisma.question.upsert({
    where: { id: "scholar-12-3" },
    update: {
      questionText: cleanQ12_3,
      correctOption: "B",
      explanation: "Scholarship Exam Question 3",
      classLevel: "12",
      subjectCode: "SCHOLARSHIP-12",
      isActive: true,
    },
    create: {
      id: "scholar-12-3",
      questionText: cleanQ12_3,
      correctOption: "B",
      explanation: "Scholarship Exam Question 3",
      classLevel: "12",
      subjectCode: "SCHOLARSHIP-12",
      difficulty: "medium",
      isActive: true,
    },
  });
  // Reset options for scholar-12-3
  await prisma.questionOption.deleteMany({ where: { questionId: "scholar-12-3" } });
  const optData12_3 = [
    { key: "A", text: "0 m/s²", order: 1 },
    { key: "B", text: "6 m/s²", order: 2 },
    { key: "C", text: "12 m/s²", order: 3 },
    { key: "D", text: "−6 m/s²", order: 4 },
  ];
  for (const opt of optData12_3) {
    await prisma.questionOption.create({
      data: {
        id: `scholar-12-3-${opt.key}`,
        questionId: "scholar-12-3",
        optionKey: opt.key,
        optionText: opt.text,
        displayOrder: opt.order,
      },
    });
  }
  console.log("scholar-12-3 upserted with its 4 options.");

  // Update PaperQuestion for paper-scholarship-class-12
  console.log("\n=== 3. Updating PaperQuestion links for Class 12 Paper ===");
  const paper12 = await prisma.paper.findUnique({
    where: { id: "paper-scholarship-class-12" },
  });
  if (paper12) {
    // Update displayOrder 1 to scholar-12-1
    await prisma.paperQuestion.updateMany({
      where: { paperId: paper12.id, displayOrder: 1 },
      data: { questionId: "scholar-12-1" },
    });
    // Update displayOrder 3 to scholar-12-3
    await prisma.paperQuestion.updateMany({
      where: { paperId: paper12.id, displayOrder: 3 },
      data: { questionId: "scholar-12-3" },
    });
    console.log("PaperQuestion links updated for paper-scholarship-class-12.");
  }

  // Clean snapshot JSON in ExamAttempt
  console.log("\n=== 4. Sanitizing ExamAttempt paperSnapshotJson ===");
  const attempts = await prisma.examAttempt.findMany({
    where: {
      OR: [
        { classLevel: "9" },
        { classLevel: "12" },
      ],
    },
    select: { id: true, studentName: true, classLevel: true, paperSnapshotJson: true },
  });

  let fixedAttemptsCount = 0;
  for (const att of attempts) {
    if (!att.paperSnapshotJson) continue;
    const raw = typeof att.paperSnapshotJson === 'string'
      ? JSON.parse(att.paperSnapshotJson)
      : att.paperSnapshotJson;
    
    let changed = false;
    if (Array.isArray(raw)) {
      for (const q of raw) {
        if (q.id === "scholar-9-1" || (att.classLevel === "9" && q.displayOrder === 1)) {
          const cleaned = cleanQuestionText(q.questionText);
          if (q.questionText !== cleaned) {
            q.questionText = cleaned;
            changed = true;
          }
        }
        if (att.classLevel === "12" && (q.id === "scholar-12-1" || q.id === "scholar-12-3")) {
          const cleaned = cleanQuestionText(q.questionText);
          if (q.questionText !== cleaned) {
            q.questionText = cleaned;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      await prisma.examAttempt.update({
        where: { id: att.id },
        data: { paperSnapshotJson: JSON.stringify(raw) },
      });
      fixedAttemptsCount++;
      console.log(`Sanitized attempt [${att.id}] for ${att.studentName} (class ${att.classLevel})`);
    }
  }
  console.log(`Total exam attempts sanitized: ${fixedAttemptsCount}`);

  await prisma.$disconnect();
}

fix().catch((err) => {
  console.error("Fix failed:", err);
  process.exit(1);
});
