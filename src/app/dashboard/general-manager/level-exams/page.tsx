import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Percent,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getGradeTone, getLevelExamDashboardData } from "@/lib/server/levelExamDashboard";
import { FrappeCpuOverloadWarning } from "@/components/level-exams/FrappeCpuOverloadWarning";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GMLevelExamsPage() {
  return <FrappeCpuOverloadWarning redirectUrl="/dashboard/general-manager/diagnosis-exams" />;

  const data = await getLevelExamDashboardData();


  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <section className="overflow-hidden rounded-[24px] border border-primary/10 bg-[linear-gradient(135deg,rgba(10,159,140,0.14),rgba(255,255,255,0.98)_45%,rgba(21,94,239,0.08))] shadow-card">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.6fr_1fr] lg:p-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Level Exam Command Center
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
                Complete dashboard for class-wise and branch-wise level exam performance.
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-text-secondary sm:text-base">
                Track attended students count, published exam reach, average marks, percentage, grade trend,
                and pass movement for 8th, 9th, and 10th level exams from one manager view.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/dashboard/general-manager/level-exams/assign">
                  <BookOpenCheck className="h-4 w-4" />
                  Publish Or Assign Exam
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard/general-manager/level-exams/assign">
                  <ClipboardCheck className="h-4 w-4" />
                  Review Student Mapping
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[20px] border border-white/80 bg-white/85 p-4 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Exam Reach</p>
              <div className="mt-3">
                <div>
                  <p className="text-3xl font-bold text-primary">{data.hero.publishedExams}</p>
                  <p className="text-xs text-text-secondary">Published exams</p>
                </div>
              </div>
            </div>
            <div className="rounded-[20px] border border-white/80 bg-[#0c2531] p-4 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Student Outcome</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-bold">{data.hero.attendedStudents}</p>
                  <p className="text-xs text-white/70">Students attended</p>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
                  <p className="text-xl font-bold">{data.hero.overallAvgPercentage}%</p>
                  <p className="text-xs text-white/70">Average percentage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active Level Students",
            value: data.hero.activeStudents,
            note: "8th, 9th, 10th students in scope",
            icon: Users,
          },
          {
            label: "Assigned Exam Sets",
            value: data.hero.assignedExamIds,
            note: "Distinct published exams mapped",
            icon: FileSpreadsheet,
          },
          {
            label: "Average Marks",
            value: data.hero.overallAvgScore,
            note: "Across all submitted attempts",
            icon: Target,
          },
          {
            label: "Pass Rate",
            value: `${data.hero.passRate}%`,
            note: `${data.hero.activeSubjects} active subjects in dashboard`,
            icon: Trophy,
          },
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

      <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Class-wise Exam Attendance And Performance
            </CardTitle>
            <CardDescription>
              Click a class to open its branch-wise drilldown and student result view.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {data.classSummaries.map((item) => (
                <Link
                  key={item.levelCode}
                  href={`/dashboard/general-manager/level-exams/${item.levelCode}`}
                  className="rounded-[20px] border border-border-light bg-app-bg/50 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">
                        Class {item.levelCode}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-text-primary">{item.attendedCount}</p>
                      <p className="text-sm text-text-secondary">students attended</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(item.topGrade)}`}>
                      Top grade {item.topGrade}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Assigned</p>
                      <p className="mt-1 font-semibold text-text-primary">{item.assignedCount}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Avg marks</p>
                      <p className="mt-1 font-semibold text-text-primary">{item.avgScore}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Avg %</p>
                      <p className="mt-1 font-semibold text-primary">{item.avgPercentage}%</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Pass rate</p>
                      <p className="mt-1 font-semibold text-success">{item.passRate}%</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm font-medium text-primary">
                    <span>Open branch view</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Publish Snapshot
            </CardTitle>
            <CardDescription>Quick state of the current level exam pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["Generated exam banks", data.hero.generatedExams],
              ["Published live exams", data.hero.publishedExams],
              ["Students covered", data.hero.activeStudents],
              ["Students attended", data.hero.attendedStudents],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl border border-border-light bg-app-bg/50 px-4 py-3">
                <span className="text-sm text-text-secondary">{label}</span>
                <span className="text-lg font-semibold text-text-primary">{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Branch-wise Dashboard
            </CardTitle>
            <CardDescription>
              High-level branch performance across level exams.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-text-tertiary">
                  <th className="px-3 py-3 font-medium">Branch</th>
                  <th className="px-3 py-3 font-medium text-center">Students</th>
                  <th className="px-3 py-3 font-medium text-center">Attended</th>
                  <th className="px-3 py-3 font-medium text-center">Avg mark</th>
                  <th className="px-3 py-3 font-medium text-center">Avg %</th>
                  <th className="px-3 py-3 font-medium text-center">Grade</th>
                  <th className="px-3 py-3 font-medium text-center">Pass %</th>
                </tr>
              </thead>
              <tbody>
                {data.branchSummaries.map((branch) => (
                  <tr key={branch.branch} className="border-b border-border-light/70 last:border-b-0">
                    <td className="px-3 py-3 font-medium text-text-primary">{branch.branch}</td>
                    <td className="px-3 py-3 text-center text-text-secondary">{branch.studentCount}</td>
                    <td className="px-3 py-3 text-center text-text-primary">{branch.attendedCount}</td>
                    <td className="px-3 py-3 text-center text-text-primary">{branch.avgMarks}</td>
                    <td className="px-3 py-3 text-center font-semibold text-primary">{branch.avgPercentage}%</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(branch.topGrade)}`}>
                        {branch.topGrade}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-success">{branch.passRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Subject Performance
            </CardTitle>
            <CardDescription>How subjects are performing in submitted level exam attempts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.subjectSummaries.length ? (
              data.subjectSummaries.map((subject) => (
                <div key={subject.subjectName} className="rounded-[18px] border border-border-light bg-app-bg/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{subject.subjectName}</p>
                      <p className="text-xs text-text-secondary">{subject.attempts} submitted attempts</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(subject.topGrade)}`}>
                      {subject.topGrade}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Avg marks</p>
                      <p className="mt-1 font-semibold text-text-primary">{subject.avgScore}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Avg %</p>
                      <p className="mt-1 font-semibold text-primary">{subject.avgPercentage}%</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
                No submitted attempts yet. Publish and assign exams to start filling the performance dashboard.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent Published Exams</CardTitle>
            <CardDescription>
              Latest exam sets with assignment volume, attended count, and average percentage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentExamSummaries.length ? (
              data.recentExamSummaries.map((exam) => (
                <div key={exam.examId} className="rounded-[18px] border border-border-light bg-app-bg/50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text-primary">{exam.subjectName}</p>
                      <p className="text-sm text-text-secondary">
                        Class {exam.levelCode} {exam.boardCode.toUpperCase()} | {exam.title}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                      {exam.avgPercentage}% avg
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Assigned</p>
                      <p className="mt-1 font-semibold text-text-primary">{exam.assignedCount}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Attended</p>
                      <p className="mt-1 font-semibold text-text-primary">{exam.attendedCount}</p>
                    </div>
                    <div className="rounded-2xl bg-surface p-3">
                      <p className="text-text-tertiary">Published</p>
                      <p className="mt-1 font-semibold text-text-primary">
                        {new Date(exam.publishedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
                No published exams found yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Manager Actions</CardTitle>
            <CardDescription>Suggested next steps to keep level exam coverage complete.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Open a class card to review branch-wise performance.",
              "Select a branch to inspect student marks and percentage.",
              "Check branch-wise performance where average percentage is below target.",
              "Use the assign screen to push fresh exams to uncovered students.",
            ].map((item) => (
              <div key={item} className="flex gap-3 rounded-[18px] border border-border-light bg-app-bg/50 p-4">
                <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-sm leading-6 text-text-secondary">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
