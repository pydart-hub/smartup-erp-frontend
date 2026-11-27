"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import {
  ThankYou3DCard,
  ThankYou3DStage,
  ThankYouHeroEmblem,
} from "@/components/common/ThankYou3DStage";
import {
  getLevelUpHomePath,
  loadLevelUpReceipt,
  saveLevelUpReceipt,
  type LevelUpSubmissionReceipt,
} from "@/lib/levelup-exam/receipt";
import MetaLeadEvent from "@/components/analytics/MetaLeadEvent";

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
    <div className="relative min-h-screen bg-gradient-to-b from-[#F5F1FF] via-[#FAF9FF] to-white text-slate-800 flex flex-col justify-between selection:bg-[#5C34A4] selection:text-white font-sans overflow-x-hidden">
      <MetaLeadEvent
        contentName="levelup_lead"
        eventId={receipt?.registrationId}
      />
      <ThankYou3DStage />

      {/* Top Navigation Bar */}
      <header className="relative w-full bg-white/75 backdrop-blur-md border-b border-slate-200/60 py-4 px-6 sm:px-12 lg:px-20 z-20">
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
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-14">
        <ThankYou3DCard>
          <div className="text-center space-y-6">
            {isLoading ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#5C34A4]" />
                <p className="text-sm font-medium">
                  Loading your exam pass...
                </p>
              </div>
            ) : (
              <>
                <ThankYouHeroEmblem badgeText="Registration Complete" />

                <div
                  className="space-y-2.5 px-1"
                  style={{ transform: "translateZ(26px)" }}
                >
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    Thank You
                    {receipt?.studentName ? (
                      <>
                        ,{" "}
                        <span className="bg-gradient-to-r from-[#5C34A4] via-[#7C3AED] to-[#4B288A] bg-clip-text text-transparent">
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
                  <div
                    style={{ transform: "translateZ(32px)" }}
                    className="mx-auto max-w-md rounded-2xl bg-gradient-to-br from-[#FAF8FF] via-white to-[#F2ECFF] border border-[#5C34A4]/15 shadow-[0_14px_32px_-12px_rgba(92,52,164,0.25),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden text-left"
                  >
                    <div className="px-4 py-2 bg-gradient-to-r from-[#5C34A4]/8 via-[#7C3AED]/8 to-transparent border-b border-[#5C34A4]/10 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#5C34A4]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Scholarship Exam Pass
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        ● Verified
                      </span>
                    </div>

                    <div className="p-4 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                          <p className="text-[11px] text-slate-400 font-medium">
                            Class / Grade
                          </p>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {receipt.classLevel}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                          <p className="text-[11px] text-slate-400 font-medium">
                            Syllabus
                          </p>
                          <p className="font-bold text-[#5C34A4] mt-0.5">
                            {receipt.curriculum === "State"
                              ? "State Syllabus"
                              : "CBSE Board"}
                          </p>
                        </div>
                      </div>

                      {receipt.schoolName && (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                          <span className="text-slate-500">School</span>
                          <span className="font-bold text-slate-900 truncate max-w-[220px]">
                            {receipt.schoolName}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                        <span className="text-slate-500">Location</span>
                        <span className="font-semibold text-slate-800">
                          {receipt.emirateCity
                            ? `${receipt.emirateCity}, ${receipt.country}`
                            : receipt.country}
                        </span>
                      </div>

                      {receipt.examTitle && (
                        <div className="flex items-center justify-between gap-2 rounded-xl bg-[#5C34A4]/6 border border-[#5C34A4]/15 px-3.5 py-2.5">
                          <span className="text-[#5C34A4] font-semibold flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5" />
                            Exam
                          </span>
                          <span className="font-bold text-slate-900 truncate max-w-[220px]">
                            {receipt.examTitle}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {startError && (
                  <div className="mx-auto max-w-md rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium flex items-start gap-2 text-left">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{startError}</span>
                  </div>
                )}

                <div
                  style={{ transform: "translateZ(36px)" }}
                  className="space-y-3 max-w-sm mx-auto pt-1"
                >
                  <button
                    type="button"
                    disabled={isStartingExam}
                    onClick={handleStartExam}
                    className="w-full py-3.5 px-6 font-bold text-sm text-white bg-gradient-to-b from-[#6E42BE] to-[#5C34A4] hover:from-[#7A4CCF] hover:to-[#4E2B8E] active:translate-y-0.5 disabled:opacity-70 rounded-xl transition-all shadow-[0_14px_28px_-8px_rgba(92,52,164,0.55),0_3px_0_#3F1F79] hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
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
        </ThankYou3DCard>
      </main>

      {/* Footer */}
      <footer className="relative z-20 py-3 text-center text-xs text-slate-400">
        © 2026 SmartUp Learning Ventures • levelup.smartuplearning.net
      </footer>
    </div>
  );
}
