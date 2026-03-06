"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Search, CheckCircle2, XCircle, Clock, Loader2,
  AlertCircle, IndianRupee,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getExpenseClaims,
  approveExpenseClaim,
  rejectExpenseClaim,
  type ExpenseClaim,
} from "@/lib/api/hr";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { toast } from "sonner";

const APPROVAL_TABS = ["Draft", "Approved", "Rejected", "All"] as const;
type ApprovalTab = (typeof APPROVAL_TABS)[number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HRExpenseClaimsPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [approvalTab, setApprovalTab] = useState<ApprovalTab>("Draft");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: claimsRes, isLoading } = useQuery({
    queryKey: ["hr-expense-claims", defaultCompany, approvalTab],
    queryFn: () =>
      getExpenseClaims({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        ...(approvalTab !== "All" ? { approval_status: approvalTab } : {}),
        limit_page_length: 200,
      }),
    staleTime: 30_000,
  });

  const allClaims = claimsRes?.data ?? [];
  const filtered = useMemo(() => {
    if (!debouncedSearch) return allClaims;
    const q = debouncedSearch.toLowerCase();
    return allClaims.filter(
      (c) =>
        c.employee_name.toLowerCase().includes(q) ||
        c.employee.toLowerCase().includes(q) ||
        (c.department ?? "").toLowerCase().includes(q)
    );
  }, [allClaims, debouncedSearch]);

  // Counts & totals
  const draftCount = allClaims.filter((c) => c.approval_status === "Draft").length;
  const approvedCount = allClaims.filter((c) => c.approval_status === "Approved").length;
  const totalClaimed = allClaims.reduce((s, c) => s + c.total_claimed_amount, 0);
  const totalSanctioned = allClaims.reduce((s, c) => s + c.total_sanctioned_amount, 0);

  // Mutations
  const approveMutation = useMutation({
    mutationFn: approveExpenseClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["hr-pending-expenses"] });
      toast.success("Expense claim approved");
    },
    onError: () => toast.error("Failed to approve expense claim"),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectExpenseClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-expense-claims"] });
      queryClient.invalidateQueries({ queryKey: ["hr-pending-expenses"] });
      toast.success("Expense claim rejected");
    },
    onError: () => toast.error("Failed to reject expense claim"),
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary">Expense Claims</h1>
        <p className="text-text-secondary text-sm mt-0.5">
          Review and manage employee expense claims
        </p>
      </motion.div>

      {/* Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{draftCount}</p>
            <p className="text-xs text-text-tertiary">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{approvedCount}</p>
            <p className="text-xs text-text-tertiary">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalClaimed)}</p>
            <p className="text-xs text-text-tertiary">Total Claimed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <IndianRupee className="h-5 w-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalSanctioned)}</p>
            <p className="text-xs text-text-tertiary">Total Sanctioned</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search expense claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 bg-surface border border-border-light rounded-[10px] p-1">
          {APPROVAL_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setApprovalTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all ${
                approvalTab === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-app-bg"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Expense Claims List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <Receipt className="h-10 w-10 text-text-tertiary" />
            <p className="text-text-secondary">No expense claims found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((claim) => (
            <motion.div key={claim.name} variants={itemVariants}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Left: Employee Info */}
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {claim.employee_name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {claim.department ?? claim.employee}
                        </p>
                      </div>
                    </div>

                    {/* Center: Claim Details */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-text-tertiary">Date</span>
                        <p className="font-medium text-text-primary">
                          {formatDate(claim.posting_date)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Claimed</span>
                        <p className="font-medium text-text-primary">
                          {formatCurrency(claim.total_claimed_amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Sanctioned</span>
                        <p className="font-medium text-text-primary">
                          {formatCurrency(claim.total_sanctioned_amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Reimbursed</span>
                        <p className="font-medium text-text-primary">
                          {formatCurrency(claim.total_amount_reimbursed)}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status + Actions */}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Badge
                        variant={
                          claim.approval_status === "Approved"
                            ? "success"
                            : claim.approval_status === "Rejected"
                              ? "error"
                              : "warning"
                        }
                      >
                        {claim.approval_status}
                      </Badge>
                      {claim.status !== "Cancelled" && (
                        <Badge
                          variant={
                            claim.status === "Paid"
                              ? "success"
                              : claim.status === "Unpaid"
                                ? "warning"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {claim.status}
                        </Badge>
                      )}
                      {claim.approval_status === "Draft" && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveMutation.mutate(claim.name)}
                            disabled={approveMutation.isPending}
                            className="text-success border-success/30 hover:bg-success/10"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectMutation.mutate(claim.name)}
                            disabled={rejectMutation.isPending}
                            className="text-error border-error/30 hover:bg-error/10"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
