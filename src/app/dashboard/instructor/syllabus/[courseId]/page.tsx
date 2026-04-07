"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  ArrowLeft,
  Send,
  Loader2,
  RotateCcw,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSyllabusParts, submitSyllabusPart } from "@/lib/api/syllabus";
import type { SyllabusPartCompletion, SyllabusPartStatus } from "@/lib/types/syllabus";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function statusIcon(status: SyllabusPartStatus) {
  switch (status) {
    case "Not Started": return <Circle className="h-5 w-5 text-text-tertiary" />;
    case "Pending Approval": return <Clock className="h-5 w-5 text-warning" />;
    case "Completed": return <CheckCircle2 className="h-5 w-5 text-success" />;
    case "Rejected": return <XCircle className="h-5 w-5 text-error" />;
  }
}

function statusBadgeVariant(status: SyllabusPartStatus) {
  switch (status) {
    case "Not Started": return "outline" as const;
    case "Pending Approval": return "warning" as const;
    case "Completed": return "success" as const;
    case "Rejected": return "error" as const;
  }
}

function formatDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function InstructorSyllabusDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const params = React.use(paramsPromise);
  const courseId = decodeURIComponent(params.courseId);
  const searchParams = useSearchParams();
  const program = searchParams.get("program") || "";
  const { instructorName } = useAuth();
  const queryClient = useQueryClient();

  // Fetch parts for this course
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["syllabus-parts-course", instructorName, courseId, program],
    queryFn: () =>
      getSyllabusParts({
        instructor: instructorName || undefined,
        course: courseId,
        program: program || undefined,
      }),
    staleTime: 30_000,
    enabled: !!instructorName,
  });

  const sorted = useMemo(
    () => [...parts].sort((a, b) => a.part_number - b.part_number),
    [parts],
  );

  const completed = sorted.filter((p) => p.status === "Completed").length;
  const total = sorted[0]?.total_parts ?? sorted.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Back + Header */}
      <motion.div variants={item}>
        <Link
          href="/dashboard/instructor/syllabus"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Syllabus
        </Link>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          {courseId}
        </h1>
        <p className="text-sm text-text-secondary mt-0.5">
          {program}
          {sorted[0]?.student_group && ` · ${sorted[0].student_group}`}
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-text-primary">
                {completed}/{total} parts completed
              </span>
              <span className="text-sm text-text-tertiary">{pct}%</span>
            </div>
            <div className="w-full h-3 bg-border-light rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Parts list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-[14px] bg-surface border border-border-light animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-text-secondary">No parts found for this course</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((part, index) => {
            // Locked if any previous part is not Completed
            const prevPart = index > 0 ? sorted[index - 1] : null;
            const isLocked = !!prevPart && prevPart.status !== "Completed";
            return (
              <motion.div
                key={part.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <PartCard part={part} isLocked={isLocked} />
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Part Card ───────────────────────────────────────────────────
function PartCard({ part, isLocked }: { part: SyllabusPartCompletion; isLocked: boolean }) {
  const queryClient = useQueryClient();
  const [showSubmit, setShowSubmit] = useState(false);
  const [remarks, setRemarks] = useState("");

  const submitMutation = useMutation({
    mutationFn: ({ id, remarks }: { id: string; remarks?: string }) =>
      submitSyllabusPart(id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["syllabus-parts-course"] });
      queryClient.invalidateQueries({ queryKey: ["syllabus-parts-instructor"] });
      setShowSubmit(false);
      setRemarks("");
    },
  });

  const canSubmit = !isLocked && (part.status === "Not Started" || part.status === "Rejected");

  return (
    <Card className={isLocked ? "opacity-50" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="pt-0.5 shrink-0">
            {isLocked ? <Lock className="h-5 w-5 text-text-tertiary" /> : statusIcon(part.status)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-text-primary">
                Part {part.part_number}: {part.part_title}
              </h3>
              <Badge variant={statusBadgeVariant(part.status)}>{part.status}</Badge>
            </div>

            {/* Status-specific info */}
            {part.status === "Completed" && (
              <p className="text-xs text-text-tertiary mt-1">
                Approved {formatDate(part.approved_date)}
                {part.approved_by && ` by ${part.approved_by}`}
              </p>
            )}
            {part.status === "Pending Approval" && (
              <p className="text-xs text-text-tertiary mt-1">
                Submitted {formatDate(part.completed_date)}
                {part.remarks && (
                  <span className="block mt-1 text-text-secondary">
                    Remarks: &ldquo;{part.remarks}&rdquo;
                  </span>
                )}
              </p>
            )}
            {part.status === "Rejected" && (
              <div className="mt-1">
                <p className="text-xs text-error">
                  Rejected: {part.rejection_reason}
                </p>
              </div>
            )}

            {/* Submit form */}
            {isLocked && (
              <p className="mt-2 text-xs text-text-tertiary flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Complete the previous part first
              </p>
            )}
            {canSubmit && !showSubmit && (
              <button
                onClick={() => setShowSubmit(true)}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-[10px] font-medium hover:bg-primary/90 transition-colors"
              >
                {part.status === "Rejected" ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Re-submit
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Mark as Completed
                  </>
                )}
              </button>
            )}

            <AnimatePresence>
              {showSubmit && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add optional remarks (e.g., topics covered, practicals done)..."
                    rows={2}
                    className="w-full rounded-[10px] border border-border-input bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitMutation.mutate({ id: part.name, remarks: remarks || undefined })}
                      disabled={submitMutation.isPending}
                      className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm rounded-[10px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {submitMutation.isPending ? "Submitting…" : "Submit for Approval"}
                    </button>
                    <button
                      onClick={() => { setShowSubmit(false); setRemarks(""); }}
                      className="px-3 py-2 bg-surface border border-border-light text-sm rounded-[10px] text-text-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                  {submitMutation.isError && (
                    <p className="text-xs text-error">
                      {(submitMutation.error as Error).message}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
