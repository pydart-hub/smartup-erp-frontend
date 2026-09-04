import React from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/public-exam/db";
import { DiagnosisExamsClassReport } from "@/components/diagnosis-exams/DiagnosisExamsClassReport";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";
import { getCanonicalBranchName } from "@/lib/utils/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    class?: string;
    branch?: string;
  }>;
};

export default async function BranchManagerDiagnosisClassReportPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const classLevel = params.class;

  if (!classLevel) {
    return notFound();
  }

  try {
    const branchName = await getBranchManagerDefaultCompany();
    const canonicalBranch = getCanonicalBranchName(branchName);

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

    const attempts = allAttempts
      .filter((attempt) => getCanonicalBranchName(attempt.studentBranch) === canonicalBranch)
      .map((attempt) => ({
        ...attempt,
        studentBranch: canonicalBranch,
      }));

    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        <DiagnosisExamsClassReport
          attempts={attempts}
          classLevel={classLevel}
          branchName={canonicalBranch}
          backUrl="/dashboard/branch-manager/diagnosis-exams"
        />
      </div>
    );
  } catch (error) {
    console.error("Database connection error in Diagnosis Exams Class Report (Branch Manager):", error);
    return <DatabaseErrorCard error={error} backUrl="/dashboard/branch-manager/diagnosis-exams" />;
  }
}
