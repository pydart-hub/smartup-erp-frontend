"use client";

import React from "react";
import { Star } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { InstructorReviewList } from "@/components/instructor-review/InstructorReviewList";
import { UnderDevelopmentView } from "@/components/common/UnderDevelopmentView";
import { useAuth } from "@/lib/hooks/useAuth";

const IS_UNDER_DEVELOPMENT = false;

export default function BranchManagerInstructorReviewsPage() {
  const { defaultCompany } = useAuth();

  if (IS_UNDER_DEVELOPMENT) {
    return (
      <UnderDevelopmentView
        title="Instructor Reviews & Ratings"
        subtitle="Module In Development"
        description="Branch instructor evaluation workflows and student rating analytics are currently being prepared. Scheduled for launch in the next release cycle."
        expectedFeatureList={[
          "Branch Teacher Rating Summary",
          "Student Feedback Feed & Highlights",
          "Subject-Wise Performance Metrics",
        ]}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <BreadcrumbNav />
        <h1 className="text-2xl font-bold text-primary mt-1 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500 fill-current" /> Instructor Reviews & Ratings
        </h1>
        <p className="text-xs text-text-tertiary mt-1">
          Student reviews and feedback for instructors teaching at {defaultCompany || "your branch"}.
        </p>
      </div>

      <InstructorReviewList
        branch={defaultCompany}
        title={`Branch Instructor Reviews · ${defaultCompany || ""}`}
        hideStrengthsWeaknesses={true}
      />
    </div>
  );
}
