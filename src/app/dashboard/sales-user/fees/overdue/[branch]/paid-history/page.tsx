"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { getRecentlyPaidClaims } from "@/lib/api/director";
import { formatCurrency } from "@/lib/utils/formatters";
import { FollowUpDrawer } from "@/components/fees/FollowUpDrawer";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function PaidHistoryPage() {
  const params = useParams();
  const branch = decodeURIComponent(params.branch as string);
  const shortBranch = branch.replace("Smart Up ", "").replace("Smart Up", "HQ");

  const [drawerStudent, setDrawerStudent] = useState<{ student_id: string; student_name: string; branch: string } | null>(null);
  const [drawerDefaults, setDrawerDefaults] = useState<{
    callStatus?: string;
    paymentReceived?: boolean;
    amountReceived?: number;
    paymentMode?: string;
  } | null>(null);

  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ["recently-paid-claims", branch],
    queryFn: () => getRecentlyPaidClaims(branch),
    enabled: !!branch,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const awaitingRows = (rows ?? []).filter((row) => row.claim_status === "awaiting_claim");
  const claimedRows = (rows ?? []).filter((row) => row.claim_status === "claimed");
  const totalPaid = awaitingRows.reduce((sum, row) => sum + (row.recent_payment.paid_amount || 0), 0);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5 pb-8">
      <BreadcrumbNav />

      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <Link
          href="/dashboard/sales-user/fees/overdue-paid"
          className="text-text-tertiary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{shortBranch} — Overdue Students Paid</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Only overdue students who also paid in the last 4 days
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="border-emerald-200/70 bg-emerald-50/40">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">Recent Paid Count</p>
              <p className="text-2xl font-bold text-emerald-700">
                {isLoading ? "..." : awaitingRows.length}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-sm text-text-secondary">Paid Amount</p>
              <p className="text-2xl font-bold text-emerald-700">
                {isLoading ? "..." : formatCurrency(totalPaid)}
              </p>
            </div>
            {!!claimedRows.length && (
              <div className="text-right">
                <p className="text-sm text-text-secondary">Claimed</p>
                <p className="text-xl font-bold text-text-primary">
                  {claimedRows.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <GifLoader />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <AlertCircle className="h-8 w-8 text-error" />
          <p className="text-sm text-error">Failed to load paid overdue history</p>
        </div>
      ) : !awaitingRows.length && !claimedRows.length ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <CheckCircle2 className="h-8 w-8 text-text-tertiary" />
          <p className="text-sm text-text-secondary">No overdue students with recent payments in the last 4 days.</p>
        </div>
      ) : (
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-2">
          {awaitingRows.map((claim) => (
            <motion.div key={claim.student_id} variants={itemVariants}>
              <Card className="border-emerald-200/70 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-text-primary">{claim.student_name}</p>
                        <span className="text-[10px] text-text-tertiary font-mono">{claim.student_id}</span>
                        {claim.class_name && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {claim.class_name.replace(" Tuition Fee", "")}
                          </span>
                        )}
                        {claim.batch_name && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
                            {claim.batch_name}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                        <span>Paid on: {formatDate(claim.recent_payment.posting_date)}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-medium">
                          Paid {formatCurrency(claim.recent_payment.paid_amount)}
                        </span>
                        <span>•</span>
                        <span>{claim.recent_payment.mode_of_payment || "Payment received"}</span>
                        <span>•</span>
                        <span className="text-orange-700 font-medium">
                          Still overdue: {formatCurrency(claim.total_dues)}
                        </span>
                        {claim.latest_followup && (
                          <>
                            <span>•</span>
                            <span>Last call: {formatDate(claim.latest_followup.call_date)}</span>
                            <span>•</span>
                            <span>by {claim.latest_followup.called_by.split("@")[0]}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setDrawerStudent({ student_id: claim.student_id, student_name: claim.student_name, branch });
                        setDrawerDefaults({
                          callStatus: "Already Paid",
                          paymentReceived: true,
                          amountReceived: claim.recent_payment.paid_amount,
                          paymentMode: claim.recent_payment.mode_of_payment,
                        });
                      }}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      <PhoneCall className="h-3 w-3" />
                      Claim Conversion
                    </button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {!!claimedRows.length && (
            <motion.div variants={itemVariants} className="pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary px-1 mb-2">
                Claimed
              </p>
              <div className="space-y-2">
                {claimedRows.map((claim) => (
                  <Card key={`claimed-${claim.student_id}`} className="border-slate-200 bg-slate-50/70">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-text-primary">{claim.student_name}</p>
                          <span className="text-[10px] text-text-tertiary font-mono">{claim.student_id}</span>
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Claimed
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                          <span>Paid on: {formatDate(claim.recent_payment.posting_date)}</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">
                            Paid {formatCurrency(claim.recent_payment.paid_amount)}
                          </span>
                          {claim.latest_followup && (
                            <>
                              <span>•</span>
                              <span>Claimed on: {formatDate(claim.latest_followup.call_date)}</span>
                              <span>•</span>
                              <span>by {claim.latest_followup.called_by.split("@")[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      <FollowUpDrawer
        key={`${drawerStudent ? "open" : "closed"}-${drawerStudent?.student_id ?? "none"}-${drawerDefaults?.callStatus ?? ""}-${drawerDefaults?.amountReceived ?? ""}-${drawerDefaults?.paymentMode ?? ""}`}
        open={drawerStudent !== null}
        onClose={() => {
          setDrawerStudent(null);
          setDrawerDefaults(null);
        }}
        student={drawerStudent ?? { student_id: "", student_name: "", branch: "" }}
        invalidateKeys={[["recently-paid-claims", branch], ["followup-branch-all", branch]]}
        initialCallStatus={drawerDefaults?.callStatus}
        initialPaymentReceived={drawerDefaults?.paymentReceived}
        initialAmountReceived={drawerDefaults?.amountReceived}
        initialPaymentMode={drawerDefaults?.paymentMode}
      />
    </motion.div>
  );
}
