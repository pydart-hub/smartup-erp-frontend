import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsReport } from "@/components/diagnosis-exams/DiagnosisExamsReport";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";

import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

export default async function DirectorDiagnosisExamsReportPage() {
  try {
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
        <DiagnosisExamsReport
          attempts={attempts}
          title="Diagnosis Exam Class-Wise Report"
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in Diagnosis Exams Report (Director):", error);
    return <DatabaseErrorCard error={error} />;
  }
}
