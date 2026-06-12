"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getParentLevelExams } from "@/lib/api/levelExams";
import { formatDiagnosisDisplayTitle } from "@/lib/utils/diagnosis";
import { useParentData } from "../../page";

export default function ParentLevelExamHistoryPage() {
  const { user } = useAuth();
  const { data: parentData } = useParentData(user?.email);
  const children = parentData?.children ?? [];
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const studentId = selectedStudentId || children[0]?.name || "";

  const examsQuery = useQuery({
    queryKey: ["parent-level-exams-history", studentId],
    queryFn: () => getParentLevelExams(studentId),
    enabled: !!studentId,
  });

  const completed = useMemo(
    () => (examsQuery.data ?? []).filter((exam) => exam.status === "completed"),
    [examsQuery.data],
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/parent/level-exams">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Diagnosis History
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {children.map((child) => (
            <Button
              key={child.name}
              variant={child.name === studentId ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedStudentId(child.name)}
            >
              {child.student_name}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Completed Diagnosis Attempts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {completed.length === 0 ? (
            <p className="text-sm text-text-secondary">No completed diagnosis attempts yet for the selected child.</p>
          ) : (
            completed.map((exam) => (
              <div key={exam.exam_id} className="rounded-[12px] border border-border-light bg-app-bg p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-semibold text-text-primary">{formatDiagnosisDisplayTitle(exam.title)}</p>
                  <p className="text-xs text-text-secondary mt-1">
                    {exam.subject_name} • Level {exam.level_code} • Submitted {exam.submitted_at ? new Date(exam.submitted_at).toLocaleString("en-IN") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="success" className="text-sm">
                    <Trophy className="h-4 w-4 mr-1" />
                    {exam.percentage ?? 0}%
                  </Badge>
                  {exam.attempt_id && (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/parent/level-exams/results/${encodeURIComponent(exam.attempt_id)}?studentId=${encodeURIComponent(studentId)}`}>
                        Open Result
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
