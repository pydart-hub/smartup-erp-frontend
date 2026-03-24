"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  User,
  School,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import apiClient from "@/lib/api/client";
import type { BatchStudent } from "@/lib/types/batch";

interface StudentWithBatch extends BatchStudent {
  batchName: string;
  program: string;
}

export default function InstructorStudentsPage() {
  const { batches, isLoading: loading, isError: hasError, refetch } = useInstructorBatches();
  const [search, setSearch] = React.useState("");

  // Flatten all students from all batches with batch context
  const allStudents: StudentWithBatch[] = useMemo(() => {
    const students: StudentWithBatch[] = [];
    for (const batch of batches) {
      for (const s of batch.students ?? []) {
        if (s.active !== 0) {
          students.push({
            ...s,
            batchName: batch.student_group_name,
            program: batch.program || "—",
          });
        }
      }
    }
    return students;
  }, [batches]);

  // Fetch disabilities for all student IDs
  const studentIds = useMemo(() => allStudents.map((s) => s.student), [allStudents]);
  const { data: disabilityMap = {} } = useQuery({
    queryKey: ["student-disabilities", studentIds],
    queryFn: async () => {
      if (!studentIds.length) return {};
      const { data } = await apiClient.get("/resource/Student", {
        params: {
          fields: JSON.stringify(["name", "custom_disabilities"]),
          filters: JSON.stringify([["name", "in", studentIds]]),
          limit_page_length: studentIds.length,
        },
      });
      const map: Record<string, string> = {};
      for (const s of data.data ?? []) {
        if (s.custom_disabilities) map[s.name] = s.custom_disabilities;
      }
      return map;
    },
    enabled: studentIds.length > 0,
    staleTime: 60_000,
  });

  const filteredStudents = search
    ? allStudents.filter(
        (s) =>
          (s.student_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          s.student.toLowerCase().includes(search.toLowerCase()) ||
          s.batchName.toLowerCase().includes(search.toLowerCase())
      )
    : allStudents;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Students</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            All students across your assigned batches
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="md" onClick={() => refetch()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Error */}
      {hasError && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">Failed to load student data.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!loading && !hasError && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                {filteredStudents.length} Student{filteredStudents.length !== 1 ? "s" : ""}
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  placeholder="Search by name, ID, or batch..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <p className="text-center text-text-secondary text-sm py-8">
                {search ? "No students match your search." : "No students found in your batches."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left pb-3 font-semibold text-text-secondary w-12">#</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Student ID</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Name</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Batch</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Program</th>
                      <th className="text-left pb-3 font-semibold text-text-secondary">Roll No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <motion.tr
                        key={`${student.student}-${student.batchName}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(index * 0.02, 0.5) }}
                        className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                      >
                        <td className="py-2.5 text-text-tertiary">{index + 1}</td>
                        <td className="py-2.5">
                          <span className="text-primary font-medium">{student.student}</span>
                        </td>
                        <td className="py-2.5 font-medium text-text-primary">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
                            {student.student_name || "—"}
                            {disabilityMap[student.student] && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{disabilityMap[student.student]}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 text-text-secondary">
                          <div className="flex items-center gap-1.5">
                            <School className="h-3 w-3 text-text-tertiary" />
                            {student.batchName}
                          </div>
                        </td>
                        <td className="py-2.5 text-text-secondary">{student.program}</td>
                        <td className="py-2.5 text-text-secondary">
                          {student.batch_roll_number ?? student.group_roll_number ?? "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
