"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getBranchStudents, getStudentCountForBranch } from "@/lib/api/director";

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "inactive";

export default function BranchAllStudentsPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const enabledParam =
    statusFilter === "active" ? 1 : statusFilter === "inactive" ? 0 : undefined;

  const { data: totalCount } = useQuery({
    queryKey: ["director-branch-student-count", branchName],
    queryFn: () => getStudentCountForBranch(branchName),
    staleTime: 120_000,
  });

  const {
    data: studentsRes,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-students-list", branchName, search, statusFilter, page],
    queryFn: () =>
      getBranchStudents(branchName, {
        search: search || undefined,
        enabled: enabledParam,
        limit_start: page * PAGE_SIZE,
        limit_page_length: PAGE_SIZE,
        order_by: "student_name asc",
      }),
    staleTime: 30_000,
  });

  const students = studentsRes?.data ?? [];
  const hasMore = students.length === PAGE_SIZE;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Back */}
      <Link
        href={`/dashboard/director/branches/${encodedBranch}/students`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Programs
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            All Students — {shortName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {totalCount !== undefined ? `${totalCount} total students` : "Loading..."}
          </p>
        </div>
        <Badge variant="outline" className="self-start text-xs">
          {branchName}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search students..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "active", "inactive"] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "primary" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load students</p>
        </div>
      ) : students.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <p className="text-sm text-text-tertiary">No students found</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-app-bg">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Student</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary hidden sm:table-cell">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary hidden md:table-cell">Gender</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary hidden lg:table-cell">Joined</th>
                    <th className="text-center px-4 py-3 font-medium text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.name}
                      className="border-b border-border-light last:border-0 hover:bg-app-bg/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">{s.student_name}</p>
                          <p className="text-xs text-text-tertiary">{s.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">
                        {s.student_email_id || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden md:table-cell">
                        {s.gender || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">
                        {s.joining_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={s.enabled ? "success" : "error"} className="text-[10px]">
                          {s.enabled ? "Active" : "Inactive"}
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

      {/* Pagination */}
      {!isLoading && students.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-tertiary">
            Showing {page * PAGE_SIZE + 1}–{page * PAGE_SIZE + students.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasMore}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
