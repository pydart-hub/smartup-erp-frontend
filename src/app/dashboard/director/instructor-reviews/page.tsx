"use client";

import React, { useState } from "react";
import { Star, School } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { InstructorReviewList } from "@/components/instructor-review/InstructorReviewList";
import { UnderDevelopmentView } from "@/components/common/UnderDevelopmentView";

const IS_UNDER_DEVELOPMENT = true;

const BRANCH_OPTIONS = [
  "All",
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
];

export default function DirectorInstructorReviewsPage() {
  const [selectedBranch, setSelectedBranch] = useState("All");

  if (IS_UNDER_DEVELOPMENT) {
    return (
      <UnderDevelopmentView
        title="Instructor Reviews & Ratings"
        subtitle="Module In Development"
        description="Currently undergoing upgrades with verified branch performance metrics, multi-dimensional student feedback, and automated faculty analytics. Scheduled for release in an upcoming portal update."
        expectedFeatureList={[
          "Multi-Category Verified Student Reviews",
          "Branch-Wise & Individual Faculty Analytics",
          "Strengths & Areas of Growth Identification",
          "Historical Rating Trends & Sentiment Insights",
        ]}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-primary mt-1 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-current" /> Instructor Reviews & Ratings
          </h1>
          <p className="text-xs text-text-tertiary mt-1">
            Comprehensive overview of student ratings, top strengths, and areas for improvement across branches.
          </p>
        </div>

        {/* Branch Filter */}
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 text-text-tertiary" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="text-xs rounded-lg border border-border bg-surface px-3 py-2 text-primary font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          >
            {BRANCH_OPTIONS.map((b) => (
              <option key={b} value={b}>
                {b === "All" ? "All Branches" : b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <InstructorReviewList
        branch={selectedBranch}
        title={`Instructor Reviews ${selectedBranch !== "All" ? `· ${selectedBranch}` : ""}`}
      />
    </div>
  );
}
