import { frappeLevelExamStore } from "@/lib/server/frappeLevelExamStore";
import { listLevelExamEligibleStudents } from "@/lib/server/levelExamAdmin";
import { GeneralManagerLevelExamAssignClient, type CatalogResponse, type StudentItem } from "@/components/level-exams/GeneralManagerLevelExamAssignClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadInitialStudents(): Promise<StudentItem[]> {
  try {
    return await listLevelExamEligibleStudents(undefined, "", undefined);
  } catch (error) {
    console.warn("[level-exams] Initial student preload failed:", error instanceof Error ? error.message : error);
    return [];
  }
}

async function loadInitialCatalog(): Promise<CatalogResponse> {
  try {
    const [subjects, exams] = await Promise.all([
      frappeLevelExamStore.listSubjects(),
      frappeLevelExamStore.listExamCatalog({ level_codes: ["8", "9", "10"] }),
    ]);
    return { subjects, exams };
  } catch (error) {
    console.warn("[level-exams] Initial catalog preload failed:", error instanceof Error ? error.message : error);
    return { subjects: [], exams: [] };
  }
}

export default async function GeneralManagerLevelExamAssignPage() {
  const [initialStudents, initialCatalog] = await Promise.all([
    loadInitialStudents(),
    loadInitialCatalog(),
  ]);

  return (
    <GeneralManagerLevelExamAssignClient
      initialStudents={initialStudents}
      initialCatalog={initialCatalog}
    />
  );
}
