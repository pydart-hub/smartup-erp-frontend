import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsClassReport } from "@/components/diagnosis-exams/DiagnosisExamsClassReport";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    class?: string;
    branch?: string;
  }>;
};

export default async function GeneralManagerDiagnosisClassReportPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const classLevel = params.class;
  const branchFilter = params.branch;

  if (!classLevel) {
    return notFound();
  }

  try {
    // Fetch attempts for this class level (fast, answers excluded!)
    const allAttempts = await db.examAttempt.findMany({
      where: {
        classLevel: classLevel,
      },
      include: {
        publishing: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { startedAt: "desc" },
    });

    let attempts = allAttempts.map((attempt) => ({
      ...attempt,
      studentBranch: getCanonicalBranchName(attempt.studentBranch),
    }));

    if (branchFilter) {
      const canonicalFilter = getCanonicalBranchName(branchFilter);
      attempts = attempts.filter(
        (attempt) => getCanonicalBranchName(attempt.studentBranch) === canonicalFilter
      );
    }

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <DiagnosisExamsClassReport
          attempts={attempts}
          classLevel={classLevel}
          branchName={branchFilter || "All Branches"}
          backUrl="/dashboard/general-manager/diagnosis-exams"
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in Diagnosis Exams Class Report (GM):", error);
    return <DatabaseErrorCard error={error} backUrl="/dashboard/general-manager/diagnosis-exams" />;
  }
}
