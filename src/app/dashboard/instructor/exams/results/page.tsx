"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  BarChart3,
  Trophy,
  Search,
  FileText,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInstructorBatches } from "@/lib/hooks/useInstructorBatches";
import { getAssessmentGroups, getBatchResults, getReportCard } from "@/lib/api/assessment";
import type { AssessmentGroup } from "@/lib/types/assessment";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function InstructorExamResultsPage() {
  const { defaultCompany } = useAuth();
  const { activeBatches, isLoading: batchesLoading } = useInstructorBatches();
  const [studentGroup, setStudentGroup] = useState("");
  const [assessmentGroup, setAssessmentGroup] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const { data: groups = [] } = useQuery<AssessmentGroup[]>({
    queryKey: ["assessment-groups"],
    queryFn: getAssessmentGroups,
    staleTime: 120_000,
  });

  const { data: batchResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["batch-results", studentGroup, assessmentGroup],
    queryFn: () => getBatchResults({ student_group: studentGroup, assessment_group: assessmentGroup }),
    enabled: !!studentGroup && !!assessmentGroup,
    staleTime: 30_000,
  });

  const { data: reportCard, isLoading: reportLoading } = useQuery({
    queryKey: ["report-card", selectedStudent, assessmentGroup, studentGroup],
    queryFn: () => getReportCard({ student: selectedStudent!, assessment_group: assessmentGroup, student_group: studentGroup }),
    enabled: !!selectedStudent && !!assessmentGroup && !!studentGroup,
    staleTime: 30_000,
  });

  const results = batchResults?.data ?? [];
  const summary = batchResults?.summary;

  const filtered = useMemo(() => {
    if (!search.trim()) return results;
    const q = search.toLowerCase();
    return results.filter((r) => r.student_name?.toLowerCase().includes(q) || r.student?.toLowerCase().includes(q));
  }, [results, search]);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <BreadcrumbNav />

      <motion.div variants={item}>
        <Link
          href="/dashboard/instructor/exams"
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-2 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to exams
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">Exam Results</h1>
        <p className="text-sm text-text-secondary mt-0.5">View results for your batches</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-text-secondary">Batch</label>
                {batchesLoading ? (
                  <div className="h-10 rounded-[10px] border border-border-input bg-surface flex items-center px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />
                  </div>
                ) : (
                  <select
                    value={studentGroup}
                    onChange={(e) => { setStudentGroup(e.target.value); setSelectedStudent(null); }}
                    className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                  >
                    <option value="">Select batch...</option>
                    {activeBatches.map((b) => (
                      <option key={b.name} value={b.name}>
                        {b.student_group_name} ({b.program})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-xs font-medium text-text-secondary">Exam Type</label>
                <select
                  value={assessmentGroup}
                  onChange={(e) => { setAssessmentGroup(e.target.value); setSelectedStudent(null); }}
                  className="h-10 rounded-[10px] border border-border-input bg-surface px-3 text-sm"
                >
                  <option value="">Select exam type...</option>
                  {groups.map((g) => (
                    <option key={g.name} value={g.name}>{g.assessment_group_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {resultsLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      )}

      {(!studentGroup || !assessmentGroup) && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto text-text-tertiary mb-3" />
              <h3 className="text-lg font-semibold text-text-primary mb-1">Select Batch & Exam Type</h3>
              <p className="text-sm text-text-secondary">Choose a batch and exam type to view results.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary */}
      {summary && !resultsLoading && (
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
            <p className="text-xl font-bold text-text-primary">{summary.total_students}</p>
            <p className="text-xs text-text-secondary mt-0.5">Students</p>
          </div>
          <div className="bg-success-light rounded-[12px] p-3 text-center border border-success/10">
            <p className="text-xl font-bold text-success">{summary.pass_count}</p>
            <p className="text-xs text-success mt-0.5">Passed</p>
          </div>
          <div className="bg-error-light rounded-[12px] p-3 text-center border border-error/10">
            <p className="text-xl font-bold text-error">{summary.total_students - summary.pass_count}</p>
            <p className="text-xs text-error mt-0.5">Failed</p>
          </div>
          <div className="bg-brand-wash rounded-[12px] p-3 text-center border border-primary/10">
            <p className="text-xl font-bold text-primary">{summary.pass_rate}%</p>
            <p className="text-xs text-primary mt-0.5">Pass Rate</p>
          </div>
          <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
            <p className="text-xl font-bold text-text-primary">{summary.average_percentage}%</p>
            <p className="text-xs text-text-secondary mt-0.5">Average</p>
          </div>
          <div className="bg-surface rounded-[12px] p-3 text-center border border-border-light">
            <p className="text-xl font-bold text-text-primary">{summary.highest_percentage}%</p>
            <p className="text-xs text-text-secondary mt-0.5">Highest</p>
          </div>
        </motion.div>
      )}

      {/* Rankings */}
      {results.length > 0 && !resultsLoading && !selectedStudent && (
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-text-tertiary" />
                  Rankings
                </CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9 pr-3 rounded-[8px] border border-border-input bg-surface text-sm w-48"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light">
                      <th className="text-left px-3 py-3 font-medium text-text-secondary w-16">Rank</th>
                      <th className="text-left px-3 py-3 font-medium text-text-secondary">Student</th>
                      {results[0]?.subjects?.map((s) => (
                        <th key={s.course} className="text-center px-3 py-3 font-medium text-text-secondary">{s.course}</th>
                      ))}
                      <th className="text-center px-3 py-3 font-medium text-text-secondary">Total</th>
                      <th className="text-center px-3 py-3 font-medium text-text-secondary">%</th>
                      <th className="text-center px-3 py-3 font-medium text-text-secondary">Grade</th>
                      <th className="text-center px-3 py-3 font-medium text-text-secondary w-20">Status</th>
                      <th className="text-center px-3 py-3 font-medium text-text-secondary w-24">Report</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.student} className="border-b border-border-light last:border-0 hover:bg-app-bg/50">
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            r.rank === 1 ? "bg-yellow-100 text-yellow-700" : r.rank === 2 ? "bg-gray-100 text-gray-600" : r.rank === 3 ? "bg-orange-100 text-orange-600" : "bg-surface text-text-secondary"
                          }`}>{r.rank}</span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-text-primary">{r.student_name}</p>
                          <p className="text-xs text-text-tertiary">{r.student}</p>
                        </td>
                        {r.subjects?.map((s) => (
                          <td key={s.course} className={`text-center px-3 py-3 ${!s.passed ? "text-error" : ""}`}>
                            {s.score}/{s.maximum_score}
                          </td>
                        ))}
                        <td className="text-center px-3 py-3 font-semibold">{r.total_score}/{r.total_maximum}</td>
                        <td className="text-center px-3 py-3 font-semibold text-primary">{r.overall_percentage}%</td>
                        <td className="text-center px-3 py-3"><Badge variant="outline">{r.overall_grade}</Badge></td>
                        <td className="text-center px-3 py-3">
                          {r.passed ? <Badge variant="success">Pass</Badge> : <Badge variant="error">Fail</Badge>}
                        </td>
                        <td className="text-center px-3 py-3">
                          <button onClick={() => setSelectedStudent(r.student)} className="text-xs text-primary hover:underline">View Card</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty */}
      {!resultsLoading && studentGroup && assessmentGroup && results.length === 0 && (
        <motion.div variants={item}>
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-text-tertiary mb-3" />
              <h3 className="text-lg font-semibold text-text-primary mb-1">No Results Yet</h3>
              <p className="text-sm text-text-secondary">No marks have been entered for this batch and exam type.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Report Card */}
      {selectedStudent && (
        <motion.div variants={item} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Report Card
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Print
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>Close</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {reportLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin h-6 w-6 text-primary" />
                </div>
              ) : reportCard?.data ? (
                <div className="space-y-4" id="report-card">
                  <div className="bg-brand-wash rounded-[12px] p-4 border border-primary/10">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-text-secondary text-xs">Student</p>
                        <p className="font-semibold text-text-primary">{reportCard.data.student_name}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-xs">Program</p>
                        <p className="font-medium text-text-primary">{reportCard.data.program}</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-xs">Overall</p>
                        <p className="font-medium text-text-primary">{reportCard.data.overall_percentage}% ({reportCard.data.overall_grade})</p>
                      </div>
                      <div>
                        <p className="text-text-secondary text-xs">Rank</p>
                        <p className="font-bold text-primary text-lg">#{reportCard.data.rank}</p>
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-sm border border-border-light rounded-[10px] overflow-hidden">
                    <thead>
                      <tr className="bg-app-bg border-b border-border-light">
                        <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Subject</th>
                        <th className="text-center px-4 py-2.5 font-medium text-text-secondary">Score</th>
                        <th className="text-center px-4 py-2.5 font-medium text-text-secondary">Max</th>
                        <th className="text-center px-4 py-2.5 font-medium text-text-secondary">%</th>
                        <th className="text-center px-4 py-2.5 font-medium text-text-secondary">Grade</th>
                        <th className="text-center px-4 py-2.5 font-medium text-text-secondary">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportCard.data.subjects?.map((s: { course: string; score: number; maximum_score: number; percentage: number; grade: string; passed: boolean }) => (
                        <tr key={s.course} className="border-b border-border-light last:border-0">
                          <td className="px-4 py-2.5 font-medium text-text-primary">{s.course}</td>
                          <td className="text-center px-4 py-2.5">{s.score}</td>
                          <td className="text-center px-4 py-2.5 text-text-secondary">{s.maximum_score}</td>
                          <td className="text-center px-4 py-2.5 font-medium">{s.percentage}%</td>
                          <td className="text-center px-4 py-2.5"><Badge variant="outline">{s.grade}</Badge></td>
                          <td className="text-center px-4 py-2.5">
                            {s.passed ? <CheckCircle2 className="h-4 w-4 text-success mx-auto" /> : <XCircle className="h-4 w-4 text-error mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-app-bg border-t border-border-light font-semibold">
                        <td className="px-4 py-2.5">Total</td>
                        <td className="text-center px-4 py-2.5">{reportCard.data.total_score}</td>
                        <td className="text-center px-4 py-2.5 text-text-secondary">{reportCard.data.total_maximum}</td>
                        <td className="text-center px-4 py-2.5 text-primary">{reportCard.data.overall_percentage}%</td>
                        <td className="text-center px-4 py-2.5"><Badge variant="outline">{reportCard.data.overall_grade}</Badge></td>
                        <td className="text-center px-4 py-2.5">
                          {reportCard.data.passed ? <Badge variant="success">PASS</Badge> : <Badge variant="error">FAIL</Badge>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-text-secondary text-center py-8">No report card data.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
