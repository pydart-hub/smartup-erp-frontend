import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting Seeding Scholarship Exams into Database...");

  const jsonPath = path.join(process.cwd(), "docs", "scholarship_exams_ready.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`File not found: ${jsonPath}`);
  }

  const papersData: Record<
    string,
    {
      title: string;
      classLevel: string;
      subjectCode: string;
      subjectName: string;
      durationMinutes: number;
      questions: Array<{
        questionNumber: number;
        questionText: string;
        options: Array<{ key: string; text: string }>;
        correctOption: string;
      }>;
    }
  > = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  for (const [classLevel, pData] of Object.entries(papersData)) {
    console.log(`\n========================================`);
    console.log(`Processing ${pData.title} (${pData.subjectCode})`);

    // 1. Upsert Subject
    await prisma.subject.upsert({
      where: { code: pData.subjectCode },
      update: { name: pData.subjectName },
      create: { code: pData.subjectCode, name: pData.subjectName },
    });

    // 2. Insert or update 40 questions
    const questionIds: string[] = [];
    for (const q of pData.questions) {
      const qId = `scholar-${classLevel}-${q.questionNumber}`;

      const questionRecord = await prisma.question.upsert({
        where: { id: qId },
        update: {
          subjectCode: pData.subjectCode,
          classLevel: classLevel,
          questionText: q.questionText,
          correctOption: q.correctOption,
          difficulty: "medium",
          explanation: `Scholarship Exam Question ${q.questionNumber}`,
          isActive: true,
        },
        create: {
          id: qId,
          subjectCode: pData.subjectCode,
          classLevel: classLevel,
          questionText: q.questionText,
          correctOption: q.correctOption,
          difficulty: "medium",
          explanation: `Scholarship Exam Question ${q.questionNumber}`,
          isActive: true,
        },
      });

      // Clear existing options
      await prisma.questionOption.deleteMany({
        where: { questionId: questionRecord.id },
      });

      // Insert options
      for (let i = 0; i < q.options.length; i++) {
        const opt = q.options[i];
        const optId = `${qId}-${opt.key}`;
        await prisma.questionOption.create({
          data: {
            id: optId,
            questionId: questionRecord.id,
            optionKey: opt.key,
            optionText: opt.text,
            displayOrder: i + 1,
          },
        });
      }

      questionIds.push(questionRecord.id);
    }

    // 3. Upsert Paper Template
    const paperId = `paper-scholarship-class-${classLevel}`;
    const paper = await prisma.paper.upsert({
      where: { id: paperId },
      update: {
        title: pData.title,
        subjectCode: pData.subjectCode,
        classLevel: classLevel,
        durationMinutes: pData.durationMinutes,
        totalQuestions: questionIds.length,
        totalMarks: questionIds.length,
        status: "Published",
      },
      create: {
        id: paperId,
        title: pData.title,
        subjectCode: pData.subjectCode,
        classLevel: classLevel,
        durationMinutes: pData.durationMinutes,
        totalQuestions: questionIds.length,
        totalMarks: questionIds.length,
        status: "Published",
      },
    });

    // Link Questions to Paper
    await prisma.paperQuestion.deleteMany({
      where: { paperId: paper.id },
    });

    for (let idx = 0; idx < questionIds.length; idx++) {
      await prisma.paperQuestion.create({
        data: {
          paperId: paper.id,
          questionId: questionIds[idx],
          displayOrder: idx + 1,
          marks: 1,
        },
      });
    }

    // 4. Create Active Exam Publishing
    const slug = `scholarship-exam-class-${classLevel}`;
    await prisma.examPublishing.upsert({
      where: { slug },
      update: {
        title: pData.title,
        paperId: paper.id,
        classLevel: classLevel,
        subjectCode: pData.subjectCode,
        durationMinutes: pData.durationMinutes,
        isActive: true,
        startAt: new Date("2026-01-01T00:00:00Z"),
        endAt: new Date("2030-12-31T23:59:59Z"),
      },
      create: {
        slug,
        title: pData.title,
        paperId: paper.id,
        classLevel: classLevel,
        subjectCode: pData.subjectCode,
        durationMinutes: pData.durationMinutes,
        startAt: new Date("2026-01-01T00:00:00Z"),
        endAt: new Date("2030-12-31T23:59:59Z"),
        isActive: true,
      },
    });

    console.log(`✅ Successfully published: ${slug} (${pData.title}) with ${questionIds.length} MCQs`);
  }

  console.log("\nAll 5 Scholarship Exams successfully seeded into the database!");
}

main()
  .catch((e) => {
    console.error("Error seeding scholarship exams:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
