"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  UserPlus,
  IndianRupee,
  Search,
  Building2,
  Calendar,
  Phone,
  Mail,
  User,
  CreditCard,
  FileText,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import {
  getDrilldownStudents,
  getDrilldownPayments,
  type DrilldownStudent,
  type DrilldownPayment,
} from "@/lib/api/branchMonitoring";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";

interface BranchDrilldownDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  branch: string;
  branchShort: string;
  monthKey: string;
  monthLabel: string;
  initialTab?: "admissions" | "collection";
}

export function BranchDrilldownDrawer({
  isOpen,
  onClose,
  branch,
  branchShort,
  monthKey,
  monthLabel,
  initialTab = "admissions",
}: BranchDrilldownDrawerProps) {
  const [activeTab, setActiveTab] = useState<"admissions" | "collection">(initialTab);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch student drilldown
  const {
    data: studentData,
    isLoading: loadingStudents,
    isError: studentError,
  } = useQuery({
    queryKey: ["branch-monitoring-drilldown-students", branch, monthKey],
    queryFn: () => getDrilldownStudents(branch, monthKey),
    enabled: isOpen && activeTab === "admissions",
    staleTime: 60_000,
  });

  // Fetch payment drilldown
  const {
    data: paymentData,
    isLoading: loadingPayments,
    isError: paymentError,
  } = useQuery({
    queryKey: ["branch-monitoring-drilldown-payments", branch, monthKey],
    queryFn: () => getDrilldownPayments(branch, monthKey),
    enabled: isOpen && activeTab === "collection",
    staleTime: 60_000,
  });

  if (!isOpen) return null;

  const students = studentData?.data || [];
  const payments = paymentData?.data || [];

  const filteredStudents = students.filter((s) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.student_name?.toLowerCase().includes(term) ||
      s.name?.toLowerCase().includes(term) ||
      s.custom_parent_name?.toLowerCase().includes(term) ||
      s.student_mobile_number?.includes(term)
    );
  });

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.name?.toLowerCase().includes(term) ||
      p.party_name?.toLowerCase().includes(term) ||
      p.mode_of_payment?.toLowerCase().includes(term) ||
      p.reference_no?.toLowerCase().includes(term)
    );
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Drawer Container */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="w-screen max-w-2xl bg-surface border-l border-border-light shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border-light bg-surface-raised flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                    {branchShort} Drilldown
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {monthLabel}
                    </span>
                  </h3>
                  <p className="text-xs text-text-tertiary">
                    Inspect admitted students and collection vouchers
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-app-bg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tab switch + search */}
            <div className="p-4 bg-app-bg border-b border-border-light space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setActiveTab("admissions");
                      setSearchTerm("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "admissions"
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Admissions ({loadingStudents ? "..." : students.length})
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("collection");
                      setSearchTerm("");
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "collection"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-text-secondary hover:text-text-primary hover:bg-surface"
                    }`}
                  >
                    <IndianRupee className="h-3.5 w-3.5" />
                    Collections (
                    {loadingPayments
                      ? "..."
                      : formatCurrency(paymentData?.total_amount || 0)}
                    )
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-tertiary" />
                <input
                  type="text"
                  placeholder={
                    activeTab === "admissions"
                      ? "Search students by name, SRR ID, phone..."
                      : "Search vouchers by ID, party name, mode..."
                  }
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg bg-surface border border-border-light text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {activeTab === "admissions" ? (
                loadingStudents ? (
                  <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
                    <Loader2 className="h-7 w-7 animate-spin mb-2" />
                    <p className="text-xs">Loading monthly admissions...</p>
                  </div>
                ) : studentError ? (
                  <div className="flex items-center justify-center py-20 text-error text-xs gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Failed to load admissions.
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-20 text-text-tertiary text-xs">
                    No admissions found for {monthLabel}
                    {searchTerm ? " matching your search" : ""}.
                  </div>
                ) : (
                  filteredStudents.map((s) => (
                    <div
                      key={s.name}
                      className="p-3 rounded-xl border border-border-light bg-surface hover:border-blue-400/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-text-primary">
                            {s.student_name}
                          </p>
                          <p className="text-[11px] font-mono text-text-tertiary mt-0.5">
                            {s.name}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            s.enabled === 1
                              ? "bg-emerald-500/10 text-emerald-600"
                              : "bg-red-500/10 text-red-600"
                          }`}
                        >
                          {s.enabled === 1 ? "Active" : "Discontinued"}
                        </span>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-border-light/60 grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-text-tertiary" />
                          <span>Joined: {formatDate(s.joining_date)}</span>
                        </div>
                        {s.student_mobile_number && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 text-text-tertiary" />
                            <span>{s.student_mobile_number}</span>
                          </div>
                        )}
                        {s.custom_parent_name && (
                          <div className="flex items-center gap-1.5 col-span-2">
                            <User className="h-3 w-3 text-text-tertiary" />
                            <span>Parent: {s.custom_parent_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )
              ) : loadingPayments ? (
                <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
                  <Loader2 className="h-7 w-7 animate-spin mb-2" />
                  <p className="text-xs">Loading monthly collection entries...</p>
                </div>
              ) : paymentError ? (
                <div className="flex items-center justify-center py-20 text-error text-xs gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Failed to load collection records.
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-20 text-text-tertiary text-xs">
                  No collection entries found for {monthLabel}
                  {searchTerm ? " matching your search" : ""}.
                </div>
              ) : (
                filteredPayments.map((p) => (
                  <div
                    key={p.name}
                    className="p-3 rounded-xl border border-border-light bg-surface hover:border-emerald-400/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-text-primary">
                          {p.party_name || "Student"}
                        </p>
                        <p className="text-[11px] font-mono text-text-tertiary mt-0.5">
                          {p.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-600">
                          {formatCurrency(p.paid_amount)}
                        </p>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-app-bg border border-border-light text-text-secondary">
                          {p.mode_of_payment || "Payment"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-border-light/60 flex items-center justify-between text-[11px] text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-text-tertiary" />
                        <span>Date: {formatDate(p.posting_date)}</span>
                      </div>
                      {p.reference_no && (
                        <span className="text-[10px] text-text-tertiary font-mono truncate max-w-[200px]">
                          Ref: {p.reference_no}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
