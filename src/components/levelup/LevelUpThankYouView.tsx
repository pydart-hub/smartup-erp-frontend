"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Trophy,
} from "lucide-react";
import SmartUpAnimatedLogo from "@/components/enquiry/SmartUpAnimatedLogo";
import {
  getLevelUpHomePath,
  loadLevelUpReceipt,
  saveLevelUpReceipt,
  type LevelUpSubmissionReceipt,
} from "@/lib/levelup-exam/receipt";

interface StoredLevelUpStudent {
  name?: string;
  email?: string;
  schoolName?: string;
  phone?: string;
  classLevel?: string;
  curriculum?: string;
  country?: string;
  emirateCity?: string;
}

export default function LevelUpThankYouView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const regId = searchParams.get("id")?.trim() || "";

  const [homeHref, setHomeHref] = useState("/levelup");
  const [receipt, setReceipt] = useState<LevelUpSubmissionReceipt | null>(
    null
  );
  const [storedStudent, setStoredStudent] =
    useState<StoredLevelUpStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingExam, setIsStartingExam] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    setHomeHref(getLevelUpHomePath());

    try {
      const saved = window.localStorage.getItem("levelup_student");
      if (saved) {
        setStoredStudent(JSON.parse(saved) as StoredLevelUpStudent);
      }
    } catch {
      // Ignore invalid localStorage
    }

    let cancelled = false;

    async function resolveReceipt() {
      const cached = loadLevelUpReceipt(regId || null);
      if (cached && (!regId || cached.registrationId === regId)) {
        if (!cancelled) {
          setReceipt(cached);
          setIsLoading(false);
        }
        return;
      }

      if (!regId) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/levelup/receipt?id=${encodeURIComponent(regId)}`
        );
        if (res.ok) {
          const data = (await res.json()) as LevelUpSubmissionReceipt;
          saveLevelUpReceipt(data);
          if (!cancelled) {
            setReceipt(data);
          }
        }
      } catch {
        // Fall back to generic confirmation if lookup fails
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    resolveReceipt();

    return () => {
      cancelled = true;
    };
  }, [regId]);

  const canStartDirectly = Boolean(receipt && storedStudent?.phone);

  const handleStartExam = async () => {
    setStartError(null);
    if (!canStartDirectly || !receipt || !storedStudent?.phone) {
      router.push(homeHref);
      return;
    }

    try {
      setIsStartingExam(true);
      const res = await fetch("/api/levelup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: receipt.studentName || storedStudent.name || "",
          email: storedStudent.email || "",
          schoolName: receipt.schoolName || storedStudent.schoolName || "",
          phone: storedStudent.phone,
          selectedClass: receipt.classLevel || storedStudent.classLevel || "",
          curriculum: receipt.curriculum || storedStudent.curriculum || "CBSE",
          country: receipt.country || storedStudent.country || "UAE",
          emirateCity:
            receipt.emirateCity || storedStudent.emirateCity || "Dubai",
          registrationId: receipt.registrationId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "Failed to start LevelUp scholarship exam."
        );
      }

      if (data.sessionToken) {
        sessionStorage.setItem(
          `levelup_token_${data.attemptId}`,
          data.sessionToken
        );
      }

      window.location.href = `/levelup/exam/${data.attemptId}`;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to start exam. Please try again.";
      setStartError(message);
      setIsStartingExam(false);
    }
  };

  const registerAnotherHref = `${homeHref}?new=1`;

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between selection:bg-[#5C34A4] selection:text-white font-sans relative overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="w-full bg-transparent py-5 px-6 sm:px-12 lg:px-20 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            href={homeHref}
            className="flex items-center gap-3.5 group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5C34A4] rounded-xl p-1 -m-1 transition-transform active:scale-95"
          >
            <div className="relative w-11 h-11 flex items-center justify-center shrink-0 group-hover:opacity-90 transition-opacity">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp LevelUp GCC"
                width={44}
                height={44}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-black tracking-tight text-slate-900 leading-none group-hover:text-[#5C34A4] transition-colors">
                SMART UP
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-[0.18em] uppercase mt-1">
                Scholarship Exam
              </span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main Confirmation Card */}
      <main className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-[#EFEBFA]/80 blur-[120px] -z-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-xl"
        >
          <div className="rounded-[28px] bg-white border border-slate-100 p-6 sm:p-9 shadow-2xl shadow-purple-950/10 text-center space-y-6">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin text-[#5C34A4]" />
                <p className="text-sm font-medium">
                  Loading your exam registration...
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-[#F5F3FF] to-[#EDE7F6] border border-[#5C34A4]/20 flex items-center justify-center p-3 shadow-inner">
                    <SmartUpAnimatedLogo size={96} />
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Registration Complete</span>
                </div>

                <div className="space-y-2.5 px-1">
                  <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                    Thank You
                    {receipt?.studentName ? (
                      <>
                        ,{" "}
                        <span className="text-[#5C34A4]">
                          {receipt.studentName}!
                        </span>
                      </>
                    ) : (
                      "!"
                    )}
                  </h1>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your slot for the{" "}
                    <strong className="text-slate-900">
                      SmartUp LevelUp Scholarship Exam
                    </strong>{" "}
                    {receipt?.classLevel ? (
                      <>
                        for{" "}
                        <strong className="text-[#5C34A4]">
                          {receipt.classLevel}
                        </strong>{" "}
                      </>
                    ) : null}
                    is saved in our database.
                  </p>
                </div>

                {receipt && (
                  <div className="mx-auto max-w-sm rounded-2xl bg-[#FAF8FF] border border-slate-200/80 px-4 py-3.5 text-xs space-y-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Class / Grade</span>
                      <span className="font-bold text-slate-900">
                        {receipt.classLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Syllabus</span>
                      <span className="font-bold text-[#5C34A4]">
                        {receipt.curriculum === "State"
                          ? "State Syllabus"
                          : "CBSE Board"}
                      </span>
                    </div>
                    {receipt.schoolName && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500">School</span>
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">
                          {receipt.schoolName}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Location</span>
                      <span className="font-medium text-slate-800">
                        {receipt.emirateCity
                          ? `${receipt.emirateCity}, ${receipt.country}`
                          : receipt.country}
                      </span>
                    </div>
                    {receipt.examTitle && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/70">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5 text-[#5C34A4]" />
                          Exam
                        </span>
                        <span className="font-bold text-slate-900 truncate max-w-[200px]">
                          {receipt.examTitle}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {startError && (
                  <div className="mx-auto max-w-sm rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{startError}</span>
                  </div>
                )}

                <div className="space-y-3 max-w-sm mx-auto pt-1">
                  <button
                    type="button"
                    disabled={isStartingExam}
                    onClick={handleStartExam}
                    className="w-full py-3.5 px-6 font-bold text-sm text-white bg-[#5C34A4] hover:bg-[#4E2B8E] active:bg-[#43237E] disabled:opacity-70 rounded-xl transition-all shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isStartingExam ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Starting Scholarship Exam...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {canStartDirectly
                            ? "Take Scholarship Exam Now"
                            : "Go to Scholarship Portal"}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <Link
                    href={registerAnotherHref}
                    className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#5C34A4] hover:underline pt-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Register another student</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-slate-400">
        © 2026 SmartUp Learning Ventures • levelup.smartuplearning.net
      </footer>
    </div>
  );
}
