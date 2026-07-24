"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Video, BookOpen, ListVideo, ChevronDown, Lock, X } from "lucide-react";
import { ThreeDCard } from "@/components/learning-hub/ThreeDCard";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/hooks/useAuth";
import { useParentData } from "../page";

export default function ParentLearningHub() {
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading } = useParentData(user?.email);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const children = data?.children ?? [];

  // Automatically select the first child if there's only one and "all" is set, or if none selected yet
  useEffect(() => {
    if (children.length > 0 && selectedChild === "all") {
      setSelectedChild(children[0].name);
    }
  }, [children, selectedChild]);

  // Helper to get child plan
  const getChildPlan = (childId: string) => {
    const enrollment = data?.enrollments?.[childId]?.[0];
    return enrollment?.custom_plan || "Basic";
  };

  // Helper: detect Plus One (11th) or Plus Two (12th) by program name
  const isHigherSecondary = (childId: string) => {
    const enrollment = data?.enrollments?.[childId]?.[0];
    const prog = enrollment?.program ?? "";
    return prog.startsWith("11th") || prog.startsWith("12th");
  };

  // Access rule:
  //   - Plus One / Plus Two students (11th & 12th) → ALL plans get access
  //   - All other students            → only Advanced or Intermediate
  const isAccessAllowed = () => {
    if (selectedChild === "all") {
      return children.some((c) => {
        if (isHigherSecondary(c.name)) return true;
        const plan = getChildPlan(c.name);
        return plan === "Advanced" || plan === "Intermediate";
      });
    }
    if (isHigherSecondary(selectedChild)) return true;
    const plan = getChildPlan(selectedChild);
    return plan === "Advanced" || plan === "Intermediate";
  };

  const handleCardClick = (targetUrl: string) => {
    if (!isAccessAllowed()) {
      setShowUpgradeModal(true);
      return;
    }
    router.push(targetUrl);
  };

  const selectedChildPlan = selectedChild !== "all" ? getChildPlan(selectedChild) : "";

  return (
    <div className="min-h-full flex flex-col gap-8 py-4 relative">
      {/* Header section with entrance animation and child selector */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase">
            Portal Resources
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
            Learning Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-base">
            Access high-quality study materials and interactive video lessons curated specifically for student academic success.
          </p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="relative self-start sm:self-auto min-w-[200px]">
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pr-10 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 appearance-none transition-all cursor-pointer"
            >
              <option value="all">All Children</option>
              {children.map((c) => {
                const plan = getChildPlan(c.name);
                return (
                  <option key={c.name} value={c.name}>
                    {c.student_name} ({plan})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="h-4 w-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </motion.div>

      {/* Cards container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-wrap gap-8 justify-start items-center mt-4"
      >
        <ThreeDCard
          title="Topic wise video classes"
          description="High-definition online video lectures and recorded classroom sessions to learn subjects at your own pace."
          icon={<Video className="h-6 w-6" />}
          gradientFrom="from-blue-600"
          gradientTo="to-indigo-600"
          badge="Interactive"
          onClick={() => handleCardClick("/dashboard/parent/video-classes")}
        />

        <ThreeDCard
          title="Chapter wise Video classes"
          description="Subject and chapter-wise video lessons curated by your child's class group. Browse by subject and chapter."
          icon={<ListVideo className="h-6 w-6" />}
          gradientFrom="from-violet-600"
          gradientTo="to-purple-600"
          badge="New"
          onClick={() => handleCardClick("/dashboard/parent/group-video-classes")}
        />

        <ThreeDCard
          title="Study Material"
          description="Comprehensive textbooks, syllabus guides, reference worksheets, and past exam questions to excel academically."
          icon={<BookOpen className="h-6 w-6" />}
          gradientFrom="from-emerald-600"
          gradientTo="to-teal-600"
          badge="Curated"
          onClick={() => handleCardClick("/dashboard/parent/study-materials")}
        />
      </motion.div>

      {/* Premium Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
            />

            {/* Dialog panel */}
            <motion.div
              className="relative z-10 w-full max-w-[450px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
            >
              {/* Close Button */}
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Animated Lock Icon */}
              <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/30 border-4 border-amber-100 dark:border-amber-900/30 flex items-center justify-center mb-6">
                <Lock className="h-7 w-7 text-amber-500 dark:text-amber-400 animate-pulse" />
              </div>

              {/* Modal Content */}
              <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-tight mb-3">
                Plan Upgrade Required
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                Learning Hub is available for Advanced &amp; Intermediate plan students. For Plus One &amp; Plus Two students, all plans have access. Your child is currently enrolled in the <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedChildPlan || "Basic"} plan</span>.
              </p>

              {/* Action Button */}
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-medium shadow-lg shadow-indigo-500/25 hover:shadow-indigo-600/30 transition-all duration-200"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
