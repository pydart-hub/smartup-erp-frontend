"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  UserPlus,
  ClipboardList,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
    },
  },
};

export default function BranchManagerAdmissionsHubPage() {
  const admissionSystems = [
    {
      id: "new-admission",
      title: "1. New Student Admission",
      badge: "Direct Enrollment",
      description:
        "Enroll new students into complete academic programs, subject tuitions, sibling discounts, demo trials, or 1-on-1 tutoring.",
      href: "/dashboard/branch-manager/admissions/new",
      icon: UserPlus,
      color: "from-[#673AB7] to-[#512DA8]",
      border: "border-purple-200/70 dark:border-purple-800/70",
      badgeColor: "bg-purple-50 dark:bg-purple-950/80 text-[#673AB7] dark:text-purple-300 border-purple-200 dark:border-purple-800",
      actionText: "Start New Admission",
      features: ["Program & Subject Tuition", "Demo & Sibling Discounts", "Instant Student Creation"],
    },
    {
      id: "sales-admission",
      title: "2. Sales Admission Entries",
      badge: "Frappe ERP Logged",
      description:
        "View, record, and verify student admission entries logged by sales representatives directly via Frappe Cloud ERP.",
      href: "/dashboard/branch-manager/admissions/sales-entries",
      icon: ClipboardList,
      color: "from-[#673AB7] to-[#512DA8]",
      border: "border-purple-200/70 dark:border-purple-800/70",
      badgeColor: "bg-purple-50 dark:bg-purple-950/80 text-[#673AB7] dark:text-purple-300 border-purple-200 dark:border-purple-800",
      actionText: "View Sales Admissions",
      features: ["Frappe DocType Verified", "Real-Time Sales Sync", "Executive Sales Log"],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 selection:bg-[#673AB7] selection:text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
        <BreadcrumbNav />

        {/* 3D Spatial Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mt-3 mb-6 relative rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-purple-500/10 dark:from-purple-950/40 dark:via-slate-900/60 dark:to-purple-950/40 border border-purple-200/50 dark:border-purple-800/50 backdrop-blur-xl p-4 sm:p-5 shadow-[0_10px_25px_rgba(103,58,183,0.05)] dark:shadow-[0_15px_30px_rgba(0,0,0,0.4)] overflow-hidden border-t-2 border-t-white dark:border-t-slate-800"
        >
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-[#673AB7]/10 dark:bg-[#673AB7]/20 blur-2xl pointer-events-none animate-pulse" />

          <div className="space-y-1 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/90 dark:bg-slate-900/90 border border-purple-200/80 dark:border-purple-800/80 text-[11px] font-semibold text-[#673AB7] dark:text-purple-300 shadow-xs">
              <Sparkles className="h-3 w-3 text-[#673AB7] dark:text-purple-400" />
              <span>Admission Command Hub</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Admissions Command Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-2xl">
              Choose an admission workflow below to start a new student enrollment or manage sales admission entries.
            </p>
          </div>
        </motion.div>

        {/* 2 Spatial 3D Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8"
          style={{ perspective: 1200 }}
        >
          {admissionSystems.map((system) => {
            const Icon = system.icon;
            return (
              <motion.div
                key={system.id}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  rotateX: 2,
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 300, damping: 20 },
                }}
                whileTap={{ scale: 0.98 }}
                className="h-full"
              >
                <Link href={system.href} className="block h-full group">
                  <div
                    className={`h-full rounded-2xl bg-white/90 dark:bg-slate-900/90 border ${system.border} backdrop-blur-2xl p-5 sm:p-6 shadow-[0_12px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_45px_rgba(0,0,0,0.5)] group-hover:shadow-[0_20px_45px_rgba(103,58,183,0.15)] dark:group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.7)] transition-all duration-300 flex flex-col justify-between overflow-hidden relative border-t-2 border-t-white dark:border-t-slate-800`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 dark:via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    <div>
                      {/* Top Bar: Icon + Badge */}
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <motion.div
                          animate={{ y: [0, -2, 0] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                          className={`p-2.5 rounded-xl bg-gradient-to-r ${system.color} text-white shadow-md group-hover:scale-110 transition-transform duration-200`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </motion.div>
                        <span
                          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${system.badgeColor}`}
                        >
                          {system.badge}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-[#673AB7] dark:group-hover:text-purple-300 transition-colors mb-2">
                        {system.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5 font-normal">
                        {system.description}
                      </p>

                      {/* Features List */}
                      <div className="space-y-2 mb-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                        {system.features.map((feat) => (
                          <div
                            key={feat}
                            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-[#673AB7] dark:text-purple-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <div
                        className="w-full inline-flex items-center justify-between px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/90 group-hover:bg-gradient-to-r group-hover:from-[#673AB7] group-hover:to-[#512DA8] text-slate-700 dark:text-slate-200 group-hover:text-white font-semibold text-xs transition-all duration-300 shadow-xs"
                      >
                        <span>{system.actionText}</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
