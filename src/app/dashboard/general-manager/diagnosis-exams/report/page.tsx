import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsReport } from "@/components/diagnosis-exams/DiagnosisExamsReport";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";

import { getCanonicalBranchName } from "@/lib/utils/constants";
import { DIAGNOSIS_EXAM_PUBLISHING_FILTER, isScholarshipAttempt } from "@/lib/utils/diagnosis";

export const dynamic = "force-dynamic";

export default async function GeneralManagerDiagnosisExamsReportPage() {
  try {
    const rawAttempts = await db.examAttempt.findMany({
      where: DIAGNOSIS_EXAM_PUBLISHING_FILTER,
      include: {
        publishing: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    const attempts = rawAttempts
      .filter((attempt) => !isScholarshipAttempt(attempt))
      .map((attempt) => ({
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
    console.error("Database connection error in Diagnosis Exams Report (GM):", error);
    return <DatabaseErrorCard error={error} />;
  }
}
