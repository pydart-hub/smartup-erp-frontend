import { PrismaClient as LevelUpPrisma } from "../src/generated/levelup-client/index.js";

const levelupDb = new LevelUpPrisma();

async function deepSyllabus() {
  const papers = await levelupDb.levelUpPaper.findMany({
    include: {
      questions: {
        include: { question: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  for (const paper of papers) {
    console.log(`\n========================================`);
    console.log(`PAPER: ${paper.title} (Class ${paper.classLevel})`);
    console.log(`Total Questions: ${paper.questions.length}`);
    console.log(`Duration: ${paper.durationMinutes} mins | Total Marks: ${paper.totalMarks}`);
    console.log(`Questions breakdown (first 5 and last 5 topics):`);
    
    paper.questions.slice(0, 5).forEach((pq, i) => {
      console.log(`  [Q${i+1}] ${pq.question.questionText.slice(0, 75).replace(/\s+/g, ' ')}...`);
    });
    console.log(`  ...`);
    paper.questions.slice(-3).forEach((pq, i) => {
      console.log(`  [Q${paper.questions.length - 3 + i + 1}] ${pq.question.questionText.slice(0, 75).replace(/\s+/g, ' ')}...`);
    });
  }
}

deepSyllabus()
  .catch(console.error)
  .finally(() => levelupDb.$disconnect());
