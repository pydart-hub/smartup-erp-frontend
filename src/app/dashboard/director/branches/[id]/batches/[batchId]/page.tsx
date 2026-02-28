"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Users,
  GraduationCap,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBatchStudents } from "@/lib/api/director";

export default function BatchDetailPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const batchName = decodeURIComponent(params.batchId as string);
  const shortBranch = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const {
    data: batchRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-batch-students", batchName],
    queryFn: () => getBatchStudents(batchName),
    staleTime: 120_000,
  });

  const students = batchRes?.students ?? [];
  const activeStudents = students.filter((s) => s.active);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href={`/dashboard/director/branches/${encodedBranch}/batches`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Batches
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[10px] bg-brand-wash flex items-center justify-center">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{batchName}</h1>
            <p className="text-sm text-text-tertiary">{shortBranch}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            {activeStudents.length} active / {students.length} total
          </Badge>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{students.length}</p>
            <p className="text-xs text-text-tertiary">Total Enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{activeStudents.length}</p>
            <p className="text-xs text-text-tertiary">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">
              {students.length - activeStudents.length}
            </p>
            <p className="text-xs text-text-tertiary">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load batch students</p>
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-sm text-text-tertiary">No students enrolled in this batch</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-app-bg">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary w-16">
                      #
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Student ID
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">
                      Name
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, idx) => (
                    <tr
                      key={s.student}
                      className="border-b border-border-light last:border-0 hover:bg-app-bg/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-text-tertiary">
                        {s.group_roll_number || idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-text-secondary">
                          {s.student}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text-primary">
                        {s.student_name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={s.active ? "success" : "error"}
                          className="text-[10px]"
                        >
                          {s.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
