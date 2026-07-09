"use client";

import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Video, BookOpen, Upload, ArrowRight, Sparkles } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { useAuthStore } from "@/lib/stores/authStore";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { AnimatedName } from "@/components/dashboard/AnimatedValue";
import { CroppedSmileLogo } from "@/components/ui/CroppedSmileLogo";
import { Badge } from "@/components/ui/Badge";
import { getGMVideoCount } from "@/lib/api/gmVideoClasses";
import { getGMStudyMaterialsCount } from "@/lib/api/gmStudyMaterials";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

export default function ContentAdminDashboard() {
  const { user } = useAuthStore();

  // Query actual accurate counts from backend
  const { data: videoCount, isLoading: loadingVideos } = useQuery({
    queryKey: ["admin-video-count"],
    queryFn: getGMVideoCount,
    staleTime: 30_000,
  });

  const { data: materialsCount, isLoading: loadingMaterials } = useQuery({
    queryKey: ["admin-materials-count"],
    queryFn: getGMStudyMaterialsCount,
    staleTime: 30_000,
  });

  const quickActions = [
    {
      label: "Upload Video Class",
      description: "Publish a new video lesson to the content library for student access.",
      icon: Video,
      href: "/dashboard/content-admin/video-classes/upload",
      badge: "Upload",
      badgeVariant: "success" as const,
      details: ["MP4 / YouTube", "Multi-class target"]
    },
    {
      label: "Upload Study Material",
      description: "Share reference guides, notes, worksheets, and PDFs with classes.",
      icon: Upload,
      href: "/dashboard/content-admin/study-materials/upload",
      badge: "Publish",
      badgeVariant: "warning" as const,
      details: ["PDF, Slides, Docs", "Class files"]
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <BreadcrumbNav />

      {/* Clean Welcome Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <span>Welcome, </span>
          <AnimatedName name={user?.full_name?.split(" ")[0] ?? "Admin"} />
          <CroppedSmileLogo />
        </h1>
        <p className="text-sm text-text-secondary">
          Content Administration
        </p>
      </motion.div>

      {/* Stats Row (Dynamic Accurate Counts) */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatsCard
          title="Video Classes"
          value={videoCount ?? 0}
          icon={<Video className="h-5 w-5" />}
          trend={{ value: 6, label: "total" }}
          color="primary"
          loading={loadingVideos}
          href="/dashboard/content-admin/video-classes"
        />
        <StatsCard
          title="Study Materials"
          value={materialsCount ?? 0}
          icon={<BookOpen className="h-5 w-5" />}
          trend={{ value: 8, label: "resources" }}
          color="success"
          loading={loadingMaterials}
          href="/dashboard/content-admin/study-materials"
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.label} href={action.href}>
                <div className="bg-white dark:bg-slate-800 rounded-[12px] p-5 border border-border-light hover:border-primary/20 transition-all cursor-pointer shadow-sm hover:shadow-md flex flex-col justify-between h-full group">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-text-primary text-sm tracking-tight group-hover:text-primary transition-colors">
                        {action.label}
                      </h4>
                      <Badge variant={action.badgeVariant}>{action.badge}</Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed mb-4">
                      {action.description}
                    </p>
                  </div>
                  <div className="space-y-2 mt-auto">
                    <div className="border-t border-slate-100 dark:border-white/[0.05] pt-3 flex items-center justify-between text-[11px] text-text-tertiary">
                      <div className="flex items-center gap-2 flex-wrap">
                        {action.details.map((d, i) => (
                          <span key={i} className="bg-slate-50 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                            {d}
                          </span>
                        ))}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-text-tertiary group-hover:translate-x-0.5 group-hover:text-primary transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Content Library Links */}
      <motion.div variants={itemVariants} className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Content Library
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Video Classes List", sub: "View uploaded lessons", href: "/dashboard/content-admin/video-classes", icon: Video },
            { label: "Study Materials List", sub: "View document resources", href: "/dashboard/content-admin/study-materials", icon: BookOpen },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} href={item.href}>
                <div className="flex items-center justify-between p-4 rounded-[12px] bg-white dark:bg-slate-800 border border-border-light hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center border border-slate-100 dark:border-white/[0.05]">
                      <Icon className="h-4.5 w-4.5 text-text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-text-primary truncate tracking-tight">{item.label}</p>
                      <p className="text-xs text-text-tertiary truncate">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-tertiary group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
