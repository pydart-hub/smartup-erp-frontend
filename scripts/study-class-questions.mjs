import { PrismaClient as LevelUpPrisma } from "../src/generated/levelup-client/index.js";
import { PrismaClient as OfflinePrisma } from "@prisma/client";

const levelupDb = new LevelUpPrisma();
const offlineDb = new OfflinePrisma();

async function analyze() {
  console.log("=================================================");
  console.log("DEEP QUESTION PAPER ANALYSIS (ALL CLASSES)");
  console.log("=================================================\n");

  const pubs = await levelupDb.levelUpPublishing.findMany({
    orderBy: { classLevel: "asc" },
    include: {
      paper: {
        include: {
          questions: {
            include: {
              question: {
                include: { options: { orderBy: { displayOrder: "asc" } } },
              },
            },
            orderBy: { displayOrder: "asc" },
          },
        },
      },
    },
  });

  const questionSetsByClass = new Map();
  const allQuestionTexts = new Map(); // text -> list of classes where it appears

  for (const pub of pubs) {
    const questions = pub.paper?.questions?.map((pq) => pq.question) || [];
    const questionIds = questions.map((q) => q.id);
    const questionTexts = questions.map((q) => q.questionText.trim());

    questionSetsByClass.set(pub.classLevel, {
      title: pub.title,
      slug: pub.slug,
      paperTitle: pub.paper.title,
      paperId: pub.paper.id,
      count: questions.length,
      ids: questionIds,
      firstFiveQuestions: questions.slice(0, 3).map((q, idx) => ({
        num: idx + 1,
        text: q.questionText.replace(/\s+/g, " ").slice(0, 100) + "...",
        difficulty: q.difficulty,
        optionsCount: q.options.length,
        correctOption: q.correctOption,
      })),
    });

    questions.forEach((q) => {
      const simplified = q.questionText.replace(/\s+/g, " ").trim();
      if (!allQuestionTexts.has(simplified)) {
        allQuestionTexts.set(simplified, []);
      }
      allQuestionTexts.get(simplified).push(pub.classLevel);
    });
  }

  // Check overlap across classes
  const classes = Array.from(questionSetsByClass.keys());
  console.log("Classes found in database:", classes.join(", "));
  console.log("-------------------------------------------------");

  for (const [classLevel, data] of questionSetsByClass.entries()) {
    console.log(`\n📚 [Class ${classLevel}] - ${data.title}`);
    console.log(`   Paper ID: ${data.paperId}`);
    console.log(`   Total Questions: ${data.count}`);
    console.log(`   Sample Questions:`);
    data.firstFiveQuestions.forEach((q) => {
      console.log(`     ${q.num}. [${q.correctOption}] ${q.text}`);
    });
  }

  console.log("\n-------------------------------------------------");
  console.log("CROSS-CLASS OVERLAP ANALYSIS (Are questions shared or different?):");
  console.log("-------------------------------------------------");

  // Pairwise intersection check
  for (let i = 0; i < classes.length; i++) {
    for (let j = i + 1; j < classes.length; j++) {
      const c1 = classes[i];
      const c2 = classes[j];
      const ids1 = new Set(questionSetsByClass.get(c1).ids);
      const ids2 = new Set(questionSetsByClass.get(c2).ids);

      const commonIds = [...ids1].filter((id) => ids2.has(id));
      console.log(`- Overlap between Class ${c1} and Class ${c2}: ${commonIds.length} shared questions out of 40`);
    }
  }

  // Count unique questions across whole database
  const totalUniqueQuestions = allQuestionTexts.size;
  const totalSlots = classes.reduce((sum, c) => sum + questionSetsByClass.get(c).count, 0);

  console.log("\n-------------------------------------------------");
  console.log(`Total Question Slots across all classes: ${totalSlots}`);
  console.log(`Total Unique Question Texts in database: ${totalUniqueQuestions}`);
  console.log("=================================================");
}

analyze()
  .catch(console.error)
  .finally(async () => {
    await levelupDb.$disconnect();
    await offlineDb.$disconnect();
  });
