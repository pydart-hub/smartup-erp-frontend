"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clock3, PlayCircle, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getParentLevelExamDetail, startParentLevelExam } from "@/lib/api/levelExams";

function formatBoard(board?: string) {
  if (board === "cbse") return "CBSE";
  if (board === "state") return "State";
  return "";
}

export default function ParentLevelExamDetailPage() {
  const router = useRouter();
  const params = useParams<{ examId: string }>();
  const searchParams = useSearchParams();
  const examId = typeof params?.examId === "string" ? decodeURIComponent(params.examId) : "";
  const studentId = searchParams.get("studentId") || "";
  const routeReady = Boolean(examId && studentId);

  const detailQuery = useQuery({
    queryKey: ["parent-level-exam-detail", examId, studentId],
    queryFn: () => getParentLevelExamDetail(examId, studentId),
    enabled: routeReady,
    refetchOnMount: "always",
  });

  const startMutation = useMutation({
    mutationFn: () => startParentLevelExam(examId, studentId),
    onSuccess: (data) => {
      router.push(`/dashboard/parent/level-exams/attempt/${encodeURIComponent(data.attempt_id)}?studentId=${encodeURIComponent(studentId)}`);
    },
  });

  const detail = detailQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/parent/level-exams?studentId=${encodeURIComponent(studentId)}`}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {!routeReady ? (
        <div className="h-48 rounded-[14px] bg-border-light animate-pulse" />
      ) : detailQuery.isLoading || detailQuery.isFetching ? (
        <div className="h-48 rounded-[14px] bg-border-light animate-pulse" />
      ) : detailQuery.isError ? (
        <Card>
          <CardContent className="py-10 text-center text-text-secondary">
            {detailQuery.error instanceof Error ? detailQuery.error.message : "Failed to load this exam."}
          </CardContent>
        </Card>
      ) : !detail ? (
        <Card>
          <CardContent className="py-10 text-center text-text-secondary">Exam not found for this child.</CardContent>
        </Card>
      ) : (
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>{detail.title}</CardTitle>
                  <CardDescription className="mt-2">
                    {detail.subject_name} • {detail.level_code}th {formatBoard(detail.board_code)} • {detail.total_questions} questions
                  </CardDescription>
                </div>
                <Badge variant={detail.status === "available" ? "warning" : detail.status === "in_progress" ? "info" : "outline"}>
                  {detail.status.replaceAll("_", " ")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoTile icon={<User className="h-4 w-4 text-primary" />} label="Child" value={detail.child.student_name} />
                <InfoTile icon={<Clock3 className="h-4 w-4 text-warning" />} label="Duration" value={`${detail.duration_minutes} minutes`} />
                <InfoTile icon={<BookOpen className="h-4 w-4 text-info" />} label="Marks" value={`${detail.total_marks} total`} />
              </div>

              <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
                <p className="text-sm font-semibold text-text-primary mb-2">Instructions</p>
                <p className="text-sm text-text-secondary leading-6">{detail.instructions}</p>
              </div>

              {detail.active_attempt ? (
                <div className="flex items-center justify-between gap-3 rounded-[12px] border border-info/20 bg-info/5 p-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">An attempt is already in progress</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {detail.active_attempt.answered_count}/{detail.active_attempt.total_questions} answered • {Math.max(0, Math.floor(detail.active_attempt.remaining_seconds / 60))} minutes left
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/dashboard/parent/level-exams/attempt/${encodeURIComponent(detail.active_attempt.attempt_id)}?studentId=${encodeURIComponent(studentId)}`}>
                      Resume Attempt
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-text-secondary">Results will appear immediately after submission.</p>
                    <Button onClick={() => startMutation.mutate()} loading={startMutation.isPending} disabled={detail.status === "expired" || detail.status === "upcoming"}>
                      <PlayCircle className="h-4 w-4" />
                      Start Exam
                    </Button>
                  </div>
                  {startMutation.error instanceof Error && (
                    <div className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {startMutation.error.message}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-border-light bg-app-bg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs uppercase tracking-wide text-text-tertiary">{label}</span>
      </div>
      <p className="text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}
