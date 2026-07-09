"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, Search, Plus, Calendar, Users, ChevronRight, Clock } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

type Status = "All" | "Active" | "Expired" | "Draft";
const STATUSES: Status[] = ["All", "Active", "Expired", "Draft"];
const CLASS_LEVELS = ["All", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

const STATUS_STYLES: Record<string, string> = {
  Active: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
  Expired: "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30",
  Draft: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30",
};

// Placeholder data — replace with Frappe API fetch
const SAMPLE_ASSIGNMENTS = [
  { id: "A001", title: "Chapter 3: Quadratic Equations — Problem Set", classLevel: "Class 10", subject: "Mathematics", dueDate: "2026-07-15", assignedBatches: 3, status: "Active" },
  { id: "A002", title: "Newton's Laws — Worksheet", classLevel: "Class 11", subject: "Physics", dueDate: "2026-07-10", assignedBatches: 2, status: "Expired" },
  { id: "A003", title: "Organic Chemistry Summary Notes", classLevel: "Class 12", subject: "Chemistry", dueDate: "2026-07-20", assignedBatches: 4, status: "Draft" },
];

export default function AssignmentsPage() {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<Status>("All");
  const [selectedClass, setSelectedClass] = useState("All");

  const filtered = SAMPLE_ASSIGNMENTS.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === "All" || a.status === selectedStatus;
    const matchClass = selectedClass === "All" || a.classLevel === selectedClass;
    return matchSearch && matchStatus && matchClass;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-500" />
            Assignments
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage all student assignments across classes
          </p>
        </div>
        <Link href="/dashboard/content-admin/assignments/create">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Assignment
          </motion.button>
        </Link>
      </motion.div>

      {/* Status Tabs */}
      <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedStatus === s
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] hover:border-blue-300"
            }`}
          >
            {s}
          </button>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
          />
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
        </select>
      </motion.div>

      {/* List */}
      {filtered.length === 0 ? (
        <motion.div variants={itemVariants} className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <ClipboardCheck className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">No assignments found</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Try adjusting filters or create a new assignment</p>
          <Link href="/dashboard/content-admin/assignments/create" className="mt-4 text-sm text-blue-500 hover:underline font-medium">
            + Create Assignment
          </Link>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="space-y-3">
          {filtered.map((assignment, idx) => (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.3 }}
              whileHover={{ x: 3 }}
              className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mt-0.5">
                    <ClipboardCheck className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{assignment.title}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-slate-500 dark:text-slate-400">{assignment.subject}</span>
                      <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{assignment.classLevel}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Clock className="h-3 w-3" /> Due {assignment.dueDate}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                        <Users className="h-3 w-3" /> {assignment.assignedBatches} batches
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[assignment.status]}`}>
                    {assignment.status}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
