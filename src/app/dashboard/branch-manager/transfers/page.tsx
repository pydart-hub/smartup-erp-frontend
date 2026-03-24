"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowRightLeft, ArrowDownLeft, ArrowUpRight,
  Search, Loader2, AlertCircle, Eye,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { TransferStatusBadge } from "@/components/transfers/TransferStatusBadge";
import { useAuth } from "@/lib/hooks/useAuth";
import type { StudentBranchTransfer } from "@/lib/types/transfer";

type Direction = "all" | "incoming" | "outgoing";
type StatusFilter = "all" | "Pending" | "Completed" | "Rejected" | "Failed";

const DIRECTION_TABS: { value: Direction; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: ArrowRightLeft },
  { value: "incoming", label: "Incoming", icon: ArrowDownLeft },
  { value: "outgoing", label: "Outgoing", icon: ArrowUpRight },
];

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Completed", label: "Completed" },
  { value: "Rejected", label: "Rejected" },
];

export default function TransfersPage() {
  const { defaultCompany } = useAuth();
  const [direction, setDirection] = useState<Direction>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data: transfers = [], isLoading, error } = useQuery<StudentBranchTransfer[]>({
    queryKey: ["transfers", direction, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (direction !== "all") params.set("direction", direction);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/transfer/list?${params}`);
      if (!res.ok) throw new Error("Failed to fetch transfers");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Client-side filter for search
  const filtered = transfers.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.student_name?.toLowerCase().includes(q) ||
      t.student?.toLowerCase().includes(q) ||
      t.from_branch?.toLowerCase().includes(q) ||
      t.to_branch?.toLowerCase().includes(q)
    );
  });

  const isIncoming = (t: StudentBranchTransfer) => t.to_branch === defaultCompany;

  return (
    <div className="space-y-6 p-1">
      <BreadcrumbNav />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Branch Transfers</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage student transfers between branches
          </p>
        </div>
      </div>

      {/* Direction tabs */}
      <div className="flex gap-2">
        {DIRECTION_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setDirection(tab.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-sm font-medium transition-colors ${
              direction === tab.value
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary hover:bg-app-bg border border-border-light"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <Input
            placeholder="Search student or branch…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? "bg-primary-light text-primary"
                  : "text-text-secondary hover:bg-app-bg"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="p-5 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[10px]" />
            ))}
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-error mx-auto mb-2" />
            <p className="text-text-secondary">Failed to load transfers</p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ArrowRightLeft className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
            <p className="text-text-secondary">No transfers found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light bg-app-bg/50">
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Student</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">From</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">To</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((t) => (
                    <motion.tr
                      key={t.name}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border-b border-border-light hover:bg-app-bg/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-text-primary">{t.student_name}</p>
                            {t.custom_disabilities && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{t.custom_disabilities}</span>
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary">{t.student} · {t.program}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-text-secondary">
                        {t.from_branch?.replace("Smart Up ", "")}
                      </td>
                      <td className="px-5 py-3 text-sm text-text-secondary">
                        {t.to_branch?.replace("Smart Up ", "")}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <TransferStatusBadge status={t.status} />
                          {t.status === "Pending" && isIncoming(t) && (
                            <span className="text-xs text-primary font-medium">Action needed</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-text-tertiary">
                        {t.request_date || t.creation?.split(" ")[0]}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/dashboard/branch-manager/transfers/${t.name}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                            {t.status === "Pending" && isIncoming(t) ? "Review" : "View"}
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
