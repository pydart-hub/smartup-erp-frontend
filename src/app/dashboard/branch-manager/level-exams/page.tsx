import Link from "next/link";
import { ArrowRight, Microscope, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamDashboardDataForBranch } from "@/lib/server/levelExamDashboard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BranchManagerLevelExamsPage() {
  const branchName = await getBranchManagerDefaultCompany();
  const data = await getLevelExamDashboardDataForBranch(branchName);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <section className="rounded-[24px] border border-primary/10 bg-[linear-gradient(135deg,rgba(10,159,140,0.12),rgba(255,255,255,0.98)_45%,rgba(21,94,239,0.08))] p-6 shadow-card sm:p-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Diagnosis Exam
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Branch diagnosis dashboard for {branchName}
          </h1>
          <p className="text-sm leading-6 text-text-secondary sm:text-base">
            Review level exam performance only for your branch, then drill into class, subject, and student results.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Active Students", value: data.hero.activeStudents, note: "8th, 9th, 10th in this branch", icon: Users },
          { label: "Students Attended", value: data.hero.attendedStudents, note: "Diagnosis attempts recorded", icon: Microscope },
          { label: "Average Score", value: data.hero.overallAvgScore, note: `${data.hero.activeSubjects} active subjects`, icon: Target },
          { label: "Pass Rate", value: `${data.hero.passRate}%`, note: `${data.hero.publishedExams} published exams attempted`, icon: Trophy },
        ].map((item) => (
          <Card key={item.label} hover className="border-border-light/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl bg-primary/10 p-2 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-text-tertiary" />
              </div>
              <CardDescription className="mt-4">{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Class-wise Results</h2>
            <p className="text-sm text-text-secondary">Open a class to continue into subject-wise diagnosis analytics for your branch.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.classSummaries.map((item) => (
            <Link key={item.levelCode} href={`/dashboard/branch-manager/level-exams/${item.levelCode}`} className="block">
              <Card hover className="h-full border-border-light/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(item.topGrade)}`}>Top grade {item.topGrade}</span>
                  </div>
                  <CardTitle className="mt-5">Class {item.levelCode}</CardTitle>
                  <CardDescription>{item.attendedCount} students attended from your branch.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Students</p><p className="mt-1 font-semibold text-text-primary">{item.studentCount}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Attended</p><p className="mt-1 font-semibold text-text-primary">{item.attendedCount}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg %</p><p className="mt-1 font-semibold text-primary">{item.avgPercentage}%</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Pass rate</p><p className="mt-1 font-semibold text-success">{item.passRate}%</p></div>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium text-primary">
                    <span>Open subject-wise view</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Subject Performance</h2>
          <p className="text-sm text-text-secondary">How subjects are performing in submitted diagnosis attempts from your branch.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.subjectSummaries.length ? (
            data.subjectSummaries.map((subject) => (
              <Card key={subject.subjectName} className="border-border-light/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-lg">{subject.subjectName}</CardTitle>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(subject.topGrade)}`}>{subject.topGrade}</span>
                  </div>
                  <CardDescription>{subject.attempts} submitted attempts</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg marks</p><p className="mt-1 font-semibold text-text-primary">{subject.avgScore}</p></div>
                  <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Avg %</p><p className="mt-1 font-semibold text-primary">{subject.avgPercentage}%</p></div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
              No submitted diagnosis attempts found yet for this branch.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
