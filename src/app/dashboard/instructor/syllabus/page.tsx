"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import { getSyllabusParts } from "@/lib/api/syllabus";
import type { SyllabusPartCompletion, InstructorCourseProgress } from "@/lib/types/syllabus";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function InstructorSyllabusPage() {
  const { instructorName, defaultCompany } = useAuth();

  // Fetch all completion records for this instructor
  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["syllabus-parts-instructor", instructorName, defaultCompany],
    queryFn: () =>
      getSyllabusParts({
        instructor: instructorName || undefined,
        company: defaultCompany || undefined,
      }),
    staleTime: 30_000,
    enabled: !!instructorName,
  });

  // Group by course+program
  const courseProgress: InstructorCourseProgress[] = useMemo(() => {
    const map = new Map<string, SyllabusPartCompletion[]>();
    for (const p of parts) {
      const key = `${p.course}::${p.program}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    return [...map.entries()].map(([, records]) => {
      const first = records[0];
      return {
        course: first.course,
        program: first.program,
        student_group: first.student_group,
        total_parts: first.total_parts,
        completed: records.filter((r) => r.status === "Completed").length,
        pending_approval: records.filter((r) => r.status === "Pending Approval").length,
        rejected: records.filter((r) => r.status === "Rejected").length,
        not_started: records.filter((r) => r.status === "Not Started").length,
        configured: true,
      };
    }).sort((a, b) => a.course.localeCompare(b.course));
  }, [parts]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          My Syllabus Progress
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Track and submit syllabus part completions
        </p>
      </motion.div>

      {/* Summary */}
      {!isLoading && parts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        >
          <SummaryCard
            label="Completed"
            count={parts.filter((p) => p.status === "Completed").length}
            total={parts.length}
            icon={<CheckCircle2 className="h-5 w-5 text-success" />}
          />
          <SummaryCard
            label="Pending"
            count={parts.filter((p) => p.status === "Pending Approval").length}
            total={parts.length}
            icon={<Clock className="h-5 w-5 text-warning" />}
          />
          <SummaryCard
            label="Rejected"
            count={parts.filter((p) => p.status === "Rejected").length}
            total={parts.length}
            icon={<XCircle className="h-5 w-5 text-error" />}
          />
          <SummaryCard
            label="Not Started"
            count={parts.filter((p) => p.status === "Not Started").length}
            total={parts.length}
            icon={<AlertTriangle className="h-5 w-5 text-text-tertiary" />}
          />
        </motion.div>
      )}

      {/* Course Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 rounded-[14px] bg-surface border border-border-light animate-pulse" />
          ))}
        </div>
      ) : courseProgress.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-text-secondary">No syllabus parts assigned yet</p>
              <p className="text-sm text-text-tertiary mt-1">
                Your Branch Manager will configure syllabus parts for your courses
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courseProgress.map((cp, index) => (
            <motion.div
              key={`${cp.course}::${cp.program}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Link
                href={`/dashboard/instructor/syllabus/${encodeURIComponent(cp.course)}?program=${encodeURIComponent(cp.program)}`}
              >
                <Card className="hover:shadow-card-hover transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                          {cp.course}
                        </h3>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {cp.program}
                          {cp.student_group && ` · ${cp.student_group}`}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:text-primary transition-colors shrink-0" />
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-text-secondary font-medium">
                          {cp.completed}/{cp.total_parts} completed
                        </span>
                        <span className="text-xs text-text-tertiary">
                          {cp.total_parts > 0 ? Math.round((cp.completed / cp.total_parts) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-border-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{
                            width: `${cp.total_parts > 0 ? (cp.completed / cp.total_parts) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {cp.pending_approval > 0 && (
                        <Badge variant="warning">{cp.pending_approval} pending</Badge>
                      )}
                      {cp.rejected > 0 && (
                        <Badge variant="error">{cp.rejected} rejected</Badge>
                      )}
                      {cp.completed === cp.total_parts && cp.total_parts > 0 && (
                        <Badge variant="success">All Complete!</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SummaryCard({ label, count, total, icon }: {
  label: string;
  count: number;
  total: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        {icon}
        <div>
          <p className="text-xl font-bold text-text-primary">{count}</p>
          <p className="text-xs text-text-tertiary">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
