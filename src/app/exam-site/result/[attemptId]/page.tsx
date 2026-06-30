import React from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/public-exam/db";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Brain,
  Home,
} from "lucide-react";
import { GradeResult } from "@/lib/public-exam/grading";
import { PrintButton } from "@/components/public-exam/PrintButton";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function ResultPage({ params }: PageProps) {
  const { attemptId } = await params;

  // Retrieve finished attempt details
  const attempt = await db.examAttempt.findUnique({
    where: { id: attemptId },
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

  // Redirect back to exam player if not yet submitted
  if (attempt.status === "in_progress") {
    return redirect(`/exam-site/attempt/${attemptId}`);
  }

  // Parse graded results snapshot
  const results: GradeResult = typeof attempt.resultSnapshotJson === "string"
    ? JSON.parse(attempt.resultSnapshotJson)
    : (attempt.resultSnapshotJson as unknown as GradeResult);

  if (!results) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        Results processing error. Please contact your coordinator.
      </div>
    );
  }

  const { aiSummary } = results;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-4xl mx-auto w-full px-6 py-10 sm:py-16">
        
        {/* Header Block */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-4 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Award className="w-8 h-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Assessment Completed</h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base">
            Diagnosis details for **{attempt.studentName}** • {attempt.publishing.title}
          </p>
        </div>

        {/* Dynamic Score Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          {/* Main Percentage Block */}
          <div className="md:col-span-1 bg-slate-800/80 border border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Score Obtained</div>
            <div className="text-6xl font-black text-white tracking-tighter">
              {results.percentage}%
            </div>
            <div className="text-xs font-semibold text-emerald-400 mt-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              {attempt.scoreObtained} / {attempt.totalMarks} Marks
            </div>
          </div>

          {/* Correct / Wrong / Unanswered Breakdown */}
          <div className="md:col-span-2 bg-slate-800/80 border border-slate-700/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-lg relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 to-indigo-500" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-slate-700/40 pb-3 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span>Response Statistics</span>
            </h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div className="text-xl sm:text-2xl font-black text-white mt-2">{attempt.correctCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Correct</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                <div className="text-xl sm:text-2xl font-black text-white mt-2">{attempt.wrongCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Incorrect</div>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col items-center">
                <AlertCircle className="w-6 h-6 text-slate-400 shrink-0" />
                <div className="text-xl sm:text-2xl font-black text-white mt-2">{attempt.unansweredCount}</div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Skipped</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insight Report Card */}
        <div className="bg-slate-800/80 border border-slate-700/50 rounded-3xl p-6 sm:p-8 shadow-lg mb-8 relative">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] text-slate-500 uppercase tracking-widest font-extrabold bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-full">
            <Brain className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>AI Powered Insights</span>
          </div>

          <h2 className="text-lg sm:text-xl font-extrabold text-white mb-2 leading-tight">
            {aiSummary.headline}
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            {aiSummary.overview}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-700/50 pt-6">
            
            {/* Strengths */}
            {aiSummary.strengths.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Key Strengths
                </h4>
                <ul className="space-y-2">
                  {aiSummary.strengths.map((str, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2.5 leading-normal">
                      <span className="text-emerald-500 font-bold mt-0.5">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Focus Areas */}
            {aiSummary.focus_areas.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Focus Areas
                </h4>
                <ul className="space-y-2">
                  {aiSummary.focus_areas.map((foc, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2.5 leading-normal">
                      <span className="text-amber-500 font-bold mt-0.5">•</span>
                      <span>{foc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Step / Recommendation */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Recommendation</div>
              <p className="text-sm text-slate-300 font-semibold leading-relaxed mt-1">
                {aiSummary.next_step}
              </p>
            </div>
          </div>
        </div>

        {/* Buttons / Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 no-print">
          <Link
            href="/exam-site"
            className="w-full sm:w-auto px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl text-center shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Take Another Exam</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <PrintButton />
          <Link
            href="/auth/login"
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-800 hover:bg-slate-700/60 border border-slate-700 text-slate-300 hover:text-white font-bold rounded-2xl text-center transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Go to Portal Login</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500">
        © 2026 SmartUp Learning Ventures. All Rights Reserved.
      </footer>
    </div>
  );
}
