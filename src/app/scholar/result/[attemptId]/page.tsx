import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/public-exam/db";
import { finalizeExpiredAttemptIfNeeded } from "@/lib/public-exam/attempts";
import {
  Trophy,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  User,
  GraduationCap,
  MapPin,
  FileCheck2,
} from "lucide-react";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function ScholarResultPage({ params }: PageProps) {
  const { attemptId } = await params;
  const lifecycle = await finalizeExpiredAttemptIfNeeded(attemptId);
  const attempt = lifecycle.attempt;

  if (!attempt) {
    return notFound();
  }

  const score = attempt.scoreObtained;
  const total = attempt.totalMarks || 40;
  const percentage = attempt.percentage || Math.round((score / total) * 100);

  // Determine merit fee waiver tier
  let waiverTitle = "15% Tuition Fee Waiver";
  let waiverBadge = "Qualified";
  let waiverColor = "text-purple-700 bg-purple-50 border-purple-200";

  if (percentage >= 85) {
    waiverTitle = "Up to 100% Tuition Fee Waiver";
    waiverBadge = "Super 30 Performer";
    waiverColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  } else if (percentage >= 70) {
    waiverTitle = "50% Tuition Fee Waiver";
    waiverBadge = "Merit Star";
    waiverColor = "text-[#5C34A4] bg-purple-50 border-purple-200";
  } else if (percentage >= 50) {
    waiverTitle = "30% Tuition Fee Waiver";
    waiverBadge = "Scholar Achiever";
    waiverColor = "text-blue-700 bg-blue-50 border-blue-200";
  }

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between font-sans selection:bg-[#5C34A4] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200/80 py-4 px-6 sm:px-12">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
              <Image src="/smartup-logo-v2.png" alt="SmartUp" width={40} height={40} priority className="object-contain" />
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

          <div className="bg-[#EFEBFA] text-[#5C34A4] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
            Batch 2026-27
          </div>
        </div>
      </header>

      {/* Main Scorecard Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 w-full flex-1">
        <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-100 shadow-xl shadow-purple-950/5 space-y-8">
          
          {/* Top Hero Banner */}
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-[#EFEBFA] text-[#5C34A4] flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-10 h-10 stroke-[2.2]" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#7C5CB7]">
                Official Scorecard &amp; Rank Certificate
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Scholarship Assessment Completed!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Congratulations, <strong className="text-[#5C34A4]">{attempt.studentName}</strong>! Your results have been officially verified.
              </p>
            </div>
          </div>

          {/* Student & Assessment Details Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Student
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
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

            {/* Merit Fee Waiver Voucher */}
            <div className={`p-6 rounded-3xl border flex flex-col justify-between ${waiverColor}`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/80 inline-block mb-2">
                  {waiverBadge}
                </span>
                <h3 className="text-lg font-black leading-tight">
                  {waiverTitle}
                </h3>
              </div>
              <p className="text-[11px] opacity-80 mt-2">
                Eligible for SmartUp Tuition Fee Scholarship for Academic Year 2026-27.
              </p>
            </div>
          </div>

          {/* Next Steps / Admission CTA */}
          <div className="p-6 rounded-2xl bg-purple-50/70 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-[#5C34A4]">
                Claim Your Scholarship at any SmartUp Center
              </h4>
              <p className="text-xs text-slate-600">
                Show your mobile number (+91 {attempt.studentPhone}) or this scorecard at any SmartUp Branch to redeem your tuition fee waiver voucher.
              </p>
            </div>

            <Link
              href="/scholar"
              className="py-2.5 px-5 bg-[#5C34A4] hover:bg-[#4D2B8A] text-white text-xs font-bold rounded-full transition-all shrink-0 flex items-center gap-1.5 shadow-md shadow-purple-900/20"
            >
              <span>Back to Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-2">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span>Official Computerized Scholarship Assessment — SmartUp Learning Ventures</span>
          </div>

        </div>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400">
        © 2026-27 SmartUp Learning Ventures. All rights reserved.
      </footer>
    </div>
  );
}
