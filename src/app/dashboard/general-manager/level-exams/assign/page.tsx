import { FrappeCpuOverloadWarning } from "@/components/level-exams/FrappeCpuOverloadWarning";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AssignPage() {
  return <FrappeCpuOverloadWarning redirectUrl="/dashboard/general-manager/diagnosis-exams" />;
}

