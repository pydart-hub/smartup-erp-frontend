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

export default function LevelUpResultView({ attempt }: LevelUpResultViewProps) {
  const getScholarshipTier = (pct: number) => {
    if (pct >= 90) return { tier: "100% GCC Merit Scholarship", color: "from-amber-400 to-yellow-500", badge: "Gold Scholar" };
    if (pct >= 75) return { tier: "50% GCC Merit Scholarship", color: "from-emerald-400 to-teal-500", badge: "Silver Scholar" };
    if (pct >= 50) return { tier: "25% GCC Merit Scholarship", color: "from-blue-400 to-cyan-500", badge: "Bronze Scholar" };
    return { tier: "GCC Certificate of Participation", color: "from-slate-400 to-slate-500", badge: "Participant" };
  };

  const tier = getScholarshipTier(attempt.percentage);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top action bar */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold">
            LU
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">LevelUp GCC Scholarship</h1>
            <p className="text-xs text-slate-400">Computerized Score Verification</p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print / Save Scorecard</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-[#121722] border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Student & Exam Header */}
        <div className="border-b border-slate-800 pb-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Official Verified GCC Assessment
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">{attempt.studentName}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-400" /> {attempt.classLevel} ({attempt.curriculum || "CBSE"})
                </span>
                {attempt.schoolName && (
                  <span className="flex items-center gap-1.5">
                    <School className="w-4 h-4 text-emerald-400" /> {attempt.schoolName}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Globe2 className="w-4 h-4 text-emerald-400" /> {attempt.emirateCity ? `${attempt.emirateCity}, ` : ""}{attempt.country || "GCC"}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className={`inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r ${tier.color} shadow-lg`}>
                {tier.badge}
              </span>
              <div className="text-xs text-slate-500 mt-1">ID: {attempt.id.slice(0, 8)}...</div>
            </div>
          </div>
        </div>

        {/* Score Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#181F2E] border border-slate-800/80 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-400 font-medium">Score Obtained</span>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-1">
              {attempt.scoreObtained} <span className="text-sm font-normal text-slate-500">/ {attempt.totalMarks}</span>
            </div>
          </div>

          <div className="bg-[#181F2E] border border-slate-800/80 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-400 font-medium">Percentage</span>
            <div className="text-2xl md:text-3xl font-black text-white mt-1">
              {attempt.percentage}%
            </div>
          </div>

          <div className="bg-[#181F2E] border border-slate-800/80 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-400 font-medium">Correct Answers</span>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 mt-1 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-5 h-5" /> {attempt.correctCount}
            </div>
          </div>

          <div className="bg-[#181F2E] border border-slate-800/80 rounded-2xl p-4 text-center">
            <span className="text-xs text-slate-400 font-medium">Wrong / Skipped</span>
            <div className="text-2xl md:text-3xl font-black text-rose-400 mt-1 flex items-center justify-center gap-1">
              <XCircle className="w-5 h-5" /> {attempt.wrongCount + attempt.unansweredCount}
            </div>
          </div>
        </div>

        {/* Scholarship Grant Box */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-[#121d26] to-[#0d141e] border border-emerald-500/30 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shrink-0 shadow-lg shadow-emerald-500/20">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-lg font-bold text-white">Eligible Merit Scholarship Status</h3>
            <p className="text-xl font-black text-emerald-300 mt-0.5">{tier.tier}</p>
            <p className="text-xs text-slate-400 mt-1">
              Based on LevelUp Online Examination standard percentile brackets for Middle East & GCC students.
            </p>
          </div>
        </div>

        {/* Detailed Question Review */}
        {attempt.questions && attempt.questions.length > 0 && (
          <div className="border-t border-slate-800 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-400" />
              Detailed Question Analysis
            </h3>

            <div className="space-y-4">
              {attempt.questions.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className={`p-4 rounded-2xl border transition-all ${
                    q.isCorrect
                      ? "bg-emerald-950/10 border-emerald-500/20"
                      : q.selectedOption
                      ? "bg-rose-950/10 border-rose-500/20"
                      : "bg-slate-900/40 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          Q{q.questionNumber || idx + 1}
                        </span>
                        {q.isCorrect ? (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Correct (+{q.marks || 1})
                          </span>
                        ) : q.selectedOption ? (
                          <span className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                            <X className="w-3.5 h-3.5" /> Incorrect
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">Unanswered</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-200">{q.questionText}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {q.options.map((opt) => {
                      const isCorrectOpt = opt.optionKey === q.correctOption;
                      const isSelected = opt.optionKey === q.selectedOption;

                      return (
                        <div
                          key={opt.optionKey}
                          className={`text-xs p-2.5 rounded-xl border flex items-center gap-2 ${
                            isCorrectOpt
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200 font-semibold"
                              : isSelected
                              ? "bg-rose-500/10 border-rose-500/40 text-rose-200"
                              : "bg-slate-900/60 border-slate-800 text-slate-400"
                          }`}
                        >
                          <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs bg-slate-800 shrink-0">
                            {opt.optionKey}
                          </span>
                          <span>{opt.optionText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
