import React from "react";
import { FrappeCpuOverloadWarning } from "@/components/level-exams/FrappeCpuOverloadWarning";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ levelCode: string; branchName: string }>;
};

export default async function GMLevelExamBranchDetailPage({ params }: PageProps) {
  return <FrappeCpuOverloadWarning redirectUrl="/dashboard/general-manager/diagnosis-exams" />;
}
