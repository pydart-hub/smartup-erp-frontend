import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { getGradeTone, getLevelExamBranchSubjectDetail } from "@/lib/server/levelExamDashboard";

type PageProps = { params: Promise<{ levelCode: string; subjectName: string; branchName: string }> };

export default async function DirectorDiagnosisBranchStudentsPage({ params }: PageProps) {
  const { levelCode, subjectName, branchName } = await params;
  if (!["8", "9", "10"].includes(levelCode)) notFound();
  const decodedSubject = decodeURIComponent(subjectName);
  const decodedBranch = decodeURIComponent(branchName);
  const data = await getLevelExamBranchSubjectDetail(levelCode as "8" | "9" | "10", decodedSubject, decodedBranch);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/general-manager/exams/diagnosis/${levelCode}/${encodeURIComponent(decodedSubject)}`}>
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-tertiary">Diagnosis Student View</p>
              <h1 className="mt-1 text-3xl font-bold text-text-primary">{decodedBranch} • {decodedSubject}</h1>
            </div>
          </div>
          <p className="mt-3 text-sm leading-6 text-text-secondary">
            Student-level diagnosis performance for class {levelCode}, including attempts, average marks, best score, and grade trend.
          </p>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card><CardHeader><CardDescription>Students In Branch</CardDescription><CardTitle className="text-3xl">{data.branchSummary.studentCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Students Attended</CardDescription><CardTitle className="text-3xl">{data.branchSummary.attendedCount}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Total Attempts</CardDescription><CardTitle className="text-3xl">{data.branchSummary.attempts}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Average Marks</CardDescription><CardTitle className="text-3xl">{data.branchSummary.avgScore}</CardTitle></CardHeader></Card>
        <Card><CardHeader><CardDescription>Average Percentage</CardDescription><CardTitle className="text-3xl">{data.branchSummary.avgPercentage}%</CardTitle></CardHeader></Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Students List</CardTitle>
          <CardDescription>
            Diagnosis exam marks, attempt count, best percentage, and latest exam indicator for {decodedBranch}.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {data.studentSummaries.length ? (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border-light text-left text-text-tertiary">
                  <th className="px-3 py-3 font-medium">Student</th>
                  <th className="px-3 py-3 font-medium">Batch</th>
                  <th className="px-3 py-3 text-center font-medium">Attempts</th>
                  <th className="px-3 py-3 text-center font-medium">Avg marks</th>
                  <th className="px-3 py-3 text-center font-medium">Avg %</th>
                  <th className="px-3 py-3 text-center font-medium">Best %</th>
                  <th className="px-3 py-3 text-center font-medium">Grade</th>
                  <th className="px-3 py-3 font-medium">Latest / Best Exam</th>
                </tr>
              </thead>
              <tbody>
                {data.studentSummaries.map((student) => (
                  <tr key={student.studentId} className="border-b border-border-light/70 last:border-b-0">
                    <td className="px-3 py-3 font-medium text-text-primary">{student.studentName}</td>
                    <td className="px-3 py-3 text-text-secondary">{student.studentGroup || "-"}</td>
                    <td className="px-3 py-3 text-center text-text-primary">{student.attempts}</td>
                    <td className="px-3 py-3 text-center text-text-primary">{student.avgScore}</td>
                    <td className="px-3 py-3 text-center font-semibold text-primary">{student.avgPercentage}%</td>
                    <td className="px-3 py-3 text-center font-semibold text-success">{student.bestPercentage}%</td>
                    <td className="px-3 py-3 text-center">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getGradeTone(student.topGrade)}`}>{student.topGrade}</span>
                    </td>
                    <td className="px-3 py-3 text-text-secondary">{student.latestExamTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded-[18px] border border-dashed border-border-light p-6 text-sm text-text-secondary">
              No student attempts found yet for this branch and diagnosis subject.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
