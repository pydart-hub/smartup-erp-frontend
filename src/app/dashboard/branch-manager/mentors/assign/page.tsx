"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getStudents } from "@/lib/api/students";
import {
  createMentorAssignment,
  getBranchMentors,
  getMentorAssignments,
  reassignMentorAssignment,
} from "@/lib/api/mentors";
import { getBatches, getBatch } from "@/lib/api/batches";

export default function BranchManagerMentorsAssignPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState("");
  const [assignmentChoice, setAssignmentChoice] = useState<Record<string, string>>({});
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<"regular" | "subject" | "one-to-one">("regular");

  const mentorsQuery = useQuery({
    queryKey: ["branch-mentors", defaultCompany],
    queryFn: () => getBranchMentors(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });
  
  const assignmentsQuery = useQuery({
    queryKey: ["branch-mentor-assignments", defaultCompany],
    queryFn: () => getMentorAssignments(defaultCompany || undefined),
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  const batchesDetailedQuery = useQuery({
    queryKey: ["branch-batches-detailed", defaultCompany],
    queryFn: async () => {
      if (!defaultCompany) return [];
      const res = await getBatches({
        custom_branch: defaultCompany,
        limit_page_length: 500,
      });
      const activeBatches = (res.data ?? []).filter((b) => !b.disabled);
      
      const detailedBatches = await Promise.all(
        activeBatches.map(async (b) => {
          try {
            const detail = await getBatch(b.name);
            return detail.data;
          } catch (err) {
            console.error(`Failed to fetch details for batch ${b.name}:`, err);
            return { ...b, students: [] };
          }
        })
      );
      return detailedBatches;
    },
    enabled: !!defaultCompany,
    staleTime: 30_000,
  });

  const studentsQuery = useQuery({
    queryKey: ["mentor-assignable-students", defaultCompany],
    queryFn: () => getStudents({ custom_branch: defaultCompany || undefined, enabled: 1, limit_page_length: 500 }),
    enabled: !!defaultCompany,
    staleTime: 60_000,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ studentId, assignmentId }: { studentId: string; assignmentId?: string }) => {
      const mentorProfile = assignmentChoice[studentId];
      if (!mentorProfile) throw new Error("Choose a mentor first");
      if (assignmentId) {
        return reassignMentorAssignment(assignmentId, { mentor_profile: mentorProfile });
      }
      return createMentorAssignment({ student: studentId, mentor_profile: mentorProfile });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-mentor-assignments", defaultCompany] });
      queryClient.invalidateQueries({ queryKey: ["branch-mentors", defaultCompany] });
    },
  });

  const mentors = mentorsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const batchesDetailed = batchesDetailedQuery.data ?? [];
  
  const activeMentors = mentors.filter((row) => row.status === "Active");
  const assignmentMap = new Map(assignments.filter((row) => row.status === "Active").map((row) => [row.student, row]));

  const batchMetrics = useMemo(() => {
    const activeAssignments = assignments.filter((a) => a.status === "Active");
    const assignedStudentIds = new Set(activeAssignments.map((a) => a.student));
    
    // 1. Compute global/all metrics
    const totalStudentsInBranch = studentsQuery.data?.data?.length ?? 0;
    const totalAssignedInBranch = studentsQuery.data?.data?.filter((s) => assignedStudentIds.has(s.name)).length ?? 0;
    const totalUnassignedInBranch = Math.max(0, totalStudentsInBranch - totalAssignedInBranch);
    
    // 2. Compute per-batch metrics
    const list = batchesDetailed.map((batch) => {
      const batchStudentMembers = (batch.students ?? []).filter((s) => s.active !== 0);
      const total = batchStudentMembers.length;
      
      const assigned = batchStudentMembers.filter((s) => assignedStudentIds.has(s.student)).length;
      const unassigned = Math.max(0, total - assigned);
      
      const isOneToOne = batch.custom_is_one_to_one === 1;
      const isSubjectWise = !!batch.custom_subject;
      const category = isOneToOne ? "one-to-one" : isSubjectWise ? "subject" : "regular";
      
      return {
        id: batch.name,
        name: batch.student_group_name,
        program: batch.program || "",
        total,
        assigned,
        unassigned,
        category,
        studentIds: new Set(batchStudentMembers.map((s) => s.student)),
      };
    });
    
    return {
      all: {
        id: "all",
        name: "All Students",
        total: totalStudentsInBranch,
        assigned: totalAssignedInBranch,
        unassigned: totalUnassignedInBranch,
      },
      batches: list,
    };
  }, [studentsQuery.data?.data, assignments, batchesDetailed]);

  const subjectStudentIds = useMemo(() => {
    const set = new Set<string>();
    batchMetrics.batches
      .filter((b) => b.category === "subject")
      .forEach((b) => b.studentIds.forEach((id) => set.add(id)));
    return set;
  }, [batchMetrics]);

  const oneToOneStudentIds = useMemo(() => {
    const set = new Set<string>();
    batchMetrics.batches
      .filter((b) => b.category === "one-to-one")
      .forEach((b) => b.studentIds.forEach((id) => set.add(id)));
    return set;
  }, [batchMetrics]);

  const categorySummary = useMemo(() => {
    const activeAssignments = assignments.filter((a) => a.status === "Active");
    const assignedStudentIds = new Set(activeAssignments.map((a) => a.student));
    
    // Subject stats
    const subjectTotal = subjectStudentIds.size;
    const subjectAssigned = Array.from(subjectStudentIds).filter((id) => assignedStudentIds.has(id)).length;
    const subjectPending = Math.max(0, subjectTotal - subjectAssigned);
    
    // One-to-One stats
    const oneToOneTotal = oneToOneStudentIds.size;
    const oneToOneAssigned = Array.from(oneToOneStudentIds).filter((id) => assignedStudentIds.has(id)).length;
    const oneToOnePending = Math.max(0, oneToOneTotal - oneToOneAssigned);
    
    return {
      subject: {
        total: subjectTotal,
        assigned: subjectAssigned,
        unassigned: subjectPending,
      },
      oneToOne: {
        total: oneToOneTotal,
        assigned: oneToOneAssigned,
        unassigned: oneToOnePending,
      },
    };
  }, [assignments, subjectStudentIds, oneToOneStudentIds]);

  const filteredStudents = useMemo(() => {
    let rows = studentsQuery.data?.data ?? [];
    
    // Filter by selected batch
    if (selectedBatchId && selectedBatchId !== "all") {
      const selectedBatch = batchMetrics.batches.find((b) => b.id === selectedBatchId);
      if (selectedBatch) {
        rows = rows.filter((student) => selectedBatch.studentIds.has(student.name));
      } else {
        rows = [];
      }
    } else {
      // If no specific batch is selected (selectedBatchId === "all"), filter by activeCategory scope
      if (activeCategory === "subject") {
        rows = rows.filter((student) => subjectStudentIds.has(student.name));
      } else if (activeCategory === "one-to-one") {
        rows = rows.filter((student) => oneToOneStudentIds.has(student.name));
      }
    }
    
    const query = studentSearch.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.student_name, row.name, row.custom_parent_name, row.student_mobile_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [studentSearch, studentsQuery.data?.data, selectedBatchId, activeCategory, batchMetrics, subjectStudentIds, oneToOneStudentIds]);

  const isLoading = mentorsQuery.isLoading || assignmentsQuery.isLoading || studentsQuery.isLoading;

  return (
    <div className="space-y-6">
      <BreadcrumbNav />
      <div>
        <Link href="/dashboard/branch-manager/mentors" className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Mentors Portal
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Assign Mentors</h1>
        <p className="text-sm text-text-secondary mt-1">Assign students to mentors and manage allocations</p>
      </div>

      {isLoading ? (
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card>
          <CardHeader><CardTitle>Student Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Batches Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-secondary">Classification by Batch</h3>
                  <p className="text-xs text-text-tertiary">Select a category tab and click a card to filter students below</p>
                </div>
                {batchesDetailedQuery.isPending && (
                  <span className="text-xs text-text-tertiary animate-pulse">Loading batches...</span>
                )}
              </div>

              {/* Category Tab Switcher */}
              <div className="flex gap-2 p-1 bg-app-bg border border-border-light rounded-xl max-w-fit">
                <button
                  onClick={() => {
                    setActiveCategory("regular");
                    setSelectedBatchId("all");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    activeCategory === "regular"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span>Regular Batches</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeCategory === "regular" ? "bg-white/20 text-white" : "bg-border-light text-text-secondary"
                  }`}>
                    {batchMetrics.batches.filter((b) => b.category === "regular").length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("subject");
                    setSelectedBatchId("all");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    activeCategory === "subject"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span>Subject-Wise</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeCategory === "subject" ? "bg-white/20 text-white" : "bg-border-light text-text-secondary"
                  }`}>
                    {batchMetrics.batches.filter((b) => b.category === "subject").length}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setActiveCategory("one-to-one");
                    setSelectedBatchId("all");
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    activeCategory === "one-to-one"
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-secondary hover:text-primary hover:bg-surface-hover"
                  }`}
                >
                  <span>One-to-One</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeCategory === "one-to-one" ? "bg-white/20 text-white" : "bg-border-light text-text-secondary"
                  }`}>
                    {batchMetrics.batches.filter((b) => b.category === "one-to-one").length}
                  </span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Category All / Summary Card */}
                <div
                  onClick={() => setSelectedBatchId("all")}
                  className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                    selectedBatchId === "all"
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border-light bg-surface hover:border-text-tertiary"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm text-text-primary">
                      {activeCategory === "regular"
                        ? "All Students"
                        : activeCategory === "subject"
                        ? "All Subject Students"
                        : "All One-to-One Students"}
                    </span>
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-app-bg p-1.5 rounded-lg">
                      <span className="text-text-tertiary block font-medium">Total</span>
                      <span className="text-text-primary font-bold text-sm">
                        {activeCategory === "regular"
                          ? batchMetrics.all.total
                          : activeCategory === "subject"
                          ? categorySummary.subject.total
                          : categorySummary.oneToOne.total}
                      </span>
                    </div>
                    <div className="bg-success/5 p-1.5 rounded-lg border border-success/10">
                      <span className="text-success block font-medium">Assigned</span>
                      <span className="text-success font-bold text-sm">
                        {activeCategory === "regular"
                          ? batchMetrics.all.assigned
                          : activeCategory === "subject"
                          ? categorySummary.subject.assigned
                          : categorySummary.oneToOne.assigned}
                      </span>
                    </div>
                    <div className="bg-warning/5 p-1.5 rounded-lg border border-warning/10">
                      <span className="text-warning block font-medium">Pending</span>
                      <span className="text-warning font-bold text-sm">
                        {activeCategory === "regular"
                          ? batchMetrics.all.unassigned
                          : activeCategory === "subject"
                          ? categorySummary.subject.unassigned
                          : categorySummary.oneToOne.unassigned}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Batch Cards */}
                {batchMetrics.batches
                  .filter((b) => b.category === activeCategory)
                  .map((batch) => {
                    const isSelected = selectedBatchId === batch.id;
                    const pct = batch.total > 0 ? Math.round((batch.assigned / batch.total) * 100) : 0;
                    
                    return (
                      <div
                        key={batch.id}
                        onClick={() => setSelectedBatchId(batch.id)}
                        className={`cursor-pointer rounded-xl border p-4 transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                            : "border-border-light bg-surface hover:border-text-tertiary"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-sm text-text-primary block truncate" title={batch.name}>
                              {batch.name}
                            </span>
                            <span className="text-[10px] text-text-tertiary block truncate" title={batch.program}>
                              {batch.program}
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            pct === 100 ? "bg-success/10 text-success" : pct > 0 ? "bg-primary/10 text-primary" : "bg-text-tertiary/10 text-text-secondary"
                          }`}>
                            {pct}%
                          </span>
                        </div>

                        <div className="w-full h-1 bg-border-light rounded-full overflow-hidden mb-3">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="bg-app-bg p-1.5 rounded-lg">
                            <span className="text-text-tertiary block text-[10px] font-medium">Total</span>
                            <span className="text-text-primary font-bold text-sm">{batch.total}</span>
                          </div>
                          <div className="bg-success/5 p-1.5 rounded-lg border border-success/10">
                            <span className="text-success block text-[10px] font-medium">Assigned</span>
                            <span className="text-success font-bold text-sm">{batch.assigned}</span>
                          </div>
                          <div className="bg-warning/5 p-1.5 rounded-lg border border-warning/10">
                            <span className="text-warning block text-[10px] font-medium">Pending</span>
                            <span className="text-warning font-bold text-sm">{batch.unassigned}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="border-t border-border-light/60 my-4" />

            <Input placeholder="Search student name, id, parent, mobile..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light">
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Student</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Parent</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Current Mentor</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Assign/Reassign</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const assignment = assignmentMap.get(student.name);
                    return (
                      <tr key={student.name} className="border-b border-border-light">
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary">{student.student_name}</p>
                          <p className="text-xs text-text-tertiary mt-1">{student.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          <p>{student.custom_parent_name || "Not set"}</p>
                          <p className="text-xs text-text-tertiary mt-1">{student.student_mobile_number || "No mobile"}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-text-secondary">
                          {assignment ? mentors.find((row) => row.name === assignment.mentor_profile)?.mentor_name || assignment.mentor_profile : "Unassigned"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select className="h-9 rounded-[10px] border border-border-input bg-surface px-3 text-sm min-w-52" value={assignmentChoice[student.name] ?? assignment?.mentor_profile ?? ""} onChange={(e) => setAssignmentChoice((prev) => ({ ...prev, [student.name]: e.target.value }))}>
                              <option value="">Select mentor</option>
                              {activeMentors.map((row) => <option key={row.name} value={row.name}>{row.mentor_name}</option>)}
                            </select>
                            <Button size="sm" variant="outline" onClick={() => assignMutation.mutate({ studentId: student.name, assignmentId: assignment?.name })} disabled={assignMutation.isPending}>
                              {assignment ? "Reassign" : "Assign"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {assignMutation.isError ? <p className="text-sm text-error">{(assignMutation.error as Error)?.message}</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
