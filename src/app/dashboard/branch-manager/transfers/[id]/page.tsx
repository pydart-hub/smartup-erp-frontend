"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRightLeft, ArrowRight, Calendar, IndianRupee,
  User, Building2, Loader2, AlertCircle, FileText,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TransferStatusBadge } from "@/components/transfers/TransferStatusBadge";
import { TransferReviewCard } from "@/components/transfers/TransferReviewCard";
import { TransferTimeline } from "@/components/transfers/TransferTimeline";
import { useAuth } from "@/lib/hooks/useAuth";
import type { StudentBranchTransfer } from "@/lib/types/transfer";

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: transfer, isLoading, error } = useQuery<StudentBranchTransfer>({
    queryKey: ["transfer", id],
    queryFn: async () => {
      const res = await fetch(`/api/transfer/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("Failed to fetch transfer");
      const json = await res.json();
      return json.data;
    },
    enabled: !!id,
  });

  const canRespond = transfer?.to_branch === defaultCompany && transfer?.status === "Pending";

  const handleResponded = () => {
    queryClient.invalidateQueries({ queryKey: ["transfer", id] });
    queryClient.invalidateQueries({ queryKey: ["transfers"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-[14px]" />
        <Skeleton className="h-48 w-full rounded-[14px]" />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-10 w-10 text-error mb-3" />
        <p className="text-text-secondary">Transfer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Transfer {transfer.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {transfer.student_name} · {transfer.program}
            {transfer.custom_disabilities && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{transfer.custom_disabilities}</span>
            )}
          </p>
        </div>
        <TransferStatusBadge status={transfer.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transfer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Transfer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Student" value={`${transfer.student_name} (${transfer.student})`} />
            <InfoRow label="Program" value={transfer.program} />
            <InfoRow label="Academic Year" value={transfer.academic_year} />

            <div className="flex items-center gap-2 py-2">
              <div className="flex-1 bg-app-bg rounded-[10px] p-3 text-center">
                <p className="text-xs text-text-tertiary">From</p>
                <p className="text-sm font-medium text-text-primary flex items-center justify-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {transfer.from_branch?.replace("Smart Up ", "")}
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 bg-primary-light rounded-[10px] p-3 text-center">
                <p className="text-xs text-primary/70">To</p>
                <p className="text-sm font-medium text-primary flex items-center justify-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {transfer.to_branch?.replace("Smart Up ", "")}
                </p>
              </div>
            </div>

            {transfer.reason && <InfoRow label="Reason" value={transfer.reason} />}
            <InfoRow label="Requested by" value={transfer.requested_by || "—"} />
            <InfoRow label="Request date" value={transfer.request_date || "—"} />
            {transfer.approved_by && <InfoRow label="Responded by" value={transfer.approved_by} />}
            {transfer.completion_date && <InfoRow label="Completed" value={transfer.completion_date} />}
            {transfer.rejection_reason && (
              <div className="bg-error-light rounded-[10px] p-3">
                <p className="text-xs text-error font-medium">Rejection Reason</p>
                <p className="text-sm text-error">{transfer.rejection_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-primary" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Old Fee Structure" value={transfer.old_fee_structure || "—"} />
              <InfoRow
                label="Old Total"
                value={transfer.old_total_amount ? `₹${transfer.old_total_amount.toLocaleString("en-IN")}` : "—"}
              />
              <InfoRow
                label="Amount Paid"
                value={`₹${(transfer.amount_already_paid || 0).toLocaleString("en-IN")}`}
                highlight
              />
              {transfer.new_fee_structure && (
                <>
                  <div className="border-t border-border-light my-2" />
                  <InfoRow label="New Fee Structure" value={transfer.new_fee_structure} />
                  <InfoRow
                    label="New Total"
                    value={`₹${(transfer.new_total_amount || 0).toLocaleString("en-IN")}`}
                  />
                  <InfoRow
                    label="Adjusted Amount"
                    value={`₹${(transfer.adjusted_amount || 0).toLocaleString("en-IN")}`}
                    highlight
                  />
                  <InfoRow label="Payment Plan" value={`${transfer.new_no_of_instalments || "—"} instalments`} />
                </>
              )}
              {transfer.old_sales_order && <InfoRow label="Old SO" value={transfer.old_sales_order} />}
              {transfer.new_sales_order && <InfoRow label="New SO" value={transfer.new_sales_order} />}
            </CardContent>
          </Card>

          {/* Review card (only for receiver BM with pending transfer) */}
          {canRespond && (
            <TransferReviewCard
              transfer={transfer}
              canRespond={canRespond}
              onResponded={handleResponded}
            />
          )}
        </div>
      </div>

      {/* Execution Log */}
      {transfer.transfer_log && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Execution Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TransferTimeline log={transfer.transfer_log} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className={`text-sm ${highlight ? "font-semibold text-primary" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}
