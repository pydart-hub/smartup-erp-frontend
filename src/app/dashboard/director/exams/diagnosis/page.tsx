import Link from "next/link";
import { ArrowLeft, ArrowRight, ClipboardCheck, GraduationCap, Target, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getGradeTone, getLevelExamDashboardData } from "@/lib/server/levelExamDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DirectorDiagnosisExamsPage() {
  const data = await getLevelExamDashboardData();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/director/exams">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Diagnosis Exams</p>
              <h1 className="mt-1 text-3xl font-bold text-text-primary">Level Exam Command Dashboard</h1>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-text-secondary">
            Review diagnosis exam performance across all students. Start with class-wise outcomes, then drill into subject, branch, and student-level detail.
          </p>
        </div>
      </div>

      <section className="rounded-[24px] border border-primary/10 bg-[linear-gradient(135deg,rgba(10,159,140,0.12),rgba(255,255,255,0.98)_45%,rgba(21,94,239,0.08))] p-6 shadow-card sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Published Exams", value: data.hero.publishedExams, note: "Diagnosis exam sets live", icon: ClipboardCheck },
            { label: "Active Students", value: data.hero.activeStudents, note: "8th, 9th, 10th in scope", icon: Users },
            { label: "Average Score", value: data.hero.overallAvgScore, note: "Across submitted attempts", icon: Target },
            { label: "Pass Rate", value: `${data.hero.passRate}%`, note: `${data.hero.attendedStudents} attended students`, icon: Trophy },
          ].map((item) => (
            <div key={item.label} className="rounded-[20px] border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
              <div className="rounded-2xl bg-primary/10 p-2 text-primary w-fit">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-text-primary">{item.value}</p>
              <p className="mt-1 text-sm text-text-secondary">{item.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">Class-wise Results</h2>
            <p className="text-sm text-text-secondary">Open a class to continue into subject-wise diagnosis analytics.</p>
          </div>
          <Badge variant="outline">{data.classSummaries.length}</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.classSummaries.map((item) => (
            <Link key={item.levelCode} href={`/dashboard/director/exams/diagnosis/${item.levelCode}`} className="block">
              <Card hover className="h-full border-border-light/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                      <GraduationCap className="h-6 w-6" />
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(item.topGrade)}`}>Top grade {item.topGrade}</span>
                  </div>
                  <CardTitle className="mt-5">Class {item.levelCode}</CardTitle>
                  <CardDescription>{item.attendedCount} students attended diagnosis exams.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Assigned</p><p className="mt-1 font-semibold text-text-primary">{item.assignedCount}</p></div>
                    <div className="rounded-2xl bg-surface p-3"><p className="text-text-tertiary">Students</p><p className="mt-1 font-semibold text-text-primary">{item.studentCount}</p></div>
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
    </div>
  );
}
