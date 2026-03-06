"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, Search, CheckCircle2, XCircle, Clock, Filter,
  Loader2, AlertCircle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getLeaveApplications,
  approveLeaveApplication,
  rejectLeaveApplication,
  type LeaveApplication,
} from "@/lib/api/hr";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { formatDate } from "@/lib/utils/formatters";
import { toast } from "sonner";

const STATUS_TABS = ["Open", "Approved", "Rejected", "All"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HRLeavesPage() {
  const { defaultCompany } = useAuth();
  const queryClient = useQueryClient();
  const [statusTab, setStatusTab] = useState<StatusTab>("Open");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: leavesRes, isLoading } = useQuery({
    queryKey: ["hr-leaves", defaultCompany, statusTab],
    queryFn: () =>
      getLeaveApplications({
        ...(defaultCompany ? { company: defaultCompany } : {}),
        ...(statusTab !== "All" ? { status: statusTab } : {}),
        limit_page_length: 200,
      }),
    staleTime: 30_000,
  });

  const allLeaves = leavesRes?.data ?? [];
  const filtered = useMemo(() => {
    if (!debouncedSearch) return allLeaves;
    const q = debouncedSearch.toLowerCase();
    return allLeaves.filter(
      (l) =>
        l.employee_name.toLowerCase().includes(q) ||
        l.leave_type.toLowerCase().includes(q) ||
        l.employee.toLowerCase().includes(q)
    );
  }, [allLeaves, debouncedSearch]);

  // Counts
  const openCount = allLeaves.filter((l) => l.status === "Open").length;
  const approvedCount = allLeaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = allLeaves.filter((l) => l.status === "Rejected").length;

  // Mutations
  const approveMutation = useMutation({
    mutationFn: approveLeaveApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["hr-open-leaves"] });
      toast.success("Leave approved");
    },
    onError: () => toast.error("Failed to approve leave"),
  });

  const rejectMutation = useMutation({
    mutationFn: rejectLeaveApplication,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hr-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["hr-open-leaves"] });
      toast.success("Leave rejected");
    },
    onError: () => toast.error("Failed to reject leave"),
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Leave Management</h1>
            <p className="text-text-secondary text-sm mt-0.5">
              Review and manage employee leave applications
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{openCount}</p>
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
            <XCircle className="h-5 w-5 text-error mx-auto mb-2" />
            <p className="text-2xl font-bold text-text-primary">{rejectedCount}</p>
            <p className="text-xs text-text-tertiary">Rejected</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search by employee or leave type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 bg-surface border border-border-light rounded-[10px] p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all ${
                statusTab === tab
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary hover:bg-app-bg"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Leave Applications List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin h-6 w-6 text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <CalendarDays className="h-10 w-10 text-text-tertiary" />
            <p className="text-text-secondary">No leave applications found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((leave) => (
            <motion.div key={leave.name} variants={itemVariants}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Left: Employee Info */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      <div className="w-10 h-10 rounded-full bg-brand-wash flex items-center justify-center">
                        <CalendarDays className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">
                          {leave.employee_name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {leave.department ?? leave.employee}
                        </p>
                      </div>
                    </div>

                    {/* Center: Leave Details */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-text-tertiary">Type</span>
                        <p className="font-medium text-text-primary">{leave.leave_type}</p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">From</span>
                        <p className="font-medium text-text-primary">
                          {formatDate(leave.from_date)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">To</span>
                        <p className="font-medium text-text-primary">
                          {formatDate(leave.to_date)}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-tertiary">Days</span>
                        <p className="font-medium text-text-primary">
                          {leave.total_leave_days}
                        </p>
                      </div>
                    </div>

                    {/* Right: Status + Actions */}
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Badge
                        variant={
                          leave.status === "Approved"
                            ? "success"
                            : leave.status === "Rejected"
                              ? "error"
                              : "warning"
                        }
                      >
                        {leave.status}
                      </Badge>
                      {leave.status === "Open" && (
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveMutation.mutate(leave.name)}
                            disabled={approveMutation.isPending}
                            className="text-success border-success/30 hover:bg-success/10"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectMutation.mutate(leave.name)}
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

                  {/* Description */}
                  {leave.description && (
                    <p className="text-xs text-text-tertiary mt-3 pl-[52px]">
                      {leave.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
