"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  PhoneCall,
  Sparkles,
} from "lucide-react";
import EnquiryHeader from "@/components/enquiry/EnquiryHeader";
import EnquiryFooter from "@/components/enquiry/EnquiryFooter";
import SmartUpAnimatedLogo from "@/components/enquiry/SmartUpAnimatedLogo";
import {
  getEnquiryHomePath,
  loadEnquiryReceipt,
  saveEnquiryReceipt,
} from "@/lib/enquiry/receipt";
import type { SubmissionReceipt } from "@/components/enquiry/types";

export default function ThankYouView() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref")?.trim() || "";

  const [homeHref, setHomeHref] = useState("/enquiry");
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FAF8FF] via-white to-white">
      <EnquiryHeader homeHref={homeHref} />

      <main className="relative flex-1 flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16 overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] rounded-full bg-[#EDE7F6]/65 blur-[120px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-xl"
        >
          <div className="rounded-[24px] sm:rounded-[28px] bg-white border border-slate-200/90 p-6 sm:p-9 shadow-[0_24px_64px_-16px_rgba(92,52,164,0.16)] text-center space-y-6">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                <Loader2 className="w-7 h-7 animate-spin text-[#5C34A4]" />
                <p className="text-sm font-medium">
                  Loading your registration details...
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
                  <span>
                    {receipt?.updated
                      ? "Details Updated Successfully"
                      : "Registration Confirmed"}
                  </span>
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

                {receipt && (
                  <div className="mx-auto max-w-sm rounded-2xl bg-[#FAF8FF] border border-slate-200/80 px-4 py-3.5 text-xs space-y-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Reference ID</span>
                      <span className="font-mono font-bold text-[#5C34A4]">
                        {receipt.referenceCode}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Class</span>
                      <span className="font-bold text-slate-900">
                        {receipt.classLevel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">Batch Plan</span>
                      <span className="font-bold text-slate-900">
                        {receipt.preferredPlan}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mx-auto max-w-md rounded-2xl bg-slate-50/80 border border-slate-200/70 p-4 text-left space-y-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    What happens next
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <PhoneCall className="w-4 h-4 text-[#5C34A4] shrink-0 mt-0.5" />
                      <span>
                        Our counsellor will reach out to you at your preferred
                        time.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#5C34A4] shrink-0 mt-0.5" />
                      <span>
                        Free diagnostic &amp; live demo slot matched to your
                        class.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center pt-1">
                  <Link
                    href={homeHref}
                    className="px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>New enquiry</span>
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </main>

      <EnquiryFooter />
    </div>
  );
}
