"use client";

import React from "react";
import Image from "next/image";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  MinusCircle,
  User,
  GraduationCap,
  Globe2,
  School,
  FileCheck2,
  Printer,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";

export type LevelUpQuestionReviewItem = {
  id: string;
  questionNumber: number;
  questionText: string;
  options: Array<{
    optionKey: string;
    optionText: string;
  }>;
  correctOption: string;
  selectedOption: string | null;
  isCorrect: boolean;
  marks: number;
};

type LevelUpResultViewProps = {
  attempt: {
    id: string;
    studentName: string;
    schoolName?: string | null;
    studentPhone: string | null;
    classLevel: string;
    country: string | null;
    emirateCity: string | null;
    curriculum: string | null;
    scoreObtained: number;
    totalMarks: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    createdAt: string;
    questions?: LevelUpQuestionReviewItem[];
  };
};

function cleanExamText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\s*---\s*PAGE\s*\d+\s*---\s*/gi, "")
    .replace(/^All questions are compulsory.*?\b\d+\.\s*/i, "")
    .replace(/(?:\s+\d+\.)+\s*$/, "")
    .replace(/^\s*(?:\d+\.\s*){2,}/, "")
    .replace(/■/g, "₹")
    .trim();
}

export default function LevelUpResultView({ attempt }: LevelUpResultViewProps) {
  const score = attempt.scoreObtained;
  const total = attempt.totalMarks || 40;
  const percentage = attempt.percentage || Math.round((score / total) * 100);
  const questions = attempt.questions || [];

  const getScholarshipTier = (pct: number) => {
    if (pct >= 90) return { tier: "100% GCC Merit Scholarship", color: "from-amber-400 to-yellow-500", badge: "Gold Scholar" };
    if (pct >= 75) return { tier: "50% GCC Merit Scholarship", color: "from-emerald-400 to-teal-500", badge: "Silver Scholar" };
    if (pct >= 50) return { tier: "25% GCC Merit Scholarship", color: "from-blue-400 to-cyan-500", badge: "Bronze Scholar" };
    return { tier: "GCC Certificate of Participation", color: "from-slate-400 to-slate-500", badge: "Participant" };
  };

  const tier = getScholarshipTier(percentage);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between font-sans selection:bg-[#5C34A4] selection:text-white">
      {/* Top Header - Screen Only */}
      <header className="w-full bg-white border-b border-slate-200/80 py-4 px-6 sm:px-12 no-print sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp LevelUp GCC"
                width={40}
                height={40}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-black tracking-tight text-slate-900 leading-none">
                SMART UP
              </span>
              <span className="text-[10px] font-bold text-[#5C34A4] tracking-widest uppercase mt-0.5">
                LevelUp GCC Exam
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-[#5C34A4] hover:bg-[#4D2B8A] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-900/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Scorecard</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scorecard Sheet */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 w-full flex-1">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-sm print:shadow-none print:border-none print:p-0 space-y-8 relative overflow-hidden">
          {/* Subtle Ambient Brand Watermark */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none select-none -z-0">
            <Image src="/smartup-logo-v2.png" alt="watermark" width={480} height={480} />
          </div>

          {/* Institutional Header Banner for Print & Verification */}
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-6 print:pb-3">
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <Image
                  src="/smartup-logo-v2.png"
                  alt="SmartUp"
                  width={48}
                  height={48}
                  priority
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black text-slate-900 tracking-tight leading-none">
                  SMART UP
                </span>
                <span className="text-[10px] font-bold text-[#5C34A4] tracking-widest uppercase mt-0.5">
                  LevelUp GCC Scholarship Exam 2026-27
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-800">Official Candidate Scorecard &amp; Assessment</div>
              <div className="text-[10px] text-slate-500">
                Date: {new Date(attempt.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Top Hero Banner */}
          <div className="relative z-10 text-center space-y-3 print:space-y-0.5">
            <div className="w-20 h-20 rounded-full bg-[#EFEBFA] text-[#5C34A4] flex items-center justify-center mx-auto shadow-inner print:hidden">
              <Trophy className="w-10 h-10 stroke-[2.2]" />
            </div>

            <div className="space-y-1 print:space-y-0">
              <span className="text-xs print:text-[9.5px] font-bold uppercase tracking-[0.2em] text-[#7C5CB7]">
                Official Scorecard &amp; Assessment Report
              </span>
              <h1 className="text-2xl sm:text-3xl print:text-lg font-black text-slate-900 tracking-tight">
                Scholarship Assessment Completed!
              </h1>
              <p className="text-xs sm:text-sm print:text-[10px] text-slate-500">
                Congratulations, <strong className="text-[#5C34A4]">{attempt.studentName}</strong>! Your results have been officially recorded in LevelUp database.
              </p>
            </div>
          </div>

          {/* Student & Assessment Details Bar */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-5 gap-3 print:gap-1.5 bg-slate-50/90 backdrop-blur-sm p-4 print:p-2 rounded-2xl print:rounded-xl border border-slate-100 text-xs print:text-[9.5px]">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5 print:w-3 print:h-3" /> Student Name
              </span>
              <p className="font-bold text-slate-900 truncate">{attempt.studentName}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <School className="w-3.5 h-3.5 print:w-3 print:h-3" /> School
              </span>
              <p className="font-bold text-slate-900 truncate" title={attempt.schoolName || "Not specified"}>
                {attempt.schoolName || "Not specified"}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 print:w-3 print:h-3" /> Class &amp; Board
              </span>
              <p className="font-bold text-slate-900">Class {attempt.classLevel} ({attempt.curriculum || "CBSE"})</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Globe2 className="w-3.5 h-3.5 print:w-3 print:h-3" /> Country &amp; City
              </span>
              <p className="font-bold text-slate-900 truncate">
                {attempt.emirateCity ? `${attempt.emirateCity}, ` : ""}{attempt.country || "GCC"}
              </p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5 print:w-3 print:h-3" /> Total Questions
              </span>
              <p className="font-bold text-slate-900">{total} MCQs</p>
            </div>
          </div>

          {/* Core Score Statistics */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 print:gap-2">
            {/* Score Card */}
            <div className="p-4 sm:p-5 print:p-2.5 rounded-2xl bg-gradient-to-br from-[#5C34A4] to-[#7B42D6] text-white space-y-1 shadow-md shadow-purple-950/15">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
                Score Obtained
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl print:text-2xl font-black">{score}</span>
                <span className="text-xs font-semibold text-purple-200">/ {total} Marks</span>
              </div>
              <p className="text-[11px] print:text-[9.5px] text-purple-100 font-medium">Percentage: {percentage}%</p>
            </div>

            {/* Answer Breakdown */}
            <div className="p-4 sm:p-5 print:p-2.5 rounded-2xl bg-slate-50/90 backdrop-blur-sm border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Accuracy Summary
              </span>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    {attempt.correctCount}
                  </div>
                  <div className="text-[11px]">
                    <span className="block font-bold text-slate-800">Correct</span>
                    <span className="text-slate-400">Answers</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm">
                    {attempt.wrongCount}
                  </div>
                  <div className="text-[11px]">
                    <span className="block font-bold text-slate-800">Incorrect</span>
                    <span className="text-slate-400">Answers</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scholarship Status */}
            <div className="p-4 sm:p-5 print:p-2.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/60 border border-amber-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                Eligible Scholarship Status
              </span>
              <div className="mt-1">
                <div className="text-lg sm:text-xl print:text-sm font-black text-amber-900 leading-tight">
                  {tier.tier}
                </div>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                  {tier.badge}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Question Review & Analysis */}
          {questions.length > 0 && (
            <div className="relative z-10 space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-[#5C34A4]" />
                  <span>Question-wise Performance Review</span>
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {questions.length} Questions Evaluated
                </span>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    className={`p-4 rounded-2xl border transition-all ${
                      q.isCorrect
                        ? "bg-emerald-50/40 border-emerald-200/80"
                        : q.selectedOption
                        ? "bg-rose-50/40 border-rose-200/80"
                        : "bg-slate-50 border-slate-200/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold text-xs flex items-center justify-center text-slate-700 shadow-sm">
                          {q.questionNumber || idx + 1}
                        </span>
                        {q.isCorrect ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> Correct (+{q.marks || 1})
                          </span>
                        ) : q.selectedOption ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                            <X className="w-3 h-3 stroke-[3]" /> Incorrect
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                            Unanswered (0)
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm font-semibold text-slate-800 mb-3 whitespace-pre-line">
                      {cleanExamText(q.questionText)}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt) => {
                        const isCorrectOpt = opt.optionKey === q.correctOption;
                        const isSelectedOpt = opt.optionKey === q.selectedOption;

                        let optClass = "bg-white/80 border-slate-200 text-slate-600";
                        if (isCorrectOpt) {
                          optClass = "bg-emerald-100/80 border-emerald-400 font-bold text-emerald-900";
                        } else if (isSelectedOpt && !isCorrectOpt) {
                          optClass = "bg-rose-100/80 border-rose-400 font-bold text-rose-900 line-through opacity-85";
                        }

                        return (
                          <div
                            key={opt.optionKey}
                            className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${optClass}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                isCorrectOpt
                                  ? "bg-emerald-600 text-white"
                                  : isSelectedOpt
                                  ? "bg-rose-600 text-white"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {opt.optionKey}
                            </span>
                            <span className="flex-1">{cleanExamText(opt.optionText)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Institutional Stamp & Footer */}
          <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-600">SmartUp Learning Ventures • Middle East Academic Council</p>
            <p className="text-[11px]">LevelUp GCC Online Computerized Testing • Database: smartup_online</p>
          </div>
        </div>
      </main>
    </div>
  );
}
