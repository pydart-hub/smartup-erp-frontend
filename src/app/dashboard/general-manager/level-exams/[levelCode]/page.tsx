import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, GraduationCap, Percent, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getLevelExamClassDetail } from "@/lib/server/levelExamDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ levelCode: string }>;
};

export default async function GMLevelExamClassDetailPage({ params }: PageProps) {
  const { levelCode } = await params;

  if (!["8", "9", "10"].includes(levelCode)) {
    notFound();
  }

  const data = await getLevelExamClassDetail(levelCode as "8" | "9" | "10");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Class Drilldown</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">{levelCode}th Level Exam Branch-wise View</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Select a branch to open a dedicated diagnosis result page for class {levelCode}.
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

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Branch-wise View
            </CardTitle>
            <CardDescription>Choose a branch to inspect class {levelCode} diagnosis results on a separate page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.branchSummaries.map((item) => {
              return (
                <Link
                  key={item.branch}
                  href={`/dashboard/general-manager/level-exams/${levelCode}/${encodeURIComponent(item.branch)}`}
                  className="block rounded-[18px] border border-border-light bg-app-bg/50 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
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
            <CardTitle>Branch Result Pages</CardTitle>
            <CardDescription>
              Each branch opens its own clean diagnosis result page with student-wise cards and subject-wise breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
              Open any branch from the left panel to view its dedicated result page.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {data.branchSummaries.slice(0, 4).map((item) => (
                <Link
                  key={item.branch}
                  href={`/dashboard/general-manager/level-exams/${levelCode}/${encodeURIComponent(item.branch)}`}
                  className="rounded-[16px] border border-border-light bg-app-bg p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <p className="font-semibold text-text-primary">{item.branch}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-text-tertiary">Students</p>
                      <p className="mt-1 font-semibold text-text-primary">{item.studentCount}</p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">Attended</p>
                      <p className="mt-1 font-semibold text-text-primary">{item.attendedCount}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
