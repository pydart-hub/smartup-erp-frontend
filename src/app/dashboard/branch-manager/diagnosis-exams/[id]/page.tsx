import React from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/public-exam/db";
import { GradeResult, calculateDiagnosedLevel } from "@/lib/public-exam/grading";
import { DatabaseErrorCard } from "@/components/diagnosis-exams/DatabaseErrorCard";
import { getBranchManagerDefaultCompany } from "@/lib/server/branchManagerSession";
import {
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Brain,
  Phone,
  Building2,
} from "lucide-react";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function BranchManagerStudentResultDetailPage({ params }: PageProps) {
  const { id } = await params;

  try {
    const branchName = await getBranchManagerDefaultCompany();
    const cleanBranch = (name: string) => name.replace(/[\s\-_]/g, "").toLowerCase();
    const cleanedBranchName = cleanBranch(branchName);

    const attempt = await db.examAttempt.findUnique({
      where: { id },
      include: {
        publishing: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!attempt) {
      return notFound();
    }

    // Verify branch manager owns this student attempt
    if (cleanBranch(attempt.studentBranch || "") !== cleanedBranchName) {
      return notFound();
    }

    const results: GradeResult = typeof attempt.resultSnapshotJson === "string"
      ? JSON.parse(attempt.resultSnapshotJson)
      : (attempt.resultSnapshotJson as unknown as GradeResult);

    if (!results) {
      return (
        <div className="p-6 text-center text-slate-400">
          Attempt records are incomplete. No grading data stored.
        </div>
      );
    }

    const { aiSummary } = results;

    const diagnosedLevel = results.diagnosedLevel || calculateDiagnosedLevel(attempt.classLevel, attempt.paperSnapshotJson, attempt.resultSnapshotJson);

    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 text-slate-800">
        {/* Back navigation */}
        <Link
          href="/dashboard/branch-manager/diagnosis-exams"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5f2ea8] hover:text-[#4d238c] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to diagnosis dashboard</span>
        </Link>

        {/* Candidate Profile Details */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="text-2xl font-black text-slate-900 leading-tight">
              {attempt.studentName}
            </div>
            <p className="text-sm font-semibold text-slate-500">{attempt.publishing.title}</p>
            
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                <span>Class Level: {attempt.classLevel}</span>
              </span>
              {diagnosedLevel && (
                <span className="flex items-center gap-1 bg-[#5f2ea8]/10 text-[#5f2ea8] px-2 py-0.5 rounded-md font-extrabold border border-[#5f2ea8]/10">
                  <Brain className="w-3.5 h-3.5 text-[#5f2ea8]" />
                  <span>Diagnosed Student Level: {diagnosedLevel}</span>
                </span>
              )}
              {attempt.studentBranch && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Branch: {attempt.studentBranch}</span>
                </span>
              )}
              {attempt.studentPhone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>Phone: {attempt.studentPhone}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  Date: {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "N/A"}
                </span>
              </span>
            </div>
          </div>

          {/* Big Score indicator */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-center shrink-0">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score Obtained</div>
            <div className="text-3xl font-black text-slate-900 mt-1">{attempt.scoreObtained} / {attempt.totalMarks}</div>
            <div className="text-xs text-emerald-600 font-bold mt-1 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full inline-block">
              Percentage: {attempt.percentage}%
            </div>
          </div>
        </div>

        {/* AI Summary report */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 relative">
          <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-3 py-1 rounded-full w-fit">
            <Brain className="w-3.5 h-3.5 text-emerald-500" />
            <span>Automated Assessment Summary</span>
          </div>

          <h3 className="text-lg font-bold text-slate-900">{aiSummary.headline}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{aiSummary.overview}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-100">
            {aiSummary.strengths.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Strengths</span>
                </div>
                <ul className="space-y-1.5">
                  {aiSummary.strengths.map((str, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-emerald-500 font-bold mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {aiSummary.focus_areas.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Focus Areas</span>
                </div>
                <ul className="space-y-1.5">
                  {aiSummary.focus_areas.map((foc, idx) => (
                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                      <span className="text-amber-500 font-bold mt-0.5">•</span>
                      <span>{foc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mt-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended Actions</div>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed mt-1">{aiSummary.next_step}</p>
          </div>
        </div>

        {/* Answer Key Grid / Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Question Breakdown</h3>
          
          <div className="space-y-4">
            {results.questions.map((q, idx) => {
              const isCorrect = q.isCorrect;
              return (
                <div key={q.questionId} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Question {idx + 1}
                    </span>
                    
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isCorrect
                        ? "bg-emerald-50 border border-emerald-100 text-emerald-600"
                        : q.selectedOption
                        ? "bg-rose-50 border border-rose-100 text-rose-600"
                        : "bg-slate-100 border border-slate-200 text-slate-500"
                    }`}>
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Correct</span>
                        </>
                      ) : q.selectedOption ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Incorrect</span>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>Skipped</span>
                        </>
                      )}
                    </span>
                  </div>

                  {/* Question Text */}
                  <div className="text-sm font-semibold text-slate-900 leading-relaxed">
                    {q.questionText}
                  </div>

                  {/* Options List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt) => {
                      const isSelected = q.selectedOption === opt.optionKey;
                      const isCorrectOption = q.correctOption === opt.optionKey;

                      let borderClass = "border-slate-200 bg-slate-50 text-slate-600";
                      let label = "";

                      if (isCorrectOption) {
                        borderClass = "border-emerald-200 bg-emerald-50 text-emerald-800 font-bold";
                        label = " (Correct Answer)";
                      }
                      if (isSelected) {
                        if (isCorrect) {
                          borderClass = "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold";
                        } else {
                          borderClass = "border-rose-300 bg-rose-50 text-rose-800 font-bold";
                          label = " (Student Choice)";
                        }
                      }

                      return (
                        <div key={opt.id} className={`p-3 rounded-xl border flex items-center justify-between ${borderClass}`}>
                          <div>
                            <span className="font-mono font-bold mr-2">{opt.optionKey}.</span>
                            <span>{opt.optionText}</span>
                          </div>
                          <span className="text-[10px] uppercase font-black tracking-wider opacity-60">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Database connection error in detailed view (Branch Manager):", error);
    return <DatabaseErrorCard error={error} backUrl="/dashboard/branch-manager/diagnosis-exams" />;
  }
}
