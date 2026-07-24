import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamDashboardData } from "@/lib/server/levelExamDashboard";

type PageProps = { params: Promise<{ levelCode: string }> };

export default async function DirectorDiagnosisLevelPage({ params }: PageProps) {
  const { levelCode } = await params;
  if (!["8", "9", "10"].includes(levelCode)) notFound();

  const data = await getLevelExamDashboardData();
  const classSummary = data.classSummaries.find((item) => item.levelCode === levelCode);
  const subjectSummaries = data.subjectSummaries
    .map((subject) => {
      const attempts = data.attempts.filter(
        (attempt) => attempt.levelCode === levelCode && attempt.subjectName === subject.subjectName,
      );
      return {
        subjectName: subject.subjectName,
        attempts: attempts.length,
        attendedStudents: new Set(attempts.map((attempt) => attempt.studentId)).size,
        avgScore: attempts.length ? Number((attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length).toFixed(1)) : 0,
        avgPercentage: attempts.length ? Number((attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length).toFixed(1)) : 0,
        topGrade:
          Object.entries(
            attempts.reduce<Record<string, number>>((acc, attempt) => {
              acc[attempt.grade] = (acc[attempt.grade] || 0) + 1;
              return acc;
            }, {}),
          ).sort((a, b) => b[1] - a[1])[0]?.[0] || "NA",
      };
    })
    .filter((subject) => subject.attempts > 0)
    .sort((a, b) => b.avgPercentage - a.avgPercentage || b.attempts - a.attempts);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/general-manager/exams/diagnosis">
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
            Pick a subject to continue into branch-wise diagnosis performance for class {levelCode}.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardDescription>Students In Class</CardDescription><CardTitle className="text-3xl">{classSummary?.studentCount ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Students Attended</CardDescription><CardTitle className="text-3xl">{classSummary?.attendedCount ?? 0}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Average Percentage</CardDescription><CardTitle className="text-3xl">{classSummary?.avgPercentage ?? 0}%</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Pass Rate</CardDescription><CardTitle className="text-3xl">{classSummary?.passRate ?? 0}%</CardTitle></CardHeader></Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Subject-wise Results</h2>
            <p className="text-sm text-text-secondary">Each subject opens its branch-wise diagnosis breakdown.</p>
          </div>
          <Badge variant="outline">{subjectSummaries.length}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {subjectSummaries.map((subject) => (
            <Link
              key={subject.subjectName}
              href={`/dashboard/general-manager/exams/diagnosis/${levelCode}/${encodeURIComponent(subject.subjectName)}`}
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
                    <span>Open branch-wise results</span>
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
