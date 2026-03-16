"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  School,
  Loader2,
  RefreshCw,
  User,
  Search,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getBatch } from "@/lib/api/batches";
import type { Batch, BatchStudent } from "@/lib/types/batch";

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const decodedId = decodeURIComponent(id);

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  function loadBatch() {
    setLoading(true);
    setError(null);
    getBatch(decodedId)
      .then((res) => setBatch(res.data))
      .catch(() => setError("Failed to load batch details."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadBatch();
  }, [decodedId]);

  // Filter students by search
  const students: BatchStudent[] = batch?.students ?? [];
  const activeStudents = students.filter((s) => s.active !== 0);
  const filteredStudents = search
    ? activeStudents.filter(
        (s) =>
          (s.student_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          s.student.toLowerCase().includes(search.toLowerCase())
      )
    : activeStudents;

  const backHref = batch?.program
    ? `/dashboard/branch-manager/batches?program=${encodeURIComponent(batch.program)}`
    : "/dashboard/branch-manager/batches";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Batches
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <p className="text-error text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={loadBatch}>
            Retry
          </Button>
        </div>
      )}

      {batch && !loading && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                {batch.student_group_name}
              </h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-text-secondary">
                {batch.program && (
                  <span className="flex items-center gap-1">
                    <School className="h-3.5 w-3.5" />
                    {batch.program}
                  </span>
                )}
                {batch.academic_year && <span>{batch.academic_year}</span>}
                {batch.custom_branch && (
                  <span className="text-text-tertiary">{batch.custom_branch}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={batch.disabled ? "error" : "success"}>
                {batch.disabled ? "Disabled" : "Active"}
              </Badge>
              <Button
                variant="outline"
                size="md"
                onClick={loadBatch}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Total Students</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {activeStudents.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Max Strength</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {batch.max_strength || "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Active Students</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {activeStudents.length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-text-secondary">Inactive</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {students.length - activeStudents.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Students Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Students ({filteredStudents.length})
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <Input
                    placeholder="Search students..."
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
                  {search ? "No students match your search." : "No students in this batch."}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border-light">
                        <th className="text-left pb-3 font-semibold text-text-secondary w-12">
                          #
                        </th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">
                          Student ID
                        </th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">
                          Name
                        </th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">
                          Roll No
                        </th>
                        <th className="text-left pb-3 font-semibold text-text-secondary">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <motion.tr
                          key={student.student}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(index * 0.02, 0.5) }}
                          className="border-b border-border-light hover:bg-brand-wash/30 transition-colors"
                        >
                          <td className="py-2.5 text-text-tertiary">
                            {index + 1}
                          </td>
                          <td className="py-2.5">
                            <Link
                              href={`/dashboard/branch-manager/students/${encodeURIComponent(student.student)}`}
                              className="text-primary hover:underline font-medium"
                            >
                              {student.student}
                            </Link>
                          </td>
                          <td className="py-2.5 font-medium text-text-primary flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
                            {student.student_name || "—"}
                          </td>
                          <td className="py-2.5 text-text-secondary">
                            {student.batch_roll_number ?? student.group_roll_number ?? "—"}
                          </td>
                          <td className="py-2.5">
                            <Badge
                              variant={
                                student.active === 1 ? "success" : "error"
                              }
                            >
                              {student.active === 1 ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}
