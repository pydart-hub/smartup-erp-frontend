import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamClassDetailForBranch } from "@/lib/server/levelExamDashboard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";
import { FrappeCpuOverloadWarning } from "@/components/level-exams/FrappeCpuOverloadWarning";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: Promise<{ levelCode: string }> };

export default async function BranchManagerDiagnosisLevelPage({ params }: PageProps) {
  return <FrappeCpuOverloadWarning redirectUrl="/dashboard/branch-manager/diagnosis-exams" />;

  const { levelCode } = await params;
  if (!["8", "9", "10"].includes(levelCode)) notFound();

  const branchName = await getBranchManagerDefaultCompany();
  const data = await getLevelExamClassDetailForBranch(levelCode as "8" | "9" | "10", branchName);


  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/branch-manager/level-exams">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Diagnosis Drilldown</p>
              <h1 className="mt-1 text-3xl font-bold text-text-primary">Class {levelCode} Subject-wise Results</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Review diagnosis performance for class {levelCode} in {branchName}, then open a subject to inspect students.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardDescription>Students In Branch</CardDescription><CardTitle className="text-3xl">{data.classSummary.studentCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Students Attended</CardDescription><CardTitle className="text-3xl">{data.classSummary.attendedCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Average Percentage</CardDescription><CardTitle className="text-3xl">{data.classSummary.avgPercentage}%</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Pass Rate</CardDescription><CardTitle className="text-3xl">{data.classSummary.passRate}%</CardTitle></CardHeader></Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Subject-wise Results</h2>
            <p className="text-sm text-text-secondary">Each subject opens its student-wise diagnosis breakdown for your branch.</p>
          </div>
          <Badge variant="outline">{data.subjectSummaries.length}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.subjectSummaries.map((subject) => (
            <Link
              key={subject.subjectName}
              href={`/dashboard/branch-manager/level-exams/${levelCode}/${encodeURIComponent(subject.subjectName)}`}
              className="block"
            >
              <Card hover className="h-full border-border-light/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(subject.topGrade)}`}>{subject.topGrade}</span>
                  </div>
                  <CardTitle className="mt-5">{subject.subjectName}</CardTitle>
                  <CardDescription>{subject.attendedStudents} students attempted this diagnosis subject.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Attempts</p><p className="mt-1 font-semibold text-text-primary">{subject.attempts}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg mark</p><p className="mt-1 font-semibold text-text-primary">{subject.avgScore}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg %</p><p className="mt-1 font-semibold text-primary">{subject.avgPercentage}%</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Grade trend</p><p className="mt-1 font-semibold text-text-primary">{subject.topGrade}</p></div>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium text-primary">
                    <span>Open student list</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
