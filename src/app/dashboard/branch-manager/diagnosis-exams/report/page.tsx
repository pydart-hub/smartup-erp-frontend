import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsReport } from "@/components/diagnosis-exams/DiagnosisExamsReport";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";

export const dynamic = "force-dynamic";

export default async function BranchManagerDiagnosisExamsReportPage() {
  try {
    const branchName = await getBranchManagerDefaultCompany();
    
    // Normalize function to clean the branch name
    const cleanBranch = (name: string) => name.replace(/[\s\-_]/g, "").toLowerCase();
    const cleanedBranchName = cleanBranch(branchName);

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
