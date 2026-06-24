"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Building2,
  ChevronRight,
  AlertCircle,
  CalendarDays,
  LayoutGrid,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { getAllBranches, getScheduleCountForBranch } from "@/lib/api/director";

/* ─── Ambient orbs (use CSS vars so they shift with theme) ────────── */
function Backdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-app-bg">
      <motion.div
        className="absolute -top-48 -left-48 w-[680px] h-[680px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(103,58,183,0.08) 0%, transparent 70%)" }}
        animate={{ x: [0, 48, 0], y: [0, 32, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 -right-56 w-[560px] h-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(130,195,91,0.06) 0%, transparent 70%)" }}
        animate={{ x: [0, -36, 0], y: [0, -48, 0] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

/* ─── Branch card ─────────────────────────────────────────────────── */
function BranchCard({ branch, index }: { branch: { name: string; abbr: string }; index: number }) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["director-branch-schedule-count", branch.name],
    queryFn: () => getScheduleCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), { stiffness: 340, damping: 34 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), { stiffness: 340, damping: 34 });
  const glowX   = useSpring(useTransform(mx, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });
  const glowY   = useSpring(useTransform(my, [-0.5, 0.5], [5, 95]), { stiffness: 180, damping: 22 });

  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function handleMouseLeave() { mx.set(0); my.set(0); }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
    >
      <Link href={`/dashboard/director/branches/${encodeURIComponent(branch.name)}/course-schedule`}>
        <motion.div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          whileHover={{ scale: 1.02, y: -2 }}
          transition={{ duration: 0.2 }}
          /* bg-surface = #fff light / #111827 dark — auto-adapts */
          className="relative overflow-hidden rounded-xl cursor-pointer group bg-surface border border-border-light shadow-card hover:shadow-card-hover transition-shadow duration-200"
        >
          {/* Cursor shimmer — low opacity, works on both modes */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: useTransform(
                [glowX, glowY],
                ([gx, gy]) =>
                  `radial-gradient(280px circle at ${gx}% ${gy}%, rgba(103,58,183,0.07), transparent 65%)`
              ),
            }}
          />

          {/* Left accent stripe — brand gradient, same in both modes */}
          <div
            className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
            style={{ background: "linear-gradient(180deg, #673AB7 0%, #7E57C2 100%)" }}
          />

          <div className="relative flex items-center gap-3 px-4 py-3">

            {/* Icon — bg-primary-light = #E0F5F2 light / #0F2624 dark */}
            <motion.div
              className="relative w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary-light border border-primary/20"
              style={{ transformStyle: "preserve-3d" }}
              whileHover={{ rotateY: 18, rotateX: -10, scale: 1.08 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <Building2 className="h-4 w-4 text-primary" />
            </motion.div>

            {/* Branch name + abbr */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-text-primary leading-snug truncate">
                {shortName}
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5 inline-block bg-brand-wash text-primary border border-primary/20">
                {branch.abbr}
              </span>
            </div>

            {/* Schedule count */}
            <div className="text-right shrink-0">
              {isLoading ? (
                <div className="w-9 h-5 rounded animate-pulse bg-primary-light ml-auto" />
              ) : (
                <motion.p
                  key={count}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18 }}
                  className="text-[22px] font-black leading-none tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #673AB7 0%, #7E57C2 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {count ?? 0}
                </motion.p>
              )}
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-text-tertiary mt-0.5">
                schedules
              </p>
            </div>

            {/* Arrow */}
            <motion.div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-primary-light border border-primary/20"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight className="h-3 w-3 text-primary" />
            </motion.div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function DirectorCourseSchedulePage() {
  const { data: branches, isLoading, isError } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const [search, setSearch] = useState("");
  const activeBranches = (branches ?? []).filter((b) => b.name !== "Smart Up");
  const filtered = search
    ? activeBranches.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : activeBranches;

  return (
    <>
      <Backdrop />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-4 pb-8"
      >
        <BreadcrumbNav />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-3"
        >
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
            style={{
              background: "linear-gradient(135deg, #673AB7 0%, #7E57C2 100%)",
              boxShadow: "0 4px 12px rgba(103,58,183,0.30)",
            }}
            animate={{ rotateY: [0, 14, 0, -14, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          >
            <CalendarDays className="h-4 w-4 text-white" />
          </motion.div>

          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight">
              Course Schedule
            </h1>
            <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
              <LayoutGrid className="h-3 w-3 text-primary" />
              {isLoading ? "Loading…" : `${activeBranches.length} branches`}
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="max-w-xs"
        >
          {/* bg-surface + border-border-input auto-adapts to dark */}
          <div className="relative flex items-center rounded-xl bg-surface border border-border-input shadow-sm overflow-hidden">
            <Search className="absolute left-3 h-3.5 w-3.5 text-primary pointer-events-none" />
            <input
              type="text"
              placeholder="Search branches…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-transparent text-sm text-text-primary placeholder-text-tertiary outline-none focus:ring-0"
            />
          </div>
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <GifLoader />
        ) : isError ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-48 gap-3"
          >
            <div className="w-12 h-12 rounded-xl bg-error-light flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-error" />
            </div>
            <p className="text-sm font-medium text-error">Failed to load branches</p>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 gap-2"
          >
            <Building2 className="h-8 w-8 text-primary opacity-30" />
            <p className="text-sm text-text-tertiary">No branches found</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filtered.map((branch, i) => (
              <BranchCard key={branch.name} branch={branch} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
}
