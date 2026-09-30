import { PrismaClient as OfflinePrisma } from "@prisma/client";
import { PrismaClient as LevelUpPrisma } from "../src/generated/levelup-client/index.js";

const offlineDb = new OfflinePrisma();
const levelupDb = new LevelUpPrisma();

async function clone() {
  console.log("Starting deep clone of scholarship questions to smartup_online...");

  // 1. Fetch all scholarship publishings from smartup_offline
  const publishings = await offlineDb.examPublishing.findMany({
    where: {
      isActive: true,
      OR: [
        { slug: { startsWith: "scholarship-" } },
        { title: { contains: "Scholarship", mode: "insensitive" } },
      ],
    },
    include: {
      subject: true,
      paper: {
        include: {
          questions: {
            include: {
              question: {
                include: {
                  options: {
                    orderBy: { displayOrder: "asc" },
                  },
                },
              },
            },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });

  console.log(`Found ${publishings.length} scholarship publishings to clone.`);

  for (const pub of publishings) {
    console.log(`\nProcessing: ${pub.title} (${pub.classLevel}) - ${pub.slug}`);

    // A. Ensure Subject exists in smartup_online
    const subjectCode = pub.subjectCode || "GENERAL_GCC";
    const subjectName = pub.subject?.name || "General Knowledge & Aptitude";

    await levelupDb.levelUpSubject.upsert({
      where: { code: subjectCode },
      create: { code: subjectCode, name: subjectName },
      update: { name: subjectName },
    });

    // B. Ensure Paper exists in smartup_online
    const paper = pub.paper;
    if (!paper) {
      console.warn(`No paper found for publishing: ${pub.id}`);
      continue;
    }

    const levelupPaper = await levelupDb.levelUpPaper.upsert({
      where: { id: paper.id },
      create: {
        id: paper.id,
        title: paper.title,
        subjectCode: subjectCode,
        classLevel: pub.classLevel,
        durationMinutes: pub.durationMinutes || 40,
        totalQuestions: paper.questions.length,
        totalMarks: paper.totalMarks,
        status: "Published",
      },
      update: {
        title: paper.title,
        subjectCode: subjectCode,
        classLevel: pub.classLevel,
        durationMinutes: pub.durationMinutes || 40,
        totalQuestions: paper.questions.length,
        totalMarks: paper.totalMarks,
        status: "Published",
      },
    });

    // C. Clone Questions and Options
    for (const pq of paper.questions) {
      const q = pq.question;
      if (!q) continue;

      // Upsert Question
      await levelupDb.levelUpQuestion.upsert({
        where: { id: q.id },
        create: {
          id: q.id,
          subjectCode: subjectCode,
          classLevel: q.classLevel,
          questionText: q.questionText,
          difficulty: q.difficulty || "medium",
          correctOption: q.correctOption,
          explanation: q.explanation || null,
          isActive: true,
        },
        update: {
          subjectCode: subjectCode,
          classLevel: q.classLevel,
          questionText: q.questionText,
          difficulty: q.difficulty || "medium",
          correctOption: q.correctOption,
          explanation: q.explanation || null,
          isActive: true,
        },
      });

      // Clear existing options for idempotency and re-insert
      await levelupDb.levelUpQuestionOption.deleteMany({
        where: { questionId: q.id },
      });

      for (const opt of q.options) {
        await levelupDb.levelUpQuestionOption.create({
          data: {
            id: opt.id,
            questionId: q.id,
            optionKey: opt.optionKey,
            optionText: opt.optionText,
            displayOrder: opt.displayOrder,
          },
        });
      }

      // Link Question to Paper in smartup_online
      const existingLink = await levelupDb.levelUpPaperQuestion.findFirst({
        where: { paperId: levelupPaper.id, questionId: q.id },
      });

      if (!existingLink) {
        await levelupDb.levelUpPaperQuestion.create({
          data: {
            paperId: levelupPaper.id,
            questionId: q.id,
            displayOrder: pq.displayOrder,
            marks: pq.marks || 1,
          },
        });
      }
    }

    // D. Upsert Publishing in smartup_online
    await levelupDb.levelUpPublishing.upsert({
      where: { slug: pub.slug },
      create: {
        id: pub.id,
        slug: pub.slug,
        title: pub.title.replace("SmartUp Scholarship", "LevelUp GCC Scholarship"),
        paperId: levelupPaper.id,
        classLevel: pub.classLevel,
        subjectCode: subjectCode,
        durationMinutes: pub.durationMinutes || 40,
        startAt: pub.startAt || new Date("2026-01-01"),
        endAt: pub.endAt || new Date("2027-12-31"),
        isActive: true,
      },
      update: {
        title: pub.title.replace("SmartUp Scholarship", "LevelUp GCC Scholarship"),
        paperId: levelupPaper.id,
        classLevel: pub.classLevel,
        subjectCode: subjectCode,
        durationMinutes: pub.durationMinutes || 40,
        isActive: true,
      },
    });

    console.log(`Cloned: ${pub.classLevel} -> ${paper.questions.length} questions cloned.`);
  }

  console.log("\nDeep cloning completed successfully into smartup_online!");
}

clone()
  .catch(console.error)
  .finally(async () => {
    await offlineDb.$disconnect();
    await levelupDb.$disconnect();
  });
