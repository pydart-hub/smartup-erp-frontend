"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Building2,
  Users,
  BookOpen,
  ChevronRight,
  Filter,
  UserCheck,
  TrendingUp,
  Sparkles,
  ArrowLeft,
  Briefcase,
  GraduationCap,
  Layers,
} from "lucide-react";
import { motion } from "framer-motion";
import { getAllBranches, getBranchInstructors, getInstructorCountForBranch } from "@/lib/api/director";
import { Badge } from "@/components/ui/Badge";
import { TeacherProfileView } from "./TeacherProfileView";

// Distinct accent colors for branch cards
const BRANCH_PALETTES = [
  { border: "hover:border-violet-400/60", bgIcon: "bg-violet-500/10 text-violet-600 dark:text-violet-400", badge: "bg-violet-500/10 text-violet-600 dark:text-violet-300" },
  { border: "hover:border-teal-400/60",   bgIcon: "bg-teal-500/10 text-teal-600 dark:text-teal-400",     badge: "bg-teal-500/10 text-teal-600 dark:text-teal-300" },
  { border: "hover:border-blue-400/60",   bgIcon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",     badge: "bg-blue-500/10 text-blue-600 dark:text-blue-300" },
  { border: "hover:border-amber-400/60",  bgIcon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",   badge: "bg-amber-500/10 text-amber-600 dark:text-amber-300" },
  { border: "hover:border-rose-400/60",   bgIcon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",     badge: "bg-rose-500/10 text-rose-600 dark:text-rose-300" },
  { border: "hover:border-emerald-400/60",bgIcon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
  { border: "hover:border-cyan-400/60",   bgIcon: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",     badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300" },
  { border: "hover:border-orange-400/60", bgIcon: "bg-orange-500/10 text-orange-600 dark:text-orange-400", badge: "bg-orange-500/10 text-orange-600 dark:text-orange-300" },
  { border: "hover:border-indigo-400/60", bgIcon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400", badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
];

function CompactBranchCard({
  branch,
  index,
  onSelect,
}: {
  branch: { name: string; abbr: string };
  index: number;
  onSelect: (branchName: string) => void;
}) {
  const { data: count, isLoading } = useQuery({
    queryKey: ["director-branch-instructors", branch.name],
    queryFn: () => getInstructorCountForBranch(branch.name),
    staleTime: 120_000,
  });

  const palette = BRANCH_PALETTES[index % BRANCH_PALETTES.length];
  const shortName = branch.name.replace("Smart Up ", "").replace("Smart Up", "HQ");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.25, ease: "easeOut" }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(branch.name)}
      className={`group relative bg-surface border border-border-light ${palette.border} rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex items-center justify-between gap-3`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-lg ${palette.bgIcon} flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform`}>
          <Building2 className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-text-primary group-hover:text-primary transition-colors truncate">
              {shortName}
            </h3>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-app-bg text-text-tertiary shrink-0">
              {branch.abbr}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isLoading ? (
              <span className="inline-block w-6 h-4 rounded bg-app-bg animate-pulse" />
            ) : (
              <span className="text-xs font-bold text-text-primary tabular-nums">
                {count ?? 0}
              </span>
            )}
            <span className="text-[11px] text-text-tertiary">
              faculty
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-app-bg group-hover:bg-primary group-hover:text-white text-text-tertiary flex items-center justify-center transition-all">
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </motion.div>
  );
}

export function TeacherDirectory() {
  // Drilldown state: null = Level 1 (Branch List), string = Level 2 (Selected Branch Faculty)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");

  // Level 2 filters
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("All");
  const [activeTeacherId, setActiveTeacherId] = useState<string | null>(null);

  // 1. Fetch Branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["director-branches"],
    queryFn: getAllBranches,
    staleTime: 300_000,
  });

  const activeBranches = branches.filter((b) => b.name !== "Smart Up");
  const filteredBranches = useMemo(() => {
    return activeBranches.filter((b) =>
      b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
      b.abbr.toLowerCase().includes(branchSearch.toLowerCase())
    );
  }, [activeBranches, branchSearch]);

  // 2. Fetch instructors for the selected branch (Level 2)
  const {
    data: branchTeachers = [],
    isLoading: teachersLoading,
  } = useQuery({
    queryKey: ["director-branch-faculty-list", selectedBranch],
    queryFn: async () => {
      if (!selectedBranch) return [];
      const list = await getBranchInstructors(selectedBranch);
      return list.map((item) => ({ ...item, branch: selectedBranch }));
    },
    enabled: !!selectedBranch,
    staleTime: 120_000,
  });

  // Extract distinct subjects for this branch
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    branchTeachers.forEach((t) => {
      t.subjects?.forEach((s: string) => set.add(s));
    });
    return Array.from(set).sort();
  }, [branchTeachers]);

  // Filter teachers by search and subject
  const filteredTeachers = useMemo(() => {
    return branchTeachers.filter((t) => {
      const nameMatch =
        (t.instructor_name || t.name).toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.employee || "").toLowerCase().includes(teacherSearch.toLowerCase()) ||
        (t.designation || "").toLowerCase().includes(teacherSearch.toLowerCase());

      const subjectMatch =
        selectedSubject === "All" ||
        (t.subjects && t.subjects.includes(selectedSubject));

      return nameMatch && subjectMatch;
    });
  }, [branchTeachers, teacherSearch, selectedSubject]);

  // ── LEVEL 1: BRANCHES OVERVIEW ──────────────────────────────────────────────
  if (!selectedBranch) {
    return (
      <div className="space-y-4">
        {/* Branch Filter & Header */}
        <div className="bg-surface border border-border-light rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-text-primary">Select a Branch</h2>
              <p className="text-[11px] text-text-tertiary">
                Choose a location to drill down into its teaching faculty and metrics.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search branch or code..."
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-light bg-app-bg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Compact Branches 3x3 Grid */}
        {branchesLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-20 bg-surface border border-border-light rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
            <h3 className="text-xs font-bold text-text-primary">No branches match your search</h3>
            <p className="text-[11px] mt-0.5">Try another keyword or clear the search field.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBranches.map((b, idx) => (
              <CompactBranchCard
                key={b.name}
                branch={b}
                index={idx}
                onSelect={(br) => {
                  setSelectedBranch(br);
                  setTeacherSearch("");
                  setSelectedSubject("All");
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── LEVEL 3: DEDICATED FULL-PAGE TEACHER PROFILE VIEW ────────────────────────
  if (activeTeacherId) {
    return (
      <TeacherProfileView
        instructorId={activeTeacherId}
        onBack={() => setActiveTeacherId(null)}
      />
    );
  }

  // ── LEVEL 2: SELECTED BRANCH TEACHER DIRECTORY ──────────────────────────────
  const shortSelectedName = selectedBranch.replace("Smart Up ", "").replace("Smart Up", "HQ");

  return (
    <div className="space-y-4">
      {/* Back button & Branch Drilldown Header */}
      <div className="bg-surface border border-border-light rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setSelectedBranch(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border-light bg-app-bg text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:border-primary transition-all shrink-0"
            >
              <ArrowLeft className="w-3 h-3" /> Branches
            </button>
            <div className="h-3.5 w-px bg-border-light" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">{shortSelectedName} Branch</h2>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-brand-wash text-primary border-primary/20">
                  {branchTeachers.length} Faculty
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick branch switcher dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-text-tertiary">Switch Branch:</span>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setTeacherSearch("");
                setSelectedSubject("All");
              }}
              className="px-2.5 py-1 rounded-lg text-xs bg-app-bg border border-border-light text-text-primary focus:outline-none focus:border-primary"
            >
              {activeBranches.map((b) => (
                <option key={b.name} value={b.name}>
                  {b.name.replace("Smart Up ", "")} ({b.abbr})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search & Subject filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border-light">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder={`Search faculty in ${shortSelectedName}...`}
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border-light bg-app-bg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
            <span className="text-[11px] text-text-tertiary flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3 text-primary" /> Subject:
            </span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1 rounded-lg text-xs bg-app-bg border border-border-light text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="All">All Subjects ({branchTeachers.length})</option>
              {availableSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Faculty Cards 3-Column Grid */}
      {teachersLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-surface border border-border-light rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-surface border border-border-light rounded-xl p-8 text-center text-text-tertiary">
          <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-primary" />
          <h3 className="text-xs font-bold text-text-primary">No teachers found in this branch</h3>
          <p className="text-[11px] mt-0.5 max-w-sm mx-auto">
            Try adjusting your search terms or subject filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredTeachers.map((teacher, idx) => {
            const displayName = teacher.instructor_name || teacher.name;

            return (
              <motion.div
                key={teacher.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02, duration: 0.2 }}
                onClick={() => setActiveTeacherId(teacher.name)}
                className="group relative bg-surface border border-border-light hover:border-primary/40 rounded-xl p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Avatar & Designation */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-primary/10 to-indigo-500/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs group-hover:scale-105 group-hover:bg-primary group-hover:text-white transition-all shadow-sm shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-text-primary group-hover:text-primary transition-colors truncate">
                          {displayName}
                        </h3>
                        <p className="text-[10px] text-text-tertiary truncate">
                          {teacher.designation || "Instructor"}
                        </p>
                      </div>
                    </div>

                    <div className="w-6 h-6 rounded-md bg-app-bg group-hover:bg-primary group-hover:text-white text-text-tertiary flex items-center justify-center transition-all shrink-0">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* ID */}
                  {teacher.employee && (
                    <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-mono mt-2">
                      <Briefcase className="w-3 h-3 text-text-secondary" /> {teacher.employee}
                    </div>
                  )}

                  {/* Subject Badges */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {teacher.subjects && teacher.subjects.length > 0 ? (
                      teacher.subjects.slice(0, 2).map((sub: string) => (
                        <span
                          key={sub}
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-wash text-primary border border-primary/10"
                        >
                          {sub}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-text-tertiary italic">
                        General Curriculum
                      </span>
                    )}
                    {teacher.subjects && teacher.subjects.length > 2 && (
                      <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-app-bg text-text-tertiary">
                        +{teacher.subjects.length - 2}
                      </span>
                    )}
                  </div>
                </div>

                {/* Micro Action link */}
                <div className="mt-3 pt-2 border-t border-border-light/60 flex items-center justify-between text-[10px] text-text-tertiary group-hover:text-primary transition-colors">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-primary" /> View analytics
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
