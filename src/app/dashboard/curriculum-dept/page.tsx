"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Edit3, 
  Users, 
  BookOpen, 
  UserCheck, 
  BarChart3, 
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  School,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { GifLoader } from "@/components/ui/GifLoader";
import { getBranches } from "@/lib/api/enrollment";

const quickLinks = [
  { title: "Marks Entry", desc: "Enter marks and calculate grades", icon: Edit3, href: "/dashboard/curriculum-dept/marks-entry", color: "text-primary bg-primary/5 border-primary/10" },
  { title: "Class Performance", desc: "Branch-wise subject analysis & toppers", icon: Users, href: "/dashboard/curriculum-dept/class-performance", color: "text-success bg-success/5 border-success/10" },
  { title: "Teacher Ranking", desc: "Average marks and highest scores", icon: BookOpen, href: "/dashboard/curriculum-dept/subject-performance", color: "text-info bg-info/5 border-info/10" },
  { title: "Teacher Performance", desc: "Teacher ranking & performance scores", icon: UserCheck, href: "/dashboard/curriculum-dept/teacher-performance", color: "text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900/30" },
  { title: "Student Dashboard", desc: "Individual student diagnosis & ranking", icon: GraduationCap, href: "/dashboard/curriculum-dept/student-dashboard", color: "text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900/30" },
  { title: "Branch Wise Performance", desc: "Smart Up branch ranking & analytics", icon: BarChart3, href: "/dashboard/curriculum-dept/consolidated-dashboard", color: "text-teal-600 bg-teal-50 border-teal-100 dark:bg-teal-950/20 dark:border-teal-900/30" },
];

export default function CurriculumDeptDashboard() {
  const router = useRouter();

  // Helper to determine tailwind classes based on pass rate percentage
  const getRateColor = (rate: number) => {
    if (rate >= 85) return "text-success bg-success/5";
    if (rate >= 70) return "text-amber-500 bg-amber-500/5";
    if (rate >= 50) return "text-orange-500 bg-orange-500/5";
    return "text-error bg-error/5";
  };

  // 1. Fetch branches
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: getBranches,
    staleTime: 120_000,
  });

  // 2. Fetch all exams (Assessment Plans)
  const { data: allPlans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["all-plans-curriculum-dash"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Plan",
          method: "GET",
          payload: {
            fields: JSON.stringify(["name", "custom_branch"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "1000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // 3. Fetch entered plan names (unique)
  const { data: enteredPlans = new Set<string>(), isLoading: enteredLoading } = useQuery({
    queryKey: ["entered-plans-curriculum-dash"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            group_by: "assessment_plan",
            limit_page_length: "1000"
          }
        })
      }).then(r => r.json());
      return new Set<string>(res.data?.map((r: any) => r.assessment_plan) ?? []);
    },
    staleTime: 60_000,
  });

  // 4. Fetch all results to calculate pass rates
  const { data: allResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["all-results-curriculum-dash"],
    queryFn: async () => {
      const res = await fetch("/api/curriculum-dept/admin-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "resource/Assessment Result",
          method: "GET",
          payload: {
            fields: JSON.stringify(["assessment_plan", "total_score", "maximum_score"]),
            filters: JSON.stringify([["docstatus", "=", 1]]),
            limit_page_length: "10000"
          }
        })
      }).then(r => r.json());
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  // Group results by plan
  const resultsByPlan = useMemo(() => {
    const map = new Map<string, any[]>();
    allResults.forEach((r: any) => {
      if (!map.has(r.assessment_plan)) {
        map.set(r.assessment_plan, []);
      }
      map.get(r.assessment_plan)!.push(r);
    });
    return map;
  }, [allResults]);

  // Compute branch pass rates
  const branchPerformances = useMemo(() => {
    return branches.map((b: any) => {
      const branchPlans = allPlans.filter((p: any) => p.custom_branch === b.name);
      const branchResultsList: any[] = [];
      branchPlans.forEach((p: any) => {
        const planResults = resultsByPlan.get(p.name) || [];
        branchResultsList.push(...planResults);
      });

      if (branchResultsList.length === 0) return { name: b.name, passRate: "N/A", numericRate: 0 };
      const passed = branchResultsList.filter(r => (r.total_score / r.maximum_score) >= 0.4).length;
      const rate = Math.round((passed / branchResultsList.length) * 100);
      return {
        name: b.name,
        passRate: `${rate}%`,
        numericRate: rate
      };
    });
  }, [branches, allPlans, resultsByPlan]);

  const completedCount = enteredPlans.size;
  const pendingCount = useMemo(() => {
    return allPlans.filter((p: any) => !enteredPlans.has(p.name)).length;
  }, [allPlans, enteredPlans]);

  const isLoading = branchesLoading || plansLoading || enteredLoading || resultsLoading;

  if (isLoading) {
    return (
      <div className="py-32 flex items-center justify-center">
        <GifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Curriculum & Assessment</h1>
        <p className="text-xs text-text-tertiary mt-0.5">
          Academic Assessment & Analytics Platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Completed Cards */}
        <Card 
          hover 
          className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm relative group"
          onClick={() => router.push("/dashboard/curriculum-dept/marks-entry")}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">Completed</span>
              <p className="text-2xl font-extrabold text-text-primary">{completedCount}</p>
              <p className="text-xs text-text-secondary">Exams with marks successfully entered</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-950/20 text-success rounded-xl group-hover:scale-105 transition-transform">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Cards */}
        <Card 
          hover 
          className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm relative group"
          onClick={() => router.push("/dashboard/curriculum-dept/marks-entry")}
        >
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Action Required</span>
              <p className="text-2xl font-extrabold text-text-primary">{pendingCount}</p>
              <p className="text-xs text-text-secondary">Exams pending marks entry</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 text-orange-500 rounded-xl group-hover:scale-105 transition-transform">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branch Pass Rates */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-text-primary tracking-wide uppercase flex items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" /> Branch Pass Rates
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {branchPerformances.map((b) => {
            const colorClass = getRateColor(b.numericRate);
            return (
              <Card 
                key={b.name} 
                hover
                onClick={() => router.push("/dashboard/curriculum-dept/consolidated-dashboard")}
                className="cursor-pointer border border-slate-100 dark:border-white/[0.06] shadow-sm p-4 relative"
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="space-y-1 truncate">
                    <p className="text-xs font-semibold text-text-primary truncate">{b.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold inline-block ${colorClass}`}>
                      {b.passRate} Pass
                    </span>
                  </div>
                  <School className="h-4 w-4 text-slate-300 shrink-0" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-text-primary tracking-wide uppercase">Quick Navigation & Analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickLinks.map((card) => (
            <button
              key={card.title}
              onClick={() => router.push(card.href)}
              className="text-left bg-surface rounded-[12px] border border-slate-100 dark:border-white/[0.06] p-5 hover:border-slate-200 dark:hover:border-white/[0.12] hover:shadow-sm transition-all group flex flex-col justify-between h-36"
            >
              <div>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 border ${card.color}`}>
                  <card.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  {card.title}
                </p>
                <p className="text-xs text-text-tertiary mt-1 line-clamp-1">{card.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-primary flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                Open Module <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
