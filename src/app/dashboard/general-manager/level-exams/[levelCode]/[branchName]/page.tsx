import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, ChevronDown, Percent, Target, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamClassBranchDetail } from "@/lib/server/levelExamDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ levelCode: string; branchName: string }>;
};

export default async function GMLevelExamBranchDetailPage({ params }: PageProps) {
  const { levelCode, branchName } = await params;

  if (!["8", "9", "10"].includes(levelCode)) {
    notFound();
  }

  const decodedBranchName = decodeURIComponent(branchName);
  const data = await getLevelExamClassBranchDetail(levelCode as "8" | "9" | "10", decodedBranchName);

  if (!data.branchSummary) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Branch Diagnosis Result</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">{decodedBranchName}</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Student-wise diagnosis result for class {levelCode}.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/dashboard/general-manager/level-exams/${levelCode}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Branches
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={<Users className="h-5 w-5" />} label="Students In Branch" value={String(data.branchSummary.studentCount)} />
        <SummaryCard icon={<Users className="h-5 w-5" />} label="Students Attended" value={String(data.branchSummary.attendedCount)} />
        <SummaryCard icon={<Target className="h-5 w-5" />} label="Average Marks" value={String(data.branchSummary.avgScore)} />
        <SummaryCard icon={<Percent className="h-5 w-5" />} label="Average Percentage" value={`${data.branchSummary.avgPercentage}%`} />
        <SummaryCard icon={<Trophy className="h-5 w-5" />} label="Pass Rate" value={`${data.branchSummary.passRate}%`} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Student Diagnosis Results
          </CardTitle>
          <CardDescription>
            Click a student to open subject-wise diagnosis results with class-level breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.branchStudents.length ? (
            <div className="overflow-hidden rounded-[20px] border border-border-light bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-app-bg/70">
                    <tr className="border-b border-border-light text-left text-text-tertiary">
                      <th className="px-4 py-4 font-medium">Rank</th>
                      <th className="px-4 py-4 font-medium">Student</th>
                      <th className="px-4 py-4 font-medium">Batch</th>
                      <th className="px-4 py-4 text-center font-medium">Subjects</th>
                      <th className="px-4 py-4 text-center font-medium">Attempts</th>
                      <th className="px-4 py-4 text-center font-medium">Avg Marks</th>
                      <th className="px-4 py-4 text-center font-medium">Avg %</th>
                      <th className="px-4 py-4 text-center font-medium">Best</th>
                      <th className="px-4 py-4 text-center font-medium">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.branchStudents.map((student, index) => (
                      <tr key={student.studentId} className="border-b border-border-light/80 align-top last:border-b-0">
                        <td colSpan={9} className="p-0">
                          <details className="group">
                            <summary className="list-none cursor-pointer px-4 py-4 transition-colors hover:bg-app-bg/40">
                              <div className="grid grid-cols-[60px_minmax(220px,1.4fr)_180px_90px_90px_110px_110px_120px_90px] items-center gap-2">
                                <div className="font-semibold text-text-primary">#{index + 1}</div>
                                <div className="min-w-0">
                                  <div className="flex items-start gap-3">
                                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-text-tertiary transition-transform group-open:rotate-180" />
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-text-primary">{student.studentName}</p>
                                      <p className="mt-1 truncate text-xs text-text-tertiary">{student.latestExamTitle}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-text-secondary">{student.studentGroup || "-"}</div>
                                <div className="text-center text-text-primary">{student.subjectSummaries.length}</div>
                                <div className="text-center text-text-primary">{student.attemptedExams}</div>
                                <div className="text-center text-text-primary">{student.scoredMarks}</div>
                                <div className="text-center font-semibold text-primary">{student.percentage}%</div>
                                <div className="text-center text-text-primary">{student.bestScore} • {student.bestPercentage}%</div>
                                <div className="text-center">
                                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(student.topGrade)}`}>
                                    {student.topGrade}
                                  </span>
                                </div>
                              </div>
                            </summary>

                            <div className="border-t border-border-light bg-app-bg/30 px-4 py-4">
                              <div className="rounded-[18px] border border-border-light bg-white p-4">
                                <div className="grid gap-3 md:grid-cols-4">
                                  <MetricTile label="Attempts" value={String(student.attemptedExams)} />
                                  <MetricTile label="Average marks" value={String(student.scoredMarks)} />
                                  <MetricTile label="Average %" value={`${student.percentage}%`} accent />
                                  <MetricTile label="Best result" value={`${student.bestScore} • ${student.bestPercentage}%`} />
                                </div>

                                <div className="mt-4 overflow-x-auto">
                                  <table className="min-w-full table-fixed text-sm">
                                    <thead>
                                      <tr className="border-b border-border-light text-left text-text-tertiary">
                                        <th className="w-[24%] px-3 py-3 font-medium">Subject</th>
                                        <th className="w-[8%] px-3 py-3 text-center font-medium">Attempts</th>
                                        <th className="w-[10%] px-3 py-3 text-center font-medium">Avg Marks</th>
                                        <th className="w-[8%] px-3 py-3 text-center font-medium">Avg %</th>
                                        <th className="w-[8%] px-3 py-3 text-center font-medium">Grade</th>
                                        <th className="w-[42%] px-3 py-3 font-medium">Class-wise Result</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {student.subjectSummaries.map((subject) => (
                                        <tr key={`${student.studentId}-${subject.subjectName}`} className="border-b border-border-light/70 last:border-b-0">
                                          <td className="px-3 py-3">
                                            <p className="font-medium text-text-primary">{subject.subjectName}</p>
                                            <p className="mt-1 text-xs text-text-tertiary">{subject.latestExamTitle}</p>
                                          </td>
                                          <td className="px-3 py-3 text-center text-text-primary">{subject.attempts}</td>
                                          <td className="px-3 py-3 text-center text-text-primary">{subject.avgScore}</td>
                                          <td className="px-3 py-3 text-center font-semibold text-primary">{subject.avgPercentage}%</td>
                                          <td className="px-3 py-3 text-center">
                                            <Badge variant={subject.avgPercentage >= 75 ? "success" : subject.avgPercentage >= 40 ? "warning" : "error"}>
                                              {subject.topGrade}
                                            </Badge>
                                          </td>
                                          <td className="px-3 py-3">
                                            {subject.levelWiseBuckets.length ? (
                                              <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
                                                {subject.levelWiseBuckets.map((bucket) => (
                                                  <div
                                                    key={`${subject.subjectName}-${bucket.source_level}`}
                                                    className="rounded-[14px] border border-border-light bg-app-bg px-3 py-2"
                                                  >
                                                    <div className="flex items-center justify-between gap-2">
                                                      <p className="truncate text-xs font-semibold text-text-primary">{bucket.label}</p>
                                                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${getBucketTone(bucket.status)}`}>
                                                        {bucket.percentage}%
                                                      </span>
                                                    </div>
                                                    <div className="mt-2 space-y-1 text-[11px] leading-4 text-text-secondary">
                                                      <p>{bucket.score_obtained}/{bucket.total_marks} score</p>
                                                      <p>{bucket.correct_count}C / {bucket.wrong_count}W</p>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-sm text-text-secondary">No class-wise result available</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
              No student attempt data found for this branch and class.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="w-fit rounded-2xl bg-primary/10 p-2 text-primary">
          {icon}
        </div>
        <CardDescription className="mt-4">{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function MetricTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-text-tertiary">{label}</p>
      <p className={`mt-1 font-semibold ${accent ? "text-primary" : "text-text-primary"}`}>{value}</p>
    </div>
  );
}

function getBucketTone(status: "strong" | "watch" | "revise") {
  if (status === "strong") return "bg-success/10 text-success";
  if (status === "watch") return "bg-warning/10 text-warning";
  return "bg-error/10 text-error";
}
