"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getParentLevelExamAttempt, saveParentLevelExamAnswer, submitParentLevelExamAttempt } from "@/lib/api/levelExams";

export default function ParentLevelExamAttemptPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ attemptId: string }>();
  const searchParams = useSearchParams();
  const attemptId = typeof params?.attemptId === "string" ? decodeURIComponent(params.attemptId) : "";
  const studentId = searchParams.get("studentId") || "";
  const [remainingSecondsOverride, setRemainingSecondsOverride] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const attemptQuery = useQuery({
    queryKey: ["parent-level-exam-attempt", attemptId, studentId],
    queryFn: () => getParentLevelExamAttempt(attemptId, studentId),
    enabled: !!attemptId && !!studentId,
    retry: false,
  });

  useEffect(() => {
    if (attemptQuery.error instanceof Error && attemptQuery.error.message === "ATTEMPT_TIMED_OUT") {
      router.replace(`/dashboard/parent/level-exams/results/${encodeURIComponent(attemptId)}?studentId=${encodeURIComponent(studentId)}`);
    }
  }, [attemptId, attemptQuery.error, router, studentId]);

  const submitMutation = useMutation({
    mutationFn: () => submitParentLevelExamAttempt(attemptId, studentId),
    onSuccess: (result) => {
      router.replace(`/dashboard/parent/level-exams/results/${encodeURIComponent(result.attempt_id)}?studentId=${encodeURIComponent(studentId)}`);
    },
  });

  const remainingSeconds = remainingSecondsOverride ?? attemptQuery.data?.remaining_seconds ?? null;

  useEffect(() => {
    if (remainingSeconds === null || submitMutation.isPending) return;
    if (remainingSeconds <= 0) {
      submitMutation.mutate();
      return;
    }
    const timer = window.setInterval(() => {
      setRemainingSecondsOverride((value) => {
        const current = value ?? attemptQuery.data?.remaining_seconds ?? 0;
        return Math.max(0, current - 1);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attemptQuery.data?.remaining_seconds, remainingSeconds, submitMutation]);

  const answerMutation = useMutation({
    mutationFn: async (payload: { questionId: string; optionId: string }) => {
      return saveParentLevelExamAnswer(attemptId, studentId, {
        question_id: payload.questionId,
        selected_option_id: payload.optionId,
      });
    },
    onSuccess: (_, payload) => {
      queryClient.setQueryData(["parent-level-exam-attempt", attemptId, studentId], (current: Awaited<ReturnType<typeof getParentLevelExamAttempt>> | undefined) => {
        if (!current) return current;
        return {
          ...current,
          questions: current.questions.map((question) =>
            question.id === payload.questionId
              ? { ...question, selected_option_id: payload.optionId }
              : question
          ),
        };
      });
    },
  });

  const attempt = attemptQuery.data;
  const currentQuestion = attempt?.questions[currentIndex];
  const answeredCount = attempt?.questions.filter((question) => question.selected_option_id).length ?? 0;

  const handleSelectOption = (questionId: string, optionId: string) => {
    answerMutation.mutate({ questionId, optionId });
  };

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dashboard/parent/level-exams?studentId=${encodeURIComponent(studentId)}`}>
            <ArrowLeft className="h-4 w-4" />
            Exit
          </Link>
        </Button>

        {typeof remainingSeconds === "number" && (
          <Badge variant={remainingSeconds < 120 ? "error" : "warning"} className="text-sm px-3 py-1">
            <Clock3 className="h-4 w-4 mr-1" />
            {formatRemaining(remainingSeconds)}
          </Badge>
        )}
      </div>

      {attemptQuery.isLoading ? (
        <div className="h-64 rounded-[14px] bg-border-light animate-pulse" />
      ) : !attempt ? (
        <Card>
          <CardContent className="py-10 text-center text-text-secondary">Attempt not found.</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{attempt.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-sm text-text-secondary">
                {attempt.child.student_name} • {attempt.subject_name} • Level {attempt.level_code}
              </div>
              <div className="text-sm font-medium text-text-primary">
                Answered {answeredCount}/{attempt.total_questions}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)] gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Questions</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-5 lg:grid-cols-4 gap-2">
                {attempt.questions.map((question, index) => (
                  <button
                    key={question.id}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-10 rounded-[10px] border text-sm font-semibold ${
                      index === currentIndex
                        ? "border-primary bg-primary text-white"
                        : question.selected_option_id
                          ? "border-success bg-success/10 text-success"
                          : "border-border-light bg-app-bg text-text-primary"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </CardContent>
            </Card>

            {currentQuestion && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-lg">Question {currentIndex + 1}</CardTitle>
                    <Badge variant="outline">{currentQuestion.marks} marks</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-base text-text-primary leading-7">{currentQuestion.stem}</p>

                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const active = currentQuestion.selected_option_id === option.id;
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                          className={`w-full rounded-[12px] border p-4 text-left transition-colors ${
                            active
                              ? "border-primary bg-primary/5"
                              : "border-border-light bg-app-bg hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm font-semibold ${
                              active ? "border-primary bg-primary text-white" : "border-border-input text-text-secondary"
                            }`}>
                              {option.option_key}
                            </div>
                            <p className="text-sm text-text-primary leading-6">{option.option_text}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-text-tertiary inline-flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Answers autosave as you select them.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}
                        disabled={currentIndex === 0}
                      >
                        Previous
                      </Button>
                      {currentIndex < attempt.questions.length - 1 ? (
                        <Button onClick={() => setCurrentIndex((value) => Math.min(attempt.questions.length - 1, value + 1))}>
                          Next
                        </Button>
                      ) : (
                        <Button onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
                          Submit Exam
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
