"use client";

import React from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  BookOpen,
  Award,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  type AttemptWithPublishing,
  getAttemptLevelBreakdown,
  getOrdinalSuffix,
} from "@/lib/public-exam/diagnostics";

interface DiagnosisExamsClassReportProps {
  attempts: AttemptWithPublishing[];
  classLevel: string;
  branchName?: string;
  backUrl: string;
}

export function DiagnosisExamsClassReport({
  attempts,
  classLevel,
  branchName = "All Branches",
  backUrl,
}: DiagnosisExamsClassReportProps) {
  // 1. Filter attempts for this class
  const classAttempts = attempts.filter((a) => a.classLevel === classLevel);

  // 2. Count total unique students in this class
  const uniqueStudents = new Set(
    classAttempts.map((a) => `${a.studentName.trim().toLowerCase()}-${(a.studentPhone || "").trim()}`)
  );
  const totalStudentsCount = uniqueStudents.size;

  // 3. Group attempts by subject, then by student (latest attempt only)
  const subjectStudentLatestAttempt: Record<string, Record<string, AttemptWithPublishing>> = {};

  classAttempts.forEach((attempt) => {
    if (attempt.status !== "submitted" && attempt.status !== "auto_submitted") return;
    const subject = attempt.publishing.subject.name;
    const studentKey = `${attempt.studentName.trim().toLowerCase()}-${(attempt.studentPhone || "").trim()}`;

    if (!subjectStudentLatestAttempt[subject]) {
      subjectStudentLatestAttempt[subject] = {};
    }

    const existing = subjectStudentLatestAttempt[subject][studentKey];
    if (!existing || new Date(attempt.startedAt) > new Date(existing.startedAt)) {
      subjectStudentLatestAttempt[subject][studentKey] = attempt;
    }
  });

  // 4. Aggregate counts of diagnosed levels per subject
  const subjectsAggregation: Record<
    string,
    {
      totalAssessed: number;
      levelCounts: Record<string, number>;
    }
  > = {};

  // Standard levels we want to show (from 5th to 12th, or whatever levels exist)
  const levelOrder = ["5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

  Object.entries(subjectStudentLatestAttempt).forEach(([subject, studentMap]) => {
    const levelCounts: Record<string, number> = {};
    let totalAssessed = 0;

    Object.values(studentMap).forEach((attempt) => {
      const { diagnosedLevel } = getAttemptLevelBreakdown(attempt);
      if (diagnosedLevel) {
        levelCounts[diagnosedLevel] = (levelCounts[diagnosedLevel] || 0) + 1;
        totalAssessed++;
      }
    });

    subjectsAggregation[subject] = {
      totalAssessed,
      levelCounts,
    };
  });

  const sortedSubjects = Object.keys(subjectsAggregation).sort();

  return (
    <div className="space-y-6">
      {/* Back button and page header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href={backUrl}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5f2ea8] hover:text-[#4d238c] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-black tracking-tight text-text-primary md:text-3xl mt-2">
            Class {classLevel} Subject Level Distribution
          </h1>
          <p className="text-sm text-text-secondary">
            Aggregated level analysis for class {classLevel} in {branchName}.
          </p>
        </div>
      </div>

      {/* Overview stats card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border-light/60 bg-gradient-to-br from-violet-50/40 to-transparent dark:from-violet-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Class Level
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-[#5f2ea8]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-text-primary">Class {classLevel}</div>
            <p className="text-xs text-text-tertiary mt-1">Assessed diagnostic level</p>
          </CardContent>
        </Card>

        <Card className="border-border-light/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Total Students
            </CardTitle>
            <Users className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-text-primary">{totalStudentsCount}</div>
            <p className="text-xs text-text-tertiary mt-1">Unique enrolled student count</p>
          </CardContent>
        </Card>

        <Card className="border-border-light/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold text-text-secondary uppercase tracking-wider">
              Total Attempts
            </CardTitle>
            <Award className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-text-primary">{classAttempts.length}</div>
            <p className="text-xs text-text-tertiary mt-1">Total tests taken</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject-wise cards grid */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#5f2ea8]" />
          <span>Subject-Wise Diagnostic Level Distribution</span>
        </h2>

        {sortedSubjects.length === 0 ? (
          <Card className="border-border-light/60 p-8 text-center text-text-secondary">
            No completed attempts found to calculate distribution.
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sortedSubjects.map((subject) => {
              const { totalAssessed, levelCounts } = subjectsAggregation[subject];

              // Find unique levels present in this subject, sort them, and combine with standard ones
              const presentLevels = Object.keys(levelCounts);
              const allPossibleLevels = Array.from(new Set([...levelOrder, ...presentLevels]))
                .map((l) => ({
                  name: l,
                  num: parseInt(l, 10),
                }))
                .filter((l) => !isNaN(l.num))
                .sort((a, b) => a.num - b.num)
                .map((l) => l.name);

              return (
                <Card key={subject} className="border-border-light/60 overflow-hidden">
                  <CardHeader className="pb-3 border-b border-border-light/40 bg-surface-hover/30">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-bold text-text-primary">
                        {subject}
                      </CardTitle>
                      <Badge variant="outline" className="font-bold text-xs">
                        {totalAssessed} students assessed
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {allPossibleLevels.map((level) => {
                      const count = levelCounts[level] || 0;
                      const percentage =
                        totalAssessed > 0 ? Math.round((count / totalAssessed) * 100) : 0;

                      return (
                        <div key={level} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold text-text-secondary">
                            <span>{getOrdinalSuffix(level)} Level</span>
                            <span>
                              {count} {count === 1 ? "student" : "students"} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-3 w-full bg-surface-hover dark:bg-black/20 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-violet-500 to-[#5f2ea8] rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
