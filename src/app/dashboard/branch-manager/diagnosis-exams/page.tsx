import React from "react";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsDrillDown } from "@/components/diagnosis-exams/DiagnosisExamsDrillDown";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";
import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

export default async function BranchManagerDiagnosisExamsPage() {
  try {
    const branchName = await getBranchManagerDefaultCompany();
    const canonicalBranch = getCanonicalBranchName(branchName);

    // Fetch only necessary metadata fields for attempts matching the branch
    const rawAttempts = await db.examAttempt.findMany({
      where: {
        OR: [
          { studentBranch: { equals: branchName, mode: "insensitive" } },
          { studentBranch: { equals: canonicalBranch, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        publishingId: true,
        studentName: true,
        studentBranch: true,
        studentPhone: true,
        classLevel: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        scoreObtained: true,
        totalMarks: true,
        percentage: true,
        correctCount: true,
        wrongCount: true,
        unansweredCount: true,
        publishing: {
          select: {
            title: true,
            subject: {
              select: {
                code: true,
                name: true,
              },
            },
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
