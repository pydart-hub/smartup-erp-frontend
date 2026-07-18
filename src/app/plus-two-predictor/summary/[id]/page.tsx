"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

const Background3D = dynamic(
  () => import("@/components/predictor/Background3D"),
  { ssr: false }
);

interface SubjectPrediction {
  code: string;
  name: string;
  isPractical: boolean;
  p1ce: number;
  p1te: number;
  p2ce: number;
  p2pe: number;
  p2te: number;
}

function PlusTwoPredictorSummaryContent() {
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "Student";
  const [loading, setLoading] = useState(true);

  const [subjects, setSubjects] = useState<SubjectPrediction[]>([
    { code: "ENG", name: "English", isPractical: false, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 0, p2te: 80 },
    { code: "MAL", name: "Malayalam", isPractical: false, p1ce: 20, p1te: 65, p2ce: 20, p2pe: 0, p2te: 75 },
    { code: "PHY", name: "Physics", isPractical: true, p1ce: 20, p1te: 25, p2ce: 20, p2pe: 40, p2te: 60 },
    { code: "CHE", name: "Chemistry", isPractical: true, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 40, p2te: 55 },
    { code: "MAT", name: "Mathematics", isPractical: true, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 40, p2te: 55 },
    { code: "CSC", name: "Computer Science", isPractical: true, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 40, p2te: 55 },
  ]);

  // Load marks from query params on mount
  useEffect(() => {
    setSubjects((prev) =>
      prev.map((sub) => {
        const qP1Te = searchParams.get(`p1_${sub.code}_te`);
        const qP1Ce = searchParams.get(`p1_${sub.code}_ce`);
        const qP2Te = searchParams.get(`p2_${sub.code}_te`);
        const qP2Ce = searchParams.get(`p2_${sub.code}_ce`);
        return {
          ...sub,
          p1te: qP1Te ? parseInt(qP1Te) : sub.p1te,
          p1ce: qP1Ce ? parseInt(qP1Ce) : sub.p1ce,
          p2te: qP2Te ? parseInt(qP2Te) : sub.p2te,
          p2ce: qP2Ce ? parseInt(qP2Ce) : sub.p2ce,
        };
      })
    );

    // Simulate analysis loading screen
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [searchParams]);

  const getCombinedTotal = (sub: SubjectPrediction) => {
    return sub.p1ce + sub.p1te + sub.p2ce + sub.p2pe + sub.p2te;
  };

  const getGrade = (total: number) => {
    if (total >= 180) return "A+";
    if (total >= 160) return "A";
    if (total >= 140) return "B+";
    if (total >= 120) return "B";
    if (total >= 100) return "C+";
    if (total >= 80) return "C";
    if (total >= 60) return "D+";
    return "D";
  };

  const getGradeStyle = (grade: string) => {
    if (grade === "A+") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    if (grade === "A") return "bg-emerald-50/50 text-emerald-600 border border-emerald-100";
    if (grade.startsWith("B")) return "bg-blue-50 text-blue-700 border border-blue-200";
    if (grade.startsWith("C")) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
    return "bg-red-50 text-red-700 border border-red-200";
  };

  // Counts
  const totalAPlus = subjects.filter((sub) => getGrade(getCombinedTotal(sub)) === "A+").length;
  const doublePasses = subjects.filter((sub) => getCombinedTotal(sub) >= 60).length; // combined pass (D+ or above)

  // Share functionality
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Summary link copied to clipboard!");
  };

  const handleShareWhatsApp = () => {
    const text = `Hey! Here is my Plus Two Mark Prediction Summary on SmartUp:\n- A+ on target: ${totalAPlus}/6\n- Double Pass: ${doublePasses}/6\nCheck it out here: ${window.location.href}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleHelpWhatsApp = () => {
    const text = `Hi Eduport! I am ${userName}. I completed the SmartUp Plus Two Grade Predictor. My target is ${totalAPlus}/6 A+. I'd like help from Eduport to reach my goals!`;
    window.open(`https://wa.me/919656885566?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Loading Screen Overlay
  if (loading) {
    return (
      <div className="min-h-screen relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
        <Background3D />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-white border border-slate-100 p-8 rounded-3xl shadow-lg flex flex-col items-center justify-center text-center space-y-6"
        >
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-widest leading-none bg-purple-50 px-3 py-1 rounded-full">
            powered by eduport
          </div>

          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mt-4" />

          <div className="space-y-2 mt-4">
            <h3 className="text-lg font-black text-slate-800">
              Preparing your personalized summary...
            </h3>
            <p className="text-sm text-slate-400">
              Crunching your marks and your path to A+
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loaded Summary View
  return (
    <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 overflow-x-hidden">
      <Background3D />

      <div className="max-w-2xl mx-auto space-y-6 relative z-10">
        {/* Top Header */}
        <div className="flex justify-between items-center">
          <Link href="/plus-two-predictor" className="flex items-center gap-2">
            <Image
              src="/smartup-logo-v2.png"
              alt="SmartUp"
              width={30}
              height={30}
              className="object-contain block flex-shrink-0 drop-shadow-sm"
            />
            <span className="text-slate-800 text-md tracking-[0.15em] uppercase leading-none font-black drop-shadow-sm">
              SMART UP
            </span>
          </Link>
          <div className="text-[11px] font-bold text-purple-600 uppercase tracking-widest leading-none bg-purple-50 px-3 py-1.5 rounded-full">
            powered by eduport
          </div>
        </div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-slate-100 p-6 md:p-8 rounded-3xl shadow-xl shadow-purple-500/5 space-y-6"
        >
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
              YOUR PERSONALIZED SUMMARY
            </span>
            <h2 className="text-2xl font-black text-slate-800 leading-tight">
              {totalAPlus === 6 
                ? `A clean A+ sweep is within reach, ${userName.toUpperCase()}`
                : `You are on target for success, ${userName.toUpperCase()}`}
            </h2>
          </div>

          {/* Stats Boxes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50/40 border border-purple-100 rounded-2xl">
              <div className="text-2xl font-black text-purple-700">{totalAPlus}/6</div>
              <div className="text-xs font-semibold text-purple-600/80">A+ on target</div>
            </div>
            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
              <div className="text-2xl font-black text-emerald-700">{doublePasses}/6</div>
              <div className="text-xs font-semibold text-emerald-600/80">double pass</div>
            </div>
          </div>

          {/* Subject Grid List */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Subject by subject
            </h3>
            
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl bg-slate-50/30 overflow-hidden">
              {subjects.map((sub) => {
                const total = getCombinedTotal(sub);
                const grade = getGrade(total);
                return (
                  <div key={sub.code} className="flex justify-between items-center p-4 hover:bg-white/40 transition">
                    <span className="font-extrabold text-sm text-slate-700">{sub.name}</span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${getGradeStyle(grade)}`}>
                      {grade}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bullet Point Summary Container */}
          <div className="p-5 bg-purple-50/20 border border-purple-100 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 text-purple-700 font-extrabold text-sm">
                ✦ {userName.toUpperCase()}'S SUMMARY
              </div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-widest leading-none bg-purple-50 px-2 py-1 rounded-full border border-purple-100">
                Science
              </span>
            </div>

            <div className="font-black text-sm text-slate-800 leading-snug">
              {userName}: Staying on Top of Your Plus Two Science Aspirations
            </div>

            <ul className="space-y-2 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
              {subjects.map((sub) => {
                const total = getCombinedTotal(sub);
                const grade = getGrade(total);
                return (
                  <li key={sub.code}>
                    <span className="font-extrabold text-slate-700">{sub.name}</span>: Scored{" "}
                    <span className="font-bold text-slate-800">{sub.p1te}</span> in Plus One TE, hold{" "}
                    <span className="font-bold text-purple-600">{sub.p2te}</span> in Plus Two TE to{" "}
                    {grade === "A+" ? "keep" : "reach"} {grade}.
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Help Button */}
          <button
            onClick={handleHelpWhatsApp}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl transition shadow-lg shadow-purple-500/15 text-sm tracking-wide cursor-pointer text-center"
          >
            I'd like help from Eduport to reach my Plus Two goals
          </button>

          {/* Share Block */}
          <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
            <span className="text-xs text-slate-400 font-bold">
              Share your forecast with friends
            </span>
            
            <div className="flex w-full gap-3">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-3 bg-[#25d366] hover:bg-[#20ba59] text-white font-extrabold rounded-2xl transition text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-green-500/10"
              >
                Share on WhatsApp
              </button>
              <button
                onClick={handleCopyLink}
                className="flex-1 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-2xl transition text-sm cursor-pointer shadow-sm"
              >
                Copy Link
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PlusTwoPredictorSummary() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-400">
        Loading summary report...
      </div>
    }>
      <PlusTwoPredictorSummaryContent />
    </Suspense>
  );
}
