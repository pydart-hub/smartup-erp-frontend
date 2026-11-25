"use client";

import React, { useState } from "react";
import EnquiryHeader from "@/components/enquiry/EnquiryHeader";
import HeroRegistrationSection from "@/components/enquiry/HeroRegistrationSection";
import HighlightsSection from "@/components/enquiry/HighlightsSection";
import PlansSection from "@/components/enquiry/PlansSection";
import FaqSection from "@/components/enquiry/FaqSection";
import EnquiryFooter from "@/components/enquiry/EnquiryFooter";
import type { PlanOption } from "@/components/enquiry/types";

export default function EnquiryLandingPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>("1:1 Personal");

  const scrollToRegister = () => {
    const el = document.getElementById("register");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        const input = document.getElementById("studentName");
        input?.focus({ preventScroll: true });
      }, 400);
    }
  };

  const handleSelectPlan = (plan: PlanOption) => {
    setSelectedPlan(plan);
    scrollToRegister();
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <EnquiryHeader onBookDemo={scrollToRegister} />

      <main className="flex-1">
        <HeroRegistrationSection
          selectedPlan={selectedPlan}
          onPlanChange={setSelectedPlan}
        />
        <HighlightsSection />
        <PlansSection
          selectedPlan={selectedPlan}
          onSelectPlan={handleSelectPlan}
        />
        <FaqSection />
      </main>

      <EnquiryFooter />
    </div>
  );
}
