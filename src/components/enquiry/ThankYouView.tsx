"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  PhoneCall,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import EnquiryHeader from "@/components/enquiry/EnquiryHeader";
import EnquiryFooter from "@/components/enquiry/EnquiryFooter";
import {
  ThankYou3DCard,
  ThankYou3DStage,
  ThankYouHeroEmblem,
} from "@/components/common/ThankYou3DStage";
import {
  getEnquiryHomePath,
  loadEnquiryReceipt,
  saveEnquiryReceipt,
} from "@/lib/enquiry/receipt";
import MetaLeadEvent from "@/components/analytics/MetaLeadEvent";
import type { SubmissionReceipt } from "@/components/enquiry/types";

export default function ThankYouView() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref")?.trim() || "";

  const [homeHref, setHomeHref] = useState("/enquiry");
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    setHomeHref(getEnquiryHomePath());

    let cancelled = false;

    async function resolveReceipt() {
      const cached = loadEnquiryReceipt(refCode || null);
      if (cached && (!refCode || cached.referenceCode === refCode)) {
        if (!cancelled) {
          setReceipt(cached);
          setIsLoading(false);
        }
        return;
      }

      if (!refCode) {
        if (!cancelled) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(
          `/api/enquiry/receipt?ref=${encodeURIComponent(refCode)}`
        );
        if (res.ok) {
          const data = (await res.json()) as SubmissionReceipt;
          saveEnquiryReceipt(data);
          if (!cancelled) {
            setReceipt(data);
          }
        }
      } catch {
        // Fall back to generic confirmation state if lookup fails
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
  }, [refCode]);

  const handleCopyRef = async () => {
    if (!receipt?.referenceCode) return;
    try {
      await navigator.clipboard.writeText(receipt.referenceCode);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    } catch {
      // Ignore clipboard failures on restricted contexts
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-gradient-to-b from-[#F5F1FF] via-[#FAF9FF] to-white overflow-x-hidden">
      <MetaLeadEvent
        contentName="enquiry_lead"
        eventId={receipt?.referenceCode}
      />
      <ThankYou3DStage />

      <div className="relative z-20">
        <EnquiryHeader homeHref={homeHref} />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-14">
        <ThankYou3DCard>
          <div className="text-center space-y-6">
            {isLoading ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-[#5C34A4]" />
                <p className="text-sm font-medium">
                  Loading your registration pass...
                </p>
              </div>
            ) : (
              <>
                <ThankYouHeroEmblem
                  badgeText={
                    receipt?.updated
                      ? "Details Updated Successfully"
                      : "Registration Confirmed"
                  }
                />

                {/* Headline & Subtext */}
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
                    Your registration for the{" "}
                    <strong className="text-slate-900">
                      CBSE Crash Course
                    </strong>{" "}
                    is saved. Our counsellor will reach out shortly with your{" "}
                    {receipt?.preferredPlan ? (
                      <>
                        <strong className="text-[#5C34A4]">
                          {receipt.preferredPlan}
                        </strong>{" "}
                      </>
                    ) : null}
                    fee structure &amp; demo schedule.
                  </p>
                </div>

                {/* 3D Elevated Registration Pass */}
                {receipt && (
                  <div
                    style={{ transform: "translateZ(32px)" }}
                    className="mx-auto max-w-md rounded-2xl bg-gradient-to-br from-[#FAF8FF] via-white to-[#F2ECFF] border border-[#5C34A4]/15 shadow-[0_14px_32px_-12px_rgba(92,52,164,0.25),inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden text-left"
                  >
                    <div className="px-4 py-2 bg-gradient-to-r from-[#5C34A4]/8 via-[#7C3AED]/8 to-transparent border-b border-[#5C34A4]/10 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#5C34A4]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Confirmed Registration Pass
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600">
                        ● Active
                      </span>
                    </div>

                    <div className="p-4 space-y-3 text-xs">
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                        <span className="text-slate-500 font-medium">
                          Reference ID
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#5C34A4] text-sm">
                            {receipt.referenceCode}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyRef}
                            title="Copy Reference ID"
                            className="p-1 rounded-md text-slate-400 hover:text-[#5C34A4] hover:bg-[#5C34A4]/10 transition cursor-pointer"
                          >
                            {copiedRef ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                          <p className="text-[11px] text-slate-400 font-medium">
                            Class
                          </p>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {receipt.classLevel}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/90 border border-slate-200/70 px-3.5 py-2.5 shadow-xs">
                          <p className="text-[11px] text-slate-400 font-medium">
                            Batch Plan
                          </p>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {receipt.preferredPlan}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3D Tactile Next Steps */}
                <div
                  style={{ transform: "translateZ(22px)" }}
                  className="mx-auto max-w-md text-left space-y-2.5"
                >
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400 px-1">
                    What happens next
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                    <div className="flex items-start gap-3 rounded-2xl bg-white/95 border border-slate-200/80 p-3.5 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.18)]">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5C34A4] to-[#7C3AED] text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_-3px_rgba(92,52,164,0.45)]">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <span className="leading-relaxed">
                        Our counsellor will reach out to you at your preferred
                        time.
                      </span>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl bg-white/95 border border-slate-200/80 p-3.5 shadow-[0_10px_24px_-14px_rgba(15,23,42,0.18)]">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white flex items-center justify-center shrink-0 shadow-[0_6px_14px_-3px_rgba(245,158,11,0.45)]">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="leading-relaxed">
                        Free diagnostic &amp; live demo slot matched to your
                        class.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3D Tactile Action Button */}
                <div
                  style={{ transform: "translateZ(36px)" }}
                  className="flex justify-center pt-1"
                >
                  <Link
                    href={homeHref}
                    className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-b from-white to-slate-50 border border-slate-200/90 text-slate-800 text-xs sm:text-sm font-bold shadow-[0_8px_20px_-8px_rgba(15,23,42,0.22),0_2px_0_rgba(203,213,225,0.9)] hover:-translate-y-0.5 hover:border-[#5C34A4]/35 hover:text-[#5C34A4] hover:shadow-[0_14px_28px_-10px_rgba(92,52,164,0.25),0_2px_0_rgba(92,52,164,0.25)] active:translate-y-0 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                    <span>New enquiry</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </ThankYou3DCard>
      </main>

      <div className="relative z-20">
        <EnquiryFooter />
      </div>
    </div>
  );
}
