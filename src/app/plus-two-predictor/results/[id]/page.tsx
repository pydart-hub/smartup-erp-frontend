"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, useParams } from "next/navigation";
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

function PlusTwoPredictorResultsContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const userName = searchParams.get("name") || "Student";
  const [savedToDb, setSavedToDb] = useState(false);

  const [subjects, setSubjects] = useState<SubjectPrediction[]>([
    { code: "ENG", name: "English", isPractical: false, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 0, p2te: 80 },
    { code: "MAL", name: "Malayalam / Language", isPractical: false, p1ce: 20, p1te: 65, p2ce: 20, p2pe: 0, p2te: 75 },
    { code: "PHY", name: "Physics", isPractical: true, p1ce: 20, p1te: 25, p2ce: 20, p2pe: 40, p2te: 60 },
    { code: "CHE", name: "Chemistry", isPractical: true, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 40, p2te: 55 },
    { code: "MAT", name: "Mathematics", isPractical: true, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 40, p2te: 55 },
    { code: "CSC", name: "Computer Science / Bio", isPractical: true, p1ce: 20, p1te: 45, p2ce: 20, p2pe: 40, p2te: 55 },
  ]);

  // Load marks from query params on mount
  useEffect(() => {
    setSubjects((prev) =>
      prev.map((sub) => {
        const queryTe = searchParams.get(`p1_${sub.code}_te`);
        const queryCe = searchParams.get(`p1_${sub.code}_ce`);
        return {
          ...sub,
          p1te: queryTe ? parseInt(queryTe) : sub.p1te,
          p1ce: queryCe ? parseInt(queryCe) : sub.p1ce,
        };
      })
    );
  }, [searchParams]);

  // Auto-save submission once per unique result page visit
  useEffect(() => {
    const pageId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    if (!pageId) return;

    const sessionKey = `predictor_saved_${pageId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(sessionKey)) return;
    if (savedToDb) return;

    const name = searchParams.get("name") || "";
    const phone = searchParams.get("phone") || "";
    const district = searchParams.get("district") || "";
    const stream = searchParams.get("stream") || "Science";

    // Only save if we have real student data (not just default values)
    if (!name || !phone) return;

    const marks: Record<string, { p1te: number; p1ce: number }> = {};
    const codes = ["ENG", "MAL", "PHY", "CHE", "MAT", "CSC"];
    for (const code of codes) {
      const te = searchParams.get(`p1_${code}_te`);
      const ce = searchParams.get(`p1_${code}_ce`);
      if (te !== null && ce !== null) {
        marks[code] = { p1te: parseInt(te), p1ce: parseInt(ce) };
      }
    }

    if (Object.keys(marks).length === 0) return;

    setSavedToDb(true);
    fetch("/api/predictor/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, district, stream, marks }),
    })
      .then((res) => {
        if (res.ok && typeof window !== "undefined") {
          sessionStorage.setItem(sessionKey, "1");
        }
      })
      .catch(() => {
        // Silent fail — non-critical
        setSavedToDb(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleP2TeChange = (code: string, value: number) => {
    setSubjects((prev) =>
      prev.map((sub) => {
        if (sub.code === code) {
          const maxTe = sub.isPractical ? 60 : 80;
          const cleanVal = Math.min(Math.max(0, value), maxTe);
          return { ...sub, p2te: cleanVal };
        }
        return sub;
      })
    );
  };

  const getCombinedTotal = (sub: SubjectPrediction) => {
    return sub.p1ce + sub.p1te + sub.p2ce + sub.p2pe + sub.p2te;
  };

  // Calculate the minimum Plus Two TE score a student needs to achieve A+
  // Formula: 180 (A+ threshold) - (P1CE + P1TE + P2CE + P2PE)
  // For practical: fixedTotal = 20 + p1te + 20 + 40 = p1te + 80
  // For non-practical: fixedTotal = 20 + p1te + 20 + 0 = p1te + 40
  const getAplusTarget = (sub: SubjectPrediction) => {
    const maxTe = sub.isPractical ? 60 : 80;
    const fixedTotal = sub.p1ce + sub.p1te + sub.p2ce + sub.p2pe;
    const needed = 180 - fixedTotal;

    if (needed <= 0) {
      // Already guaranteed A+ even with 0 in P2 TE
      return { needed: 0, maxTe, status: "guaranteed" as const };
    }
    if (needed > maxTe) {
      // Cannot reach A+ even with full marks
      return { needed, maxTe, status: "impossible" as const };
    }
    if (needed === maxTe) {
      // Must score perfect — RISKY
      return { needed, maxTe, status: "risk" as const };
    }
    if (needed >= maxTe * 0.85) {
      // Needs 85%+ of max — CHALLENGING
      return { needed, maxTe, status: "hard" as const };
    }
    // Comfortably achievable
    return { needed, maxTe, status: "ok" as const };
  };

  const getGrade = (total: number) => {
    if (total >= 180) return { label: "A+", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
    if (total >= 160) return { label: "A", color: "bg-green-50 text-green-700 border border-green-200" };
    if (total >= 140) return { label: "B+", color: "bg-blue-50 text-blue-700 border border-blue-200" };
    if (total >= 120) return { label: "B", color: "bg-indigo-50 text-indigo-700 border border-indigo-200" };
    if (total >= 100) return { label: "C+", color: "bg-yellow-50 text-yellow-700 border border-yellow-200" };
    if (total >= 80) return { label: "C", color: "bg-orange-50 text-orange-700 border border-orange-200" };
    if (total >= 60) return { label: "D+", color: "bg-amber-50 text-amber-700 border border-amber-200" };
    return { label: "D", color: "bg-red-50 text-red-700 border border-red-200" };
  };

  const p1Total = subjects.reduce((sum, sub) => sum + sub.p1ce + sub.p1te, 0);
  const p1MaxTotal = 520;
  const p1Percentage = ((p1Total / p1MaxTotal) * 100).toFixed(1);

  return (
    <div className="min-h-screen relative py-12 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 overflow-x-hidden">
      {/* 3D Background */}
      <Background3D />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Top Header Navigation */}
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
          <Link
            href="/plus-two-predictor"
            className="text-xs bg-white/70 hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-700 transition shadow-sm"
          >
            ← Back
          </Link>
        </div>

        {/* Top Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-8 text-center space-y-3 shadow-[0_8px_32px_0_rgba(124,58,237,0.06)]"
        >
          <div className="text-slate-400 font-medium uppercase tracking-wider text-xs">Your Plus One Percentage</div>
          <div className="text-5xl font-black text-[#5f2ea8] drop-shadow-sm">
            {p1Percentage}%
          </div>
          <div className="text-sm text-slate-500">{p1Total} / {p1MaxTotal} marks</div>
        </motion.div>

        {/* Results Body Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white/75 backdrop-blur-xl border border-white/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-[0_8px_32px_0_rgba(124,58,237,0.06)]"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-800">
              {userName}, here's your <span className="text-[#5f2ea8] font-extrabold">Plus Two Mark Prediction</span>
            </h1>
            <p className="text-xs text-slate-400">CHANGE MARKS TO KNOW PLUS TWO GRADES</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase">
                  <th className="py-4">Subject</th>
                  <th className="py-4">CE</th>
                  <th className="py-4">PE</th>
                  <th className="py-4">TE (Predict)</th>
                  <th className="py-4">Total</th>
                  <th className="py-4 text-center">Grade</th>
                  <th className="py-4 text-center">A+ Target</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subjects.map((sub, index) => {
                  const total = getCombinedTotal(sub);
                  const grade = getGrade(total);
                  const maxTe = sub.isPractical ? 60 : 80;
                  const aplus = getAplusTarget(sub);

                  const aPlusTargetBadge = () => {
                    switch (aplus.status) {
                      case "guaranteed":
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ A+ Secured
                          </span>
                        );
                      case "ok":
                        return (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                              Need {aplus.needed}/{aplus.maxTe}
                            </span>
                            <div className="text-[9px] text-slate-400 text-center">for A+</div>
                          </div>
                        );
                      case "hard":
                        return (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              ⚡ {aplus.needed}/{aplus.maxTe}
                            </span>
                            <div className="text-[9px] text-amber-500 text-center font-semibold">Challenging</div>
                          </div>
                        );
                      case "risk":
                        return (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                              ⚠ {aplus.needed}/{aplus.maxTe}
                            </span>
                            <div className="text-[9px] text-red-500 text-center font-bold">RISKY — Full marks!</div>
                          </div>
                        );
                      case "impossible":
                        return (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold bg-slate-100 text-slate-500 border border-slate-200">
                              ✕ Not possible
                            </span>
                            <div className="text-[9px] text-slate-400 text-center">A+ not reachable</div>
                          </div>
                        );
                      default:
                        return null;
                    }
                  };

                  return (
                    <motion.tr
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 * index }}
                      key={sub.code}
                      className="hover:bg-slate-50/50 transition"
                    >
                      <td className="py-4 font-semibold text-slate-800">
                        <div className="text-sm font-black text-slate-800">{sub.name}</div>
                        <div className="flex flex-col gap-0.5 mt-1 font-normal text-[10px]">
                          <div className="text-slate-500">
                            <span className="font-semibold text-slate-600">Plus One:</span> TE {sub.p1te}/{sub.isPractical ? 60 : 80} · CE {sub.p1ce}/20
                          </div>
                          <div className="text-purple-600">
                            <span className="font-semibold text-purple-700">Plus Two:</span> CE {sub.p2ce}/20 {sub.isPractical && `· Lab ${sub.p2pe}/40`} · Needed {aplus.status === "impossible" ? "—" : `${aplus.needed}/${maxTe}`}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">{sub.p2ce}</td>
                      <td className="py-4 text-slate-400">{sub.isPractical ? sub.p2pe : "—"}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={maxTe}
                            value={sub.p2te}
                            onChange={(e) => handleP2TeChange(sub.code, parseInt(e.target.value) || 0)}
                            className="w-16 p-1.5 bg-white border border-slate-200 rounded-lg text-center focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 transition focus:outline-none shadow-sm"
                          />
                          <span className="text-xs text-slate-400">/ {maxTe}</span>
                        </div>
                      </td>
                      <td className="py-4 font-bold text-slate-800">{total}</td>
                      <td className="py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${grade.color}`}>
                          {grade.label}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        {aPlusTargetBadge()}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="mt-6">
            <button
              onClick={() => {
                const randomId = Math.random().toString(36).substring(2, 10);
                const query = new URLSearchParams();
                query.set("name", userName);
                
                // Copy existing parameters
                searchParams.forEach((val, key) => {
                  if (!key.startsWith("p1_") && key !== "name") {
                    query.set(key, val);
                  }
                });

                // Set actual state marks (both P1 and predicted P2)
                subjects.forEach((sub) => {
                  query.set(`p1_${sub.code}_te`, sub.p1te.toString());
                  query.set(`p1_${sub.code}_ce`, sub.p1ce.toString());
                  query.set(`p2_${sub.code}_te`, sub.p2te.toString());
                });

                router.push(`/plus-two-predictor/summary/${randomId}?${query.toString()}`);
              }}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl transition shadow-lg shadow-purple-500/15 text-sm tracking-wider cursor-pointer text-center"
            >
              Get personalized summary →
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function PlusTwoPredictorResults() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-400">
        Loading prediction results...
      </div>
    }>
      <PlusTwoPredictorResultsContent />
    </Suspense>
  );
}
