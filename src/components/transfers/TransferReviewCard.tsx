"use client";

import React, { useState, useEffect } from "react";
import { Check, X, Loader2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import apiClient from "@/lib/api/client";
import type { StudentBranchTransfer } from "@/lib/types/transfer";

interface FeeStructureOption {
  name: string;
  total_amount: number;
}

interface TransferReviewCardProps {
  transfer: StudentBranchTransfer;
  canRespond: boolean;
  onResponded: () => void;
}

export function TransferReviewCard({ transfer, canRespond, onResponded }: TransferReviewCardProps) {
  const [feeStructures, setFeeStructures] = useState<FeeStructureOption[]>([]);
  const [newFeeStructure, setNewFeeStructure] = useState("");
  const [newInstalments, setNewInstalments] = useState("4");
  const [newPaymentPlan, setNewPaymentPlan] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);

  // Parse plan + instalment count from fee structure name
  // e.g. "SU THP-10th State-Advanced-4" → plan="Advanced", instalments="4"
  const parseFeeStructureName = (name: string) => {
    const parts = name.split("-");
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].trim();
      const planPart = parts[parts.length - 2].trim();
      // Check if last part is a valid instalment count
      if (["1", "4", "6", "8"].includes(lastPart)) {
        setNewInstalments(lastPart);
      }
      // Check if second-to-last part is a valid plan
      if (["Basic", "Intermediate", "Advanced"].includes(planPart)) {
        setNewPaymentPlan(planPart);
      }
    }
  };

  const handleFeeStructureChange = (value: string) => {
    setNewFeeStructure(value);
    if (value) {
      parseFeeStructureName(value);
    }
  };

  // Fetch fee structures for the target branch + program
  useEffect(() => {
    if (!transfer.to_branch || !transfer.program) return;
    const filters = JSON.stringify([
      ["company", "=", transfer.to_branch],
      ["program", "=", transfer.program],
    ]);
    apiClient
      .get(`/resource/Fee Structure?filters=${encodeURIComponent(filters)}&fields=["name","total_amount"]&limit=50`)
      .then(({ data }) => setFeeStructures(data.data || []))
      .catch(() => setFeeStructures([]));
  }, [transfer.to_branch, transfer.program]);

  const selectedFS = feeStructures.find((f) => f.name === newFeeStructure);
  const adjustedAmount = selectedFS
    ? Math.max(0, selectedFS.total_amount - (transfer.amount_already_paid || 0))
    : null;

  const handleRespond = async (action: "accept" | "reject") => {
    if (action === "accept" && !newFeeStructure) {
      setError("Please select a fee structure");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transfer/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transfer_id: transfer.name,
          action,
          new_fee_structure: newFeeStructure,
          new_payment_plan: newPaymentPlan,
          new_no_of_instalments: newInstalments,
          rejection_reason: rejectionReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action} transfer`);
        return;
      }
      onResponded();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!canRespond || transfer.status !== "Pending") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-primary" />
          Review & Respond
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Already paid info */}
        <div className="bg-app-bg rounded-[10px] p-3 space-y-1">
          <p className="text-xs text-text-secondary">Amount already paid at {transfer.from_branch?.replace("Smart Up ", "")}</p>
          <p className="text-lg font-semibold text-text-primary">
            ₹{(transfer.amount_already_paid || 0).toLocaleString("en-IN")}
          </p>
        </div>

        {/* Fee structure selection */}
        <div>
          <label className="block mb-1 text-sm font-medium text-text-primary">New Fee Structure</label>
          <select
            value={newFeeStructure}
            onChange={(e) => handleFeeStructureChange(e.target.value)}
            className="w-full h-10 px-3 rounded-[10px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select fee structure…</option>
            {feeStructures.map((fs) => (
              <option key={fs.name} value={fs.name}>
                {fs.name} — ₹{fs.total_amount.toLocaleString("en-IN")}
              </option>
            ))}
          </select>
        </div>

        {/* Adjusted amount preview */}
        {adjustedAmount !== null && (
          <div className="bg-success-light rounded-[10px] p-3 space-y-1">
            <p className="text-xs text-success">Adjusted amount (after deduction)</p>
            <p className="text-lg font-semibold text-success">
              ₹{adjustedAmount.toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-text-secondary">
              ₹{selectedFS!.total_amount.toLocaleString("en-IN")} − ₹{(transfer.amount_already_paid || 0).toLocaleString("en-IN")}
            </p>
          </div>
        )}

        {/* Instalments */}
        <div>
          <label className="block mb-1 text-sm font-medium text-text-primary">Payment Plan</label>
          <select
            value={newInstalments}
            disabled
            className="w-full h-10 px-3 rounded-[10px] border border-border-input bg-surface text-sm text-text-primary opacity-70 cursor-not-allowed"
          >
            <option value="1">One-Time Payment</option>
            <option value="4">Quarterly (4 Instalments)</option>
            <option value="6">Bi-Monthly (6 Instalments)</option>
            <option value="8">Monthly (8 Instalments)</option>
          </select>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-error">{error}</p>}

        {/* Reject form */}
        {showRejectForm && (
          <div>
            <label className="block mb-1 text-sm font-medium text-text-primary">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-[10px] border border-border-input bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Reason for rejection…"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {!showRejectForm ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectForm(true)}
                disabled={loading}
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleRespond("accept")}
                disabled={loading || !newFeeStructure}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Accept Transfer
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectForm(false)}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRespond("reject")}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Confirm Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
