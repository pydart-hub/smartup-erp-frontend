"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  ChevronDown,
  GraduationCap,
  Loader2,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/hooks/useAuth";
import Link from "next/link";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GMStudyMaterial {
  name: string;
  material_title: string;
  material_url: string;
  description: string | null;
  sort_order: number;
}

interface GMSubject {
  name: string;
  subject_name: string;
  icon_emoji: string;
  sort_order: number;
  materials: GMStudyMaterial[];
}

interface ChildMaterialData {
  student: string;
  student_name: string;
  program: string;
  subjects: GMSubject[];
}

interface GMMaterialsResponse {
  children: ChildMaterialData[];
}

// ── Animations ────────────────────────────────────────────────────────────────

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParentStudyMaterialsPage() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { data, isLoading } = useQuery<GMMaterialsResponse>({
    queryKey: ["parent-gm-study-materials"],
    queryFn: async () => {
      const res = await fetch("/api/parent/gm-study-materials", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch study materials");
      return res.json();
    },
    enabled: !!user?.email,
    staleTime: 2 * 60_000,
  });

  const allChildren = data?.children ?? [];
  const targetChildren =
    selectedChild === "all"
      ? allChildren
      : allChildren.filter((c) => c.student === selectedChild);

  // Total materials count across all children shown
  const totalMaterials = targetChildren.reduce(
    (sum, child) =>
      sum +
      child.subjects.reduce(
        (sSum, sub) => sSum + sub.materials.length,
        0
      ),
    0
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/parent/learning-hub">
            <button className="p-2 rounded-[10px] hover:bg-brand-wash text-text-secondary transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              Study Materials
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {isLoading
                ? "Loading…"
                : totalMaterials > 0
                ? `${totalMaterials} shared link${totalMaterials !== 1 ? "s" : ""} available for your child's class`
                : "Study materials will appear here once the Content Admin uploads them."}
            </p>
          </div>
        </div>

        {/* Child selector (only shown for multi-child parents) */}
        {allChildren.length > 1 && (
          <div className="relative">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="h-10 rounded-[10px] border border-border-input bg-surface px-4 pr-8 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">All Children</option>
              {allChildren.map((c) => (
                <option key={c.student} value={c.student}>
                  {c.student_name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && targetChildren.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No study materials available yet. The Content Admin will share reference documents soon.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Per-child sections */}
      {!isLoading &&
        targetChildren.map((child, childIdx) => {
          const materialCount = child.subjects.reduce(
            (s, sub) => s + sub.materials.length,
            0
          );

          return (
            <motion.div
              key={child.student}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: childIdx * 0.07 }}
              className="space-y-3"
            >
              {/* Child header card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {child.student_name}
                    <span className="text-sm font-normal text-text-secondary ml-1">
                      — {child.program}
                    </span>
                    {materialCount > 0 && (
                      <Badge variant="success" className="ml-auto">
                        {materialCount} resource{materialCount !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {child.subjects.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-4">
                      No subjects available for this class yet.
                    </p>
                  ) : (
                    child.subjects.map((subject) => {
                      const subjectKey = `${child.student}-${subject.name}`;
                      const isExpanded = expandedSubject === subjectKey;

                      return (
                        <div
                          key={subject.name}
                          className="border border-border-light rounded-[12px] overflow-hidden"
                        >
                          {/* Subject header */}
                          <button
                            onClick={() =>
                              setExpandedSubject(isExpanded ? null : subjectKey)
                            }
                            className="w-full flex items-center justify-between p-3 bg-app-bg hover:bg-brand-wash/20 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl shrink-0">
                                {subject.icon_emoji || "📚"}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-text-primary">
                                  {subject.subject_name}
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {subject.materials.length} link
                                  {subject.materials.length !== 1 ? "s" : ""} available
                                </p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-text-tertiary transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          {/* Materials list */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-border-light divide-y divide-border-light">
                                  {subject.materials.map((mat, idx) => (
                                    <div key={mat.name} className="px-4 py-3">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                          <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/45 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                                            {idx + 1}
                                          </span>
                                          <span className="text-sm text-text-primary truncate">
                                            {mat.material_title}
                                          </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          <a
                                            href={mat.material_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50 transition-colors"
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Open Link
                                          </a>
                                        </div>
                                      </div>

                                      {/* Optional description */}
                                      {mat.description && (
                                        <p className="text-xs text-text-secondary mt-1 ml-9">
                                          {mat.description}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
    </motion.div>
  );
}
