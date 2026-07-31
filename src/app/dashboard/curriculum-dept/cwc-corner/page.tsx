"use client";

import React from "react";
import Link from "next/link";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Award, School, Trophy, ChevronRight, Sparkles } from "lucide-react";

export default function CwcCornerPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <BreadcrumbNav />

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
          <Award className="h-7 w-7 text-amber-500" />
          CWC Corner
        </h1>
        <p className="text-sm text-text-secondary">
          Continuous Weekly Assessment rankings and leaderboard portal across branches and SmartUp network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {/* Card 1: Branch Wise Ranking */}
        <Link href="/dashboard/curriculum-dept/cwc-corner/branch-ranking">
          <Card className="border-2 border-transparent hover:border-amber-500/40 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden bg-surface relative">
            <div className="h-2 bg-gradient-to-r from-amber-500 to-orange-500 w-full" />
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform duration-300">
                  <School className="h-10 w-10" />
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 font-medium px-3 py-1">
                  Branch Rankings
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-amber-600 transition-colors flex items-center gap-2">
                  1. Branch Wise Ranking
                  <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Compare branch performance scores, pass rates, and class standings for CWC assessment series.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-text-tertiary border-t border-border/50">
                <span className="flex items-center gap-1.5">
                  <School className="h-4 w-4 text-amber-500" /> Branch Breakdown & Metrics
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Card 2: SmartUp Ranking */}
        <Link href="/dashboard/curriculum-dept/cwc-corner/smartup-ranking">
          <Card className="border-2 border-transparent hover:border-purple-500/40 hover:shadow-xl transition-all duration-300 cursor-pointer group overflow-hidden bg-surface relative">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-indigo-600 w-full" />
            <CardContent className="p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="h-10 w-10" />
                </div>
                <Badge variant="outline" className="border-purple-500/30 text-purple-600 font-medium px-3 py-1">
                  Overall Leaderboard
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-text-primary group-hover:text-purple-600 transition-colors flex items-center gap-2">
                  2. SmartUp Ranking
                  <ChevronRight className="h-5 w-5 text-text-tertiary group-hover:translate-x-1 transition-transform" />
                </h3>
                <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                  Overall institute-wide student rankings and top achiever leaderboards across all SmartUp branches.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-text-tertiary border-t border-border/50">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-500" /> Network Top Achievers
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
