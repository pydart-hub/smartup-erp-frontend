import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsReport } from "@/components/diagnosis-exams/DiagnosisExamsReport";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";
import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

export default async function BranchManagerDiagnosisExamsReportPage() {
  try {
    const branchName = await getBranchManagerDefaultCompany();
    const canonicalBranch = getCanonicalBranchName(branchName);

    const allAttempts = await db.examAttempt.findMany({
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

    const attempts = allAttempts
      .filter((attempt) => getCanonicalBranchName(attempt.studentBranch) === canonicalBranch)
      .map((attempt) => ({
        ...attempt,
        studentBranch: getCanonicalBranchName(attempt.studentBranch),
      }));

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <DiagnosisExamsReport
          attempts={attempts}
          title="Diagnosis Exam Class-Wise Report"
          restrictToBranch={branchName}
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in Diagnosis Exams Report (Branch Manager):", error);
    return <DatabaseErrorCard error={error} />;
  }
}
