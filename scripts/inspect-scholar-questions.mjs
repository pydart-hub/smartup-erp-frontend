import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pubs = await prisma.examPublishing.findMany({
    where: {
      isActive: true,
      OR: [
        { slug: { startsWith: "scholarship-" } },
        { title: { contains: "Scholarship", mode: "insensitive" } },
      ],
    },
    include: {
      paper: {
        include: {
          questions: {
            include: {
              question: {
                include: { options: true },
              },
            },
          },
        },
      },
    },
  });

  console.log("Found scholarship publishings:", pubs.length);
  for (const pub of pubs) {
    console.log({
      id: pub.id,
      title: pub.title,
      slug: pub.slug,
      classLevel: pub.classLevel,
      questionsCount: pub.paper?.questions?.length || 0,
      totalMarks: pub.paper?.totalMarks,
      durationMinutes: pub.durationMinutes,
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
