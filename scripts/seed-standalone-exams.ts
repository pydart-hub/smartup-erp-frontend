import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const JSON_DIR = path.join(process.cwd(), "docs", "Level Test", "JSON");
const SUBJECT_FILES = [
  { file: "biology.json", code: "BIOLOGY", name: "Biology" },
  { file: "chemistry.json", code: "CHEMISTRY", name: "Chemistry" },
  { file: "english.json", code: "ENGLISH", name: "English" },
  { file: "hindi.json", code: "HINDI", name: "Hindi" },
  { file: "malayalam.json", code: "MALAYALAM", name: "Malayalam" },
  { file: "maths.json", code: "MATHS", name: "Maths" },
  { file: "physics.json", code: "PHYSICS", name: "Physics" },
];

function normalizeLevelCode(value: string): string {
  const match = String(value || "").match(/\b(10|[5-9])(?:st|nd|rd|th)?\b/i);
  return match ? match[1] : String(value || "");
}

// Rules mapping student class level to cumulative standard questions
const GRADE_LEVEL_RULES: Record<string, string[]> = {
  "8": ["5", "6", "7"],
  "9": ["5", "6", "7", "8"],
  "10": ["5", "6", "7", "8", "9"],
};

async function main() {
  console.log("Starting Seeding Standalone Exam Database...");

  for (const item of SUBJECT_FILES) {
    const filePath = path.join(JSON_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}, skipping.`);
      continue;
    }

    console.log(`Processing subject: ${item.name} (${item.code})...`);

    // Create Subject
    await prisma.subject.upsert({
      where: { code: item.code },
      update: { name: item.name },
      create: { code: item.code, name: item.name },
    });

    const raw = fs.readFileSync(filePath, "utf8");
    const doc = JSON.parse(raw);

    const questionsObject = doc.levels || {};
    const questionIdsList: string[] = [];

    // 1. Insert Questions
    for (const [levelKey, questionsArray] of Object.entries(questionsObject)) {
      if (!Array.isArray(questionsArray)) continue;

      const sourceLevel = normalizeLevelCode(levelKey);
      console.log(`  Level ${sourceLevel}: Found ${questionsArray.length} questions`);

      for (const question of questionsArray) {
        const text = question.question_text || "";
        const correct = question.correct_option_key || "";
        const options = question.options || [];

        // Quality check
        if (!text.trim() || !correct.trim() || options.length < 2) {
          console.warn(`    Skipping invalid question ID: ${question.id}`);
          continue;
        }

        // Upsert Question
        const qRecord = await prisma.question.upsert({
          where: { id: question.id },
          update: {
            questionText: text,
            correctOption: correct,
            difficulty: question.difficulty || "medium",
            explanation: question.review_note || "",
            classLevel: sourceLevel,
            isActive: true,
          },
          create: {
            id: question.id,
            subjectCode: item.code,
            questionText: text,
            correctOption: correct,
            difficulty: question.difficulty || "medium",
            explanation: question.review_note || "",
            classLevel: sourceLevel,
            isActive: true,
          },
        });

        // Upsert Options
        for (let i = 0; i < options.length; i++) {
          const option = options[i];
          const optionId = option.id || `${question.id}-${option.option_key}`;
          await prisma.questionOption.upsert({
            where: { id: optionId },
            update: {
              optionText: option.option_text,
              optionKey: option.option_key,
              displayOrder: i + 1,
            },
            create: {
              id: optionId,
              questionId: qRecord.id,
              optionText: option.option_text,
              optionKey: option.option_key,
              displayOrder: i + 1,
            },
          });
        }

        questionIdsList.push(qRecord.id);
      }
    }

    // 2. Create Paper templates and Publishings for classes 8, 9, 10
    for (const classLevel of ["8", "9", "10"]) {
      const allowedSourceLevels = GRADE_LEVEL_RULES[classLevel];
      
      // Get all questions matching these source levels for this subject
      const eligibleQuestions = await prisma.question.findMany({
        where: {
          subjectCode: item.code,
          classLevel: { in: allowedSourceLevels },
          isActive: true,
        },
        orderBy: { classLevel: "asc" },
      });

      if (eligibleQuestions.length === 0) {
        console.log(`  No questions eligible for Class ${classLevel} ${item.name} exam. Skipping paper.`);
        continue;
      }

      const paperTitle = `Class ${classLevel} ${item.name} Diagnosis Exam`;
      const paperId = `paper-${item.code.toLowerCase()}-${classLevel}`;

      console.log(`  Creating paper: ${paperTitle} (${eligibleQuestions.length} questions)...`);

      // Upsert Paper template
      const paper = await prisma.paper.upsert({
        where: { id: paperId },
        update: {
          title: paperTitle,
          durationMinutes: Math.max(20, eligibleQuestions.length * 1.5),
          totalQuestions: eligibleQuestions.length,
          totalMarks: eligibleQuestions.length,
          status: "Published",
        },
        create: {
          id: paperId,
          title: paperTitle,
          subjectCode: item.code,
          classLevel: classLevel,
          durationMinutes: Math.max(20, eligibleQuestions.length * 1.5),
          totalQuestions: eligibleQuestions.length,
          totalMarks: eligibleQuestions.length,
          status: "Published",
        },
      });

      // Clear existing links
      await prisma.paperQuestion.deleteMany({
        where: { paperId: paper.id },
      });

      // Insert paper links
      for (let index = 0; index < eligibleQuestions.length; index++) {
        const q = eligibleQuestions[index];
        await prisma.paperQuestion.create({
          data: {
            paperId: paper.id,
            questionId: q.id,
            displayOrder: index + 1,
            marks: 1,
          },
        });
      }

      // Create live Exam Publishing
      const slug = `${item.code.toLowerCase()}-class-${classLevel}`;
      await prisma.examPublishing.upsert({
        where: { slug },
        update: {
          title: paperTitle,
          durationMinutes: paper.durationMinutes,
          isActive: true,
          startAt: new Date("2026-01-01T00:00:00Z"),
          endAt: new Date("2030-12-31T23:59:59Z"),
        },
        create: {
          slug,
          title: paperTitle,
          paperId: paper.id,
          classLevel: classLevel,
          subjectCode: item.code,
          durationMinutes: paper.durationMinutes,
          startAt: new Date("2026-01-01T00:00:00Z"),
          endAt: new Date("2030-12-31T23:59:59Z"),
          isActive: true,
        },
      });
      console.log(`    Published: /exam-site/attempt/ (Slug: ${slug})`);
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
