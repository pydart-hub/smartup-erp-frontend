"use client";

import { GifLoader } from "@/components/ui/GifLoader";
import React, { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Coffee,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Button } from "@/components/ui/Button";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 30, rotateX: 12, rotateY: -6, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    rotateY: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 180, damping: 18 },
  },
};

export default function DirectorCwcExamsPage() {
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);

  const { data: allExams = [], isLoading } = useQuery({
    queryKey: ["director-all-exams"],
    queryFn: () => getAssessmentPlans(),
    staleTime: 30_000,
  });

  const cwcExams = useMemo(() => {
    return allExams.filter((e) => e.assessment_group && e.assessment_group.toLowerCase().includes("cwc"));
  }, [allExams]);

  const stats = useMemo(() => {
    const getGroupStats = (filterFn: (e: any) => boolean) => {
      const filtered = cwcExams.filter(filterFn);
      return {
        total: filtered.length,
      };
    };

    return {
      cwc1: getGroupStats((e) => e.assessment_group?.toLowerCase().includes("1")),
      cwc2: getGroupStats((e) => e.assessment_group?.toLowerCase().includes("2")),
      cwc3: getGroupStats((e) => e.assessment_group?.toLowerCase().includes("3")),
      overall: {
        total: cwcExams.length,
      },
    };
  }, [cwcExams]);

  const cards = [
    {
      title: "CWC Exam 1",
      description: "Review benchmarking reports and scores for student evaluations in CWC Exam 1.",
      href: "/dashboard/director/exams/cwc/list?group=CWC Exam 1",
      icon: Coffee,
      videoSrc: "/Logo Icon Smile ALPHA.webm",
      tone: "from-orange-500/15 via-white to-orange-500/5",
      badgeText: `${stats.cwc1.total} Exams`,
    },
    {
      title: "CWC Exam 2",
      description: "Monitor progressive improvement and schedules for CWC Exam 2 parameters.",
      href: "/dashboard/director/exams/cwc/list?group=CWC Exam 2",
      icon: Coffee,
      videoSrc: "/Logo Icon Smile ALPHA.webm",
      tone: "from-rose-500/15 via-white to-rose-500/5",
      badgeText: `${stats.cwc2.total} Exams`,
    },
    {
      title: "CWC Exam 3",
      description: "Track final-stage student assessments and metrics in CWC Exam 3.",
      href: "/dashboard/director/exams/cwc/list?group=CWC Exam 3",
      icon: Coffee,
      videoSrc: "/Logo Icon Smile ALPHA.webm",
      tone: "from-blue-500/15 via-white to-blue-500/5",
      badgeText: `${stats.cwc3.total} Exams`,
    },
    {
      title: "CWC Summary",
      description: "Get the overall consolidated view of CWC performance and analytics across all branches.",
      href: "/dashboard/director/exams/cwc/list?group=all",
      icon: CheckCircle2,
      videoSrc: "/Logo Icon LOOK ALPHA.webm",
      tone: "from-violet-500/15 via-white to-violet-500/5",
      badgeText: `${stats.overall.total} Total Exams`,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
      <BreadcrumbNav />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/director/exams">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Coffee className="h-6 w-6 text-amber-500" />
              CWC Corner
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Select a CWC category to review detailed performance metrics and schedules.
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <GifLoader />
      ) : (
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          style={{ perspective: 1200, transformStyle: "preserve-3d" }}
        >
          {cards.map((mode) => (
            <motion.div
              key={mode.title}
              variants={item}
              className="h-full"
              onMouseEnter={() => setHoveredCard(mode.title)}
              onMouseLeave={() => setHoveredCard(null)}
              whileHover={{
                scale: 1.04,
                rotateX: 6,
                rotateY: -6,
                z: 15,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <Link href={mode.href} className="block h-full">
                <Card className={`h-full overflow-hidden border-border-light/80 bg-[linear-gradient(135deg,var(--tw-gradient-stops))] ${mode.tone} flex flex-col justify-between shadow-sm hover:shadow-xl transition-shadow duration-300 relative`}>
                  {/* Subtle Background Video on Hover */}
                  <video
                    src={mode.videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-500 ${
                      hoveredCard === mode.title ? "opacity-[0.16]" : "opacity-0"
                    }`}
                  />
                  
                  <CardHeader className="relative z-10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="rounded-2xl bg-white/90 p-3 text-primary shadow-sm relative w-12 h-12 flex items-center justify-center overflow-hidden">
                        <mode.icon className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {mode.badgeText}
                      </span>
                    </div>
                    <CardTitle className="mt-6 text-xl">{mode.title}</CardTitle>
                    <CardDescription className="max-w-xl text-xs leading-5 mt-2">{mode.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0 relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 text-xs font-medium text-text-primary mt-4">
                      Open {mode.title}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.section>
      )}
    </div>
  );
}

import { getAssessmentPlans } from "@/lib/api/assessment";
