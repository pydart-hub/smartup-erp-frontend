import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsDrillDown } from "@/components/diagnosis-exams/DiagnosisExamsDrillDown";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";

export const dynamic = "force-dynamic";

export default async function BranchManagerDiagnosisExamsPage() {
  try {
    const branchName = await getBranchManagerDefaultCompany();
    
    // Normalize function to clean the branch name (removes spaces, hyphens, underscores and lowercases)
    const cleanBranch = (name: string) => name.replace(/[\s\-_]/g, "").toLowerCase();
    const cleanedBranchName = cleanBranch(branchName);

    // Fetch all attempts and filter by branch manager's branch
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

    const attempts = allAttempts.filter(
      (attempt) => cleanBranch(attempt.studentBranch || "") === cleanedBranchName
    );

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <DiagnosisExamsDrillDown
          attempts={attempts}
          detailUrlPrefix="/dashboard/branch-manager/diagnosis-exams"
          title="Diagnosis Exam Dashboard"
          restrictToBranch={branchName}
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in Diagnosis Exams (Branch Manager):", error);
    return <DatabaseErrorCard error={error} />;
  }
}
