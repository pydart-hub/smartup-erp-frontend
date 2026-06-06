import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamSubjectDetail } from "@/lib/server/levelExamDashboard";

type PageProps = { params: Promise<{ levelCode: string; subjectName: string }> };

export default async function DirectorDiagnosisSubjectPage({ params }: PageProps) {
  const { levelCode, subjectName } = await params;
  if (!["8", "9", "10"].includes(levelCode)) notFound();
  const decodedSubject = decodeURIComponent(subjectName);
  const data = await getLevelExamSubjectDetail(levelCode as "8" | "9" | "10", decodedSubject);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/director/exams/diagnosis/${levelCode}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Diagnosis Subject View</p>
              <h1 className="mt-1 text-3xl font-bold text-text-primary">{decodedSubject} • Class {levelCode}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Review branch-wise performance for {decodedSubject} diagnosis exams, then open a branch to inspect students.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardDescription>Attempts</CardDescription><CardTitle className="text-3xl">{data.subjectSummary.attempts}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Students Attended</CardDescription><CardTitle className="text-3xl">{data.subjectSummary.attendedStudents}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Average Marks</CardDescription><CardTitle className="text-3xl">{data.subjectSummary.avgScore}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Average Percentage</CardDescription><CardTitle className="text-3xl">{data.subjectSummary.avgPercentage}%</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Pass Rate</CardDescription><CardTitle className="text-3xl">{data.subjectSummary.passRate}%</CardTitle></CardHeader></Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Branch-wise Results</h2>
            <p className="text-sm text-text-secondary">Choose a branch to inspect student marks, attempts, and best scores.</p>
          </div>
          <Badge variant="outline">{data.branchSummaries.length}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.branchSummaries.map((branch) => (
            <Link
              key={branch.branch}
              href={`/dashboard/director/exams/diagnosis/${levelCode}/${encodeURIComponent(decodedSubject)}/${encodeURIComponent(branch.branch)}`}
              className="block"
            >
              <Card hover className="h-full border-border-light/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(branch.topGrade)}`}>{branch.topGrade}</span>
                  </div>
                  <CardTitle className="mt-5">{branch.branch}</CardTitle>
                  <CardDescription>{branch.attendedCount} students attended from this branch.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Students</p><p className="mt-1 font-semibold text-text-primary">{branch.studentCount}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Attempts</p><p className="mt-1 font-semibold text-text-primary">{branch.attempts}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg mark</p><p className="mt-1 font-semibold text-text-primary">{branch.avgScore}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg %</p><p className="mt-1 font-semibold text-primary">{branch.avgPercentage}%</p></div>
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
