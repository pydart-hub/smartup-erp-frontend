"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ChevronRight, Clock3, GraduationCap, History, PlayCircle, Target, Timer, TrendingUp, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import { getParentLevelExams } from "@/lib/api/levelExams";
import { useParentData } from "../page";
import type { LevelExamListItem } from "@/lib/types/levelExam";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

function statusBadgeVariant(status: LevelExamListItem["status"]) {
  if (status === "completed") return "success";
  if (status === "in_progress") return "info";
  if (status === "available") return "warning";
  if (status === "expired") return "error";
  return "outline";
}

function formatBoard(board?: string) {
  if (board === "cbse") return "CBSE";
  if (board === "state") return "State";
  return "";
}

export default function ParentLevelExamsPage() {
  const { user } = useAuth();
  const { data: parentData } = useParentData(user?.email);
  const children = parentData?.children ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const studentId = selectedStudentId || children[0]?.name || "";
  const selectedChild = children.find((child) => child.name === studentId);

  const examsQuery = useQuery({
    queryKey: ["parent-level-exams", studentId],
    queryFn: () => getParentLevelExams(studentId),
    enabled: !!studentId,
    staleTime: 30_000,
  });

  const sections = useMemo(() => {
    const exams = examsQuery.data ?? [];
    return {
      active: exams.filter((exam) => ["available", "in_progress"].includes(exam.status)),
      upcoming: exams.filter((exam) => exam.status === "upcoming"),
      completed: exams.filter((exam) => exam.status === "completed"),
      expired: exams.filter((exam) => exam.status === "expired"),
    };
  }, [examsQuery.data]);

  const performance = useMemo(() => {
    const completed = sections.completed
      .filter((exam) => typeof exam.percentage === "number")
      .sort((a, b) => (a.submitted_at || "").localeCompare(b.submitted_at || ""));

    const averageScore = completed.length
      ? Math.round(completed.reduce((sum, exam) => sum + (exam.percentage || 0), 0) / completed.length)
      : 0;

    const bestExam = completed.reduce<LevelExamListItem | null>(
      (best, exam) => (!best || (exam.percentage || 0) > (best.percentage || 0) ? exam : best),
      null,
    );

    const recentTrend =
      completed.length >= 2
        ? (completed[completed.length - 1].percentage || 0) - (completed[completed.length - 2].percentage || 0)
        : null;

    const subjectStats = Array.from(
      completed.reduce<Map<string, { subject: string; attempts: number; average: number; highest: number }>>((acc, exam) => {
        const existing = acc.get(exam.subject_name) || {
          subject: exam.subject_name,
          attempts: 0,
          average: 0,
          highest: 0,
        };
        const score = exam.percentage || 0;
        existing.attempts += 1;
        existing.average += score;
        existing.highest = Math.max(existing.highest, score);
        acc.set(exam.subject_name, existing);
        return acc;
      }, new Map()),
    )
      .map(([, value]) => ({
        subject: value.subject,
        attempts: value.attempts,
        average: Math.round(value.average / value.attempts),
        highest: value.highest,
      }))
      .sort((a, b) => b.average - a.average || a.subject.localeCompare(b.subject));

    return {
      completedCount: completed.length,
      averageScore,
      bestExam,
      recentTrend,
      subjectStats,
    };
  }, [sections.completed]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Level Exams
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Subject-wise MCQ level exams assigned from the Level Exam module in Frappe.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/parent/level-exams/history">
              <History className="h-4 w-4" />
              Exam History
            </Link>
          </Button>
        </div>
      </motion.div>

      <motion.div variants={item}>
        <Card>
          <CardHeader>
            <CardTitle>Select Child</CardTitle>
            <CardDescription>
              Pick the child whose assigned level exams you want to view.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {children.map((child) => (
                <button
                  key={child.name}
                  onClick={() => setSelectedStudentId(child.name)}
                  className={`rounded-[12px] border px-4 py-3 text-left min-w-[220px] transition-colors ${
                    child.name === studentId
                      ? "border-primary bg-primary/5"
                      : "border-border-light bg-app-bg hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-text-primary">{child.student_name}</p>
                  <p className="text-xs text-text-secondary mt-1">{child.custom_branch?.replace("Smart Up ", "") || "Branch unavailable"}</p>
                </button>
              ))}
              {children.length === 0 && (
                <p className="text-sm text-text-secondary">No linked children available for level exams yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {selectedChild && (
        <motion.div variants={item} className="space-y-4">
          {examsQuery.error instanceof Error && (
            <div className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load assigned level exams: {examsQuery.error.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <SummaryCard label="Available Now" value={sections.active.length} icon={<PlayCircle className="h-5 w-5 text-warning" />} />
            <SummaryCard label="Upcoming" value={sections.upcoming.length} icon={<Clock3 className="h-5 w-5 text-info" />} />
            <SummaryCard label="Completed" value={sections.completed.length} icon={<CheckCircle2 className="h-5 w-5 text-success" />} />
            <SummaryCard label="Selected Child" value={selectedChild.student_name} icon={<BookOpen className="h-5 w-5 text-primary" />} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Student Exam Dashboard</CardTitle>
              <CardDescription>
                A quick performance snapshot based on completed level exams for {selectedChild.student_name}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <DashboardStat
                  label="Average Score"
                  value={performance.completedCount ? `${performance.averageScore}%` : "NA"}
                  icon={<Target className="h-5 w-5 text-primary" />}
                />
                <DashboardStat
                  label="Best Subject"
                  value={performance.bestExam?.subject_name || "Not enough data"}
                  icon={<Trophy className="h-5 w-5 text-success" />}
                />
                <DashboardStat
                  label="Top Score"
                  value={performance.bestExam ? `${performance.bestExam.percentage ?? 0}%` : "NA"}
                  icon={<CheckCircle2 className="h-5 w-5 text-success" />}
                />
                <DashboardStat
                  label="Recent Trend"
                  value={
                    performance.recentTrend == null
                      ? "Need 2 exams"
                      : performance.recentTrend > 0
                        ? `+${performance.recentTrend}%`
                        : `${performance.recentTrend}%`
                  }
                  icon={<TrendingUp className="h-5 w-5 text-warning" />}
                />
              </div>

              <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-semibold text-text-primary">Subject-wise Performance</p>
                  <Badge variant="outline">{performance.subjectStats.length}</Badge>
                </div>

                {performance.subjectStats.length === 0 ? (
                  <p className="mt-4 text-sm text-text-secondary">
                    This dashboard will fill in automatically after the child completes level exams.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {performance.subjectStats.map((subject) => (
                      <div key={subject.subject} className="rounded-[12px] border border-border-light bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-text-primary">{subject.subject}</p>
                          <Badge variant={subject.average >= 75 ? "success" : subject.average >= 40 ? "warning" : "error"}>
                            {subject.average}%
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-text-tertiary">Attempts</p>
                            <p className="font-semibold text-text-primary">{subject.attempts}</p>
                          </div>
                          <div>
                            <p className="text-text-tertiary">Highest</p>
                            <p className="font-semibold text-text-primary">{subject.highest}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {examsQuery.isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-28 bg-border-light rounded-[14px] animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <ExamSection title="Ready To Attend" exams={sections.active} studentId={studentId} emptyText="No active level exams are available for this child right now." />
          <ExamSection title="Upcoming" exams={sections.upcoming} studentId={studentId} emptyText="No upcoming level exams are scheduled yet." />
          <ExamSection title="Completed" exams={sections.completed} studentId={studentId} emptyText="No completed level exams yet." />
          <ExamSection title="Expired" exams={sections.expired} studentId={studentId} emptyText="No expired level exams." />
        </>
      )}
    </motion.div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-full bg-app-bg border border-border-light flex items-center justify-center">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">{label}</p>
          <p className="text-lg font-semibold text-text-primary truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
      </div>
      <p className="text-base font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function ExamSection({
  title,
  exams,
  studentId,
  emptyText,
}: {
  title: string;
  exams: LevelExamListItem[];
  studentId: string;
  emptyText: string;
}) {
  return (
    <motion.div
      variants={item}
      initial="hidden"
      animate="show"
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <Badge variant="outline">{exams.length}</Badge>
      </div>
      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-text-secondary">{emptyText}</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.exam_id} hover>
              <CardContent className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-semibold text-text-primary">{exam.title}</h3>
                    <Badge variant={statusBadgeVariant(exam.status)}>{exam.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-secondary flex-wrap">
                    <span>{exam.subject_name}</span>
                    <span>•</span>
                    <span>{exam.level_code}th {formatBoard(exam.board_code)}</span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{exam.duration_minutes} min</span>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Available till {new Date(exam.available_until).toLocaleString("en-IN")}
                    {typeof exam.percentage === "number" && (
                      <span> • Last score {exam.percentage}%</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {exam.status === "completed" && exam.attempt_id ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/parent/level-exams/results/${encodeURIComponent(exam.attempt_id)}?studentId=${encodeURIComponent(studentId)}`}>
                        View Result
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link href={`/dashboard/parent/level-exams/${encodeURIComponent(exam.exam_id)}?studentId=${encodeURIComponent(studentId)}`}>
                        {exam.status === "in_progress" ? "Resume" : "Open Exam"}
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
