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
  MapPin,
  FileCheck2,
  Printer,
  Download,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";

export type QuestionReviewItem = {
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

type ScholarResultViewProps = {
  attempt: {
    id: string;
    studentName: string;
    studentPhone: string | null;
    classLevel: string;
    studentBranch: string | null;
    scoreObtained: number;
    totalMarks: number;
    percentage: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    createdAt: string;
    questions?: QuestionReviewItem[];
  };
};

export default function ScholarResultView({ attempt }: ScholarResultViewProps) {
  const score = attempt.scoreObtained;
  const total = attempt.totalMarks || 40;
  const percentage = attempt.percentage || Math.round((score / total) * 100);
  const questions = attempt.questions || [];

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
                alt="SmartUp"
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
                Scholarship Exam
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-[#5C34A4] hover:bg-[#4D2B8A] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-900/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download / Print Report</span>
            </button>
            <div className="bg-[#EFEBFA] text-[#5C34A4] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              Batch 2026-27
            </div>
          </div>
        </div>
      </header>

      {/* Main Scorecard Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex-1">
        <div
          id="scholarship-report"
          className="relative overflow-hidden bg-white rounded-[32px] p-6 sm:p-10 border border-slate-100 shadow-xl shadow-purple-950/5 space-y-8 print:border-none print:shadow-none print:p-2"
        >
          {/* Centered SmartUp Logo Background Watermark with Low Opacity */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden z-0 select-none">
            <div className="relative w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] opacity-[0.035] print:opacity-[0.05]">
              <Image
                src="/smartup-logo-v2.png"
                alt=""
                fill
                priority
                className="object-contain grayscale"
              />
            </div>
          </div>

          {/* Print-Only Official Header with SmartUp Logo */}
          <div className="relative z-10 hidden print:flex items-center justify-between border-b-2 border-[#5C34A4] pb-4 mb-6">
            <div className="flex items-center gap-3.5">
              <div className="relative w-14 h-14 shrink-0">
                <Image
                  src="/smartup-logo-v2.png"
                  alt="SmartUp"
                  width={56}
                  height={56}
                  priority
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                  SMART UP
                </span>
                <span className="text-xs font-bold text-[#5C34A4] tracking-widest uppercase mt-1">
                  Online Scholarship Examination 2026-27
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-bold text-slate-800">Official Assessment &amp; Answer Report</div>
              <div className="text-xs text-slate-500">
                {new Date(attempt.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Top Hero Banner */}
          <div className="relative z-10 text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-[#EFEBFA] text-[#5C34A4] flex items-center justify-center mx-auto shadow-inner print:w-16 print:h-16">
              <Trophy className="w-10 h-10 stroke-[2.2] print:w-8 print:h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#7C5CB7]">
                Official Scorecard &amp; Assessment Report
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Scholarship Assessment Completed!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Congratulations, <strong className="text-[#5C34A4]">{attempt.studentName}</strong>! Your results have been officially recorded.
              </p>
            </div>
          </div>

          {/* Student & Assessment Details Bar */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/90 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Student Name
              </span>
              <p className="font-bold text-slate-900 truncate">{attempt.studentName}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Class Level
              </span>
              <p className="font-bold text-slate-900">Class {attempt.classLevel}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> District
              </span>
              <p className="font-bold text-slate-900 truncate">{attempt.studentBranch || "Kerala"}</p>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5" /> Total Questions
              </span>
              <p className="font-bold text-slate-900">40 MCQs</p>
            </div>
          </div>

          {/* Core Score Statistics */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Score Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#5C34A4] to-[#7B42D6] text-white space-y-2 shadow-lg shadow-purple-950/15">
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-200">
                Score Obtained
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-black">{score}</span>
                <span className="text-sm font-semibold text-purple-200">/ {total} Marks</span>
              </div>
              <p className="text-xs text-purple-100 font-medium">Overall Percentage: {percentage}%</p>
            </div>

            {/* Answer Breakdown */}
            <div className="p-6 rounded-3xl bg-slate-50/90 backdrop-blur-sm border border-slate-100 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Accuracy Summary
              </span>
              <div className="grid grid-cols-3 gap-2 text-center my-2">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                  <span className="block text-lg font-black text-emerald-700">{attempt.correctCount}</span>
                  <span className="text-[10px] font-bold text-emerald-600">Correct</span>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-2">
                  <span className="block text-lg font-black text-rose-700">{attempt.wrongCount}</span>
                  <span className="text-[10px] font-bold text-rose-600">Wrong</span>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-2">
                  <span className="block text-lg font-black text-slate-700">{attempt.unansweredCount}</span>
                  <span className="text-[10px] font-bold text-slate-500">Skipped</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 text-center">Standard computerized evaluation</p>
            </div>

            {/* Academic Performance Rating */}
            <div className="p-6 rounded-3xl border border-purple-200 bg-purple-50/50 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white text-[#5C34A4] border border-purple-200 inline-block mb-2">
                  Academic Performance
                </span>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {percentage >= 80
                    ? "Excellent Performance"
                    : percentage >= 60
                    ? "Very Good Performance"
                    : percentage >= 40
                    ? "Good Effort"
                    : "Participated"}
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-2 font-medium">
                Verified computerized assessment for SmartUp Scholarship Exam Batch 2026-27.
              </p>
            </div>
          </div>

          {/* Detailed Question-by-Question Review with Student Answer & Correct Answer */}
          {questions.length > 0 && (
            <div className="relative z-10 pt-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#5C34A4]" />
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Question-wise Performance &amp; Answer Key
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {questions.length} Questions Evaluated
                </span>
              </div>

              <div className="space-y-3">
                {questions.map((q) => {
                  const studentSelectedOption = q.options.find(
                    (opt) => opt.optionKey === q.selectedOption
                  );
                  const correctOptionObj = q.options.find(
                    (opt) => opt.optionKey === q.correctOption
                  );

                  return (
                    <div
                      key={q.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all print:break-inside-avoid ${
                        q.selectedOption === null
                          ? "bg-slate-50/80 border-slate-200"
                          : q.isCorrect
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-rose-50/30 border-rose-200"
                      }`}
                    >
                      {/* Question Header */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-200/70 text-slate-800 text-xs font-black shrink-0">
                            {q.questionNumber}
                          </span>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            MCQ
                          </span>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {q.selectedOption === null ? (
                            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                              <span>Skipped</span>
                            </span>
                          ) : q.isCorrect ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Correct (+{q.marks})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Incorrect (0)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm font-bold text-slate-800 leading-relaxed mb-3">
                        {q.questionText}
                      </p>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {q.options.map((opt) => {
                          const isThisCorrect = opt.optionKey === q.correctOption;
                          const isThisSelected = opt.optionKey === q.selectedOption;

                          let optionStyle = "bg-white/80 border-slate-200 text-slate-700";
                          let indicator = null;

                          if (isThisCorrect) {
                            optionStyle = "bg-emerald-100/70 border-emerald-300 text-emerald-900 font-semibold";
                            indicator = (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-200/80 px-1.5 py-0.5 rounded">
                                <Check className="w-3 h-3" /> Correct
                              </span>
                            );
                          } else if (isThisSelected && !q.isCorrect) {
                            optionStyle = "bg-rose-100/70 border-rose-300 text-rose-900 font-semibold";
                            indicator = (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded">
                                <X className="w-3 h-3" /> Your Choice
                              </span>
                            );
                          }

                          return (
                            <div
                              key={opt.optionKey}
                              className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${optionStyle}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-black shrink-0 w-5 h-5 rounded-md bg-black/5 flex items-center justify-center text-[11px]">
                                  {opt.optionKey}
                                </span>
                                <span className="leading-snug">{opt.optionText}</span>
                              </div>
                              {indicator}
                            </div>
                          );
                        })}
                      </div>

                      {/* Answer Comparison Summary Line */}
                      <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-medium">Your Answer:</span>
                          {q.selectedOption ? (
                            <span
                              className={`font-bold ${
                                q.isCorrect ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              Option {q.selectedOption}
                              {studentSelectedOption?.optionText &&
                                ` (${studentSelectedOption.optionText})`}
                            </span>
                          ) : (
                            <span className="font-semibold text-slate-500 italic">Not Answered</span>
                          )}
                        </div>

                        {!q.isCorrect && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium">Correct Answer:</span>
                            <span className="font-bold text-emerald-700">
                              Option {q.correctOption}
                              {correctOptionObj?.optionText &&
                                ` (${correctOptionObj.optionText})`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action Bar (Screen Only) - "Back to Portal" removed! */}
          <div className="relative z-10 no-print p-6 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-[#5C34A4]">
                Download Your Official Assessment Scorecard
              </h4>
              <p className="text-xs text-slate-600">
                You can save a PDF copy or print this official report for your academic records.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handlePrint}
                className="py-2.5 px-6 bg-[#5C34A4] hover:bg-[#4D2B8A] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-md shadow-purple-900/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Scorecard / Save PDF</span>
              </button>
            </div>
          </div>

          {/* Official Verification Footer Note */}
          <div className="relative z-10 flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Official Computerized Assessment Report — SmartUp Learning Ventures</span>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 no-print">
        © 2026-27 SmartUp Learning Ventures. All rights reserved.
      </footer>

      {/* Print Specific CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          body {
            background: #ffffff !important;
            color: #0f172a !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .no-print, header, footer {
            display: none !important;
          }

          main {
            padding: 0 !important;
            max-width: 100% !important;
          }

          #scholarship-report {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
        }
      `,
        }}
      />
    </div>
  );
}

