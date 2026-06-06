import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, GraduationCap, Percent, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamClassDetail } from "@/lib/server/levelExamDashboard";

type PageProps = {
  params: Promise<{ levelCode: string }>;
  searchParams: Promise<{ branch?: string }>;
};

export default async function GMLevelExamClassDetailPage({ params, searchParams }: PageProps) {
  const { levelCode } = await params;
  const { branch } = await searchParams;

  if (!["8", "9", "10"].includes(levelCode)) {
    notFound();
  }

  const data = await getLevelExamClassDetail(levelCode as "8" | "9" | "10");
  const selectedBranch = branch && data.branchSummaries.some((item) => item.branch === branch)
    ? branch
    : data.branchSummaries[0]?.branch;
  const branchStudents = data.studentsByBranch.find((item) => item.branch === selectedBranch)?.students ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Class Drilldown</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">{levelCode}th Level Exam Branch-wise View</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Select a branch to view student-level marks and percentage for class {levelCode}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/general-manager/level-exams">
            <ArrowLeft className="h-4 w-4" />
            Back to Overview
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary w-fit">
              <Users className="h-5 w-5" />
            </div>
            <CardDescription className="mt-4">Students In Class</CardDescription>
            <CardTitle className="text-3xl">{data.classSummary?.studentCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary w-fit">
              <GraduationCap className="h-5 w-5" />
            </div>
            <CardDescription className="mt-4">Students Attended</CardDescription>
            <CardTitle className="text-3xl">{data.classSummary?.attendedCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary w-fit">
              <Percent className="h-5 w-5" />
            </div>
            <CardDescription className="mt-4">Average Percentage</CardDescription>
            <CardTitle className="text-3xl">{data.classSummary?.avgPercentage ?? 0}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="rounded-2xl bg-primary/10 p-2 text-primary w-fit">
              <Trophy className="h-5 w-5" />
            </div>
            <CardDescription className="mt-4">Top Grade</CardDescription>
            <CardTitle className="text-3xl">{data.classSummary?.topGrade ?? "NA"}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Branch-wise View
            </CardTitle>
            <CardDescription>Choose a branch to inspect class {levelCode} student performance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.branchSummaries.map((item) => {
              const active = item.branch === selectedBranch;
              return (
                <Link
                  key={item.branch}
                  href={`/dashboard/general-manager/level-exams/${levelCode}?branch=${encodeURIComponent(item.branch)}`}
                  className={`block rounded-[18px] border p-4 transition-colors ${
                    active ? "border-primary bg-primary/5" : "border-border-light bg-app-bg/50 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{item.branch}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {item.attendedCount} attended out of {item.studentCount}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-tertiary" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Avg mark</p>
                      <p className="mt-1 font-semibold text-text-primary">{item.avgScore}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Avg %</p>
                      <p className="mt-1 font-semibold text-primary">{item.avgPercentage}%</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedBranch ? `${selectedBranch} Student Performance` : "Student Performance"}
            </CardTitle>
            <CardDescription>
              Student-wise scored marks and percentage for class {levelCode}.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {selectedBranch ? (
              branchStudents.length ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light text-left text-text-tertiary">
                      <th className="px-3 py-3 font-medium">Student</th>
                      <th className="px-3 py-3 font-medium">Batch</th>
                      <th className="px-3 py-3 text-center font-medium">Attempts</th>
                      <th className="px-3 py-3 text-center font-medium">Scored marks</th>
                      <th className="px-3 py-3 text-center font-medium">Percentage</th>
                      <th className="px-3 py-3 text-center font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchStudents.map((student) => (
                      <tr key={student.studentId} className="border-b border-border-light/70 last:border-b-0">
                        <td className="px-3 py-3 font-medium text-text-primary">{student.studentName}</td>
                        <td className="px-3 py-3 text-text-secondary">{student.studentGroup || "-"}</td>
                        <td className="px-3 py-3 text-center text-text-primary">{student.attemptedExams}</td>
                        <td className="px-3 py-3 text-center text-text-primary">{student.scoredMarks}</td>
                        <td className="px-3 py-3 text-center font-semibold text-primary">{student.percentage}%</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(student.topGrade)}`}>
                            {student.topGrade}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
                  No student attempt data found for this branch and class.
                </div>
              )
            ) : (
              <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
                No branches found for this class.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
