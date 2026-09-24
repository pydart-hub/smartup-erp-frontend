"use client";

import React, { useState } from "react";
import { MessageSquarePlus, Star, School, ShieldCheck } from "lucide-react";
import { BreadcrumbNav } from "@/components/layout/BreadcrumbNav";
import { InstructorReviewForm } from "@/components/instructor-review/InstructorReviewForm";
import { InstructorReviewList } from "@/components/instructor-review/InstructorReviewList";
import { UnderDevelopmentView } from "@/components/common/UnderDevelopmentView";

import { useAuth } from "@/lib/hooks/useAuth";
import { useParentData } from "@/app/dashboard/parent/page";

const IS_UNDER_DEVELOPMENT = false;

export default function ParentInstructorReviewsPage() {
  const [activeTab, setActiveTab] = useState<string>("submit");
  const { user } = useAuth();
  const { data: parentData } = useParentData(user?.email);
  const children = parentData?.children ?? [];
  const studentBranch = children[0]?.custom_branch || undefined;

  if (IS_UNDER_DEVELOPMENT) {
    return (
      <UnderDevelopmentView
        title="Teacher Feedback & Rating"
        subtitle="Feature Coming Soon"
        description="The teacher feedback and rating portal for parents is currently being finalized. Direct teacher evaluation forms and constructive feedback submissions will be available here shortly."
        expectedFeatureList={[
          "Convenient Star Ratings for Class Instructors",
          "Structured Feedback on Student Comprehension",
          "Direct Communication on Strengths & Focus Areas",
        ]}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <BreadcrumbNav />
          <h1 className="text-2xl font-bold text-primary mt-1 flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500 fill-current" /> Instructor Reviews & Feedback
          </h1>
          <p className="text-xs text-text-tertiary mt-1">
            Rate teachers out of 5 and submit constructive feedback on strengths and areas for improvement.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-surface-secondary/60 p-1 rounded-xl border border-border shrink-0">
          <button
            onClick={() => setActiveTab("submit")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "submit"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            Submit Feedback
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "reviews"
                ? "bg-brand-primary text-white shadow-xs"
                : "text-text-secondary hover:text-primary"
            }`}
          >
            Branch Feedback
          </button>
        </div>
      </div>

      {activeTab === "submit" ? (
        <InstructorReviewForm onSuccess={() => setActiveTab("reviews")} />
      ) : (
        <InstructorReviewList
          branch={studentBranch}
          title={`Instructor Feedback & Ratings ${studentBranch ? `· ${studentBranch}` : ""}`}
          showAnalytics={false}
        />
      )}
    </div>
  );
}
