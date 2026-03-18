"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  UserCheck,
  Loader2,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getBranchInstructors } from "@/lib/api/director";

export default function BranchTeachersPage() {
  const params = useParams();
  const branchName = decodeURIComponent(params.id as string);
  const shortName = branchName.replace("Smart Up ", "").replace("Smart Up", "HQ");
  const encodedBranch = encodeURIComponent(branchName);

  const {
    data: instructors,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["director-branch-instructors-list", branchName],
    queryFn: () => getBranchInstructors(branchName),
    staleTime: 120_000,
  });

  const instructorList = instructors ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <BreadcrumbNav />

      <Link
        href={`/dashboard/director/branches/${encodedBranch}`}
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {shortName}
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Teachers & Staff — {shortName}
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {instructorList.length} instructors
          </p>
        </div>
        <Badge variant="outline" className="self-start text-xs">
          {branchName}
        </Badge>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load teachers</p>
        </div>
      ) : instructorList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48">
          <p className="text-sm text-text-tertiary">No instructors found for this branch</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {instructorList.map((instr) => (
            <Card
              key={instr.name}
              className="border-border-light hover:border-primary/20 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text-primary text-sm truncate">
                        {instr.instructor_name}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                        {instr.designation || "Instructor"}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-tertiary truncate">
                      {instr.name}
                    </p>
                    {instr.employee && (
                      <p className="text-xs text-text-tertiary">
                        Employee: {instr.employee}
                      </p>
                    )}
                    {instr.subjects && instr.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        <BookOpen className="h-3 w-3 text-text-tertiary mt-0.5 shrink-0" />
                        {instr.subjects.map((subject) => (
                          <span
                            key={subject}
                            className="inline-block rounded-md bg-brand-wash px-1.5 py-0.5 text-[10px] font-medium text-primary"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
