import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsDrillDown } from "@/components/diagnosis-exams/DiagnosisExamsDrillDown";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";

import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

export default async function GeneralManagerDiagnosisExamsPage() {
  try {
    // Query all student attempts from the standalone Postgres database
    const rawAttempts = await db.examAttempt.findMany({
      include: {
        publishing: {
          include: {
            subject: true,
          },
        },
        answers: {
          select: {
            questionId: true,
            selectedOption: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const attempts = rawAttempts.map((attempt) => ({
      ...attempt,
      studentBranch: getCanonicalBranchName(attempt.studentBranch),
    }));

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <DiagnosisExamsDrillDown
          attempts={attempts}
          detailUrlPrefix="/dashboard/general-manager/diagnosis-exams"
          title="Diagnosis Exam Command Dashboard"
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in Diagnosis Exams (GM):", error);
    return <DatabaseErrorCard error={error} />;
  }
}
