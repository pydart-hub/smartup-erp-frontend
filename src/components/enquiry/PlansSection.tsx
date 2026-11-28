"use client";

import React from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { PLANS } from "@/data/enquiry-content";
import { pushGtmEvent } from "@/lib/analytics/gtm";
import type { PlanOption } from "@/components/enquiry/types";

interface PlansSectionProps {
  selectedPlan: PlanOption;
  onSelectPlan: (plan: PlanOption) => void;
}

export default function PlansSection({
  selectedPlan,
  onSelectPlan,
}: PlansSectionProps) {
  return (
    <section
      id="plans"
      className="scroll-mt-20 bg-[#FAFAFC] py-12 sm:py-16 border-b border-slate-100"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Batch Plans
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Includes recordings, Smart Up notes &amp; worksheets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isFeatured = Boolean(plan.featured);

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-3xl bg-white p-6 transition-all ${
                  isSelected || isFeatured
                    ? "border-2 border-[#5C34A4] shadow-[0_16px_40px_-18px_rgba(92,52,164,0.2)]"
                    : "border border-slate-200/80 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#5C34A4] text-[11px] font-bold">
                      {plan.badge}
                    </span>
                    {isSelected && (
                      <span className="text-[11px] font-bold text-[#5C34A4]">
                        Selected
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3.5 text-lg font-black text-slate-900">
                    {plan.title}
                  </h3>
                  <p className="text-xs text-slate-500 pb-3.5 border-b border-slate-100">
                    {plan.subtitle}
                  </p>

                  <ul className="mt-4 space-y-2 text-xs text-slate-700">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-[#5C34A4] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    pushGtmEvent("enquiry_plan_selected", {
                      preferred_plan: plan.id,
                      source: "plans_section",
                    });
                    onSelectPlan(plan.id);
                  }}
                  className={`mt-6 w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    isFeatured
                      ? "bg-[#5C34A4] hover:bg-[#4B288A] text-white"
                      : "bg-slate-900 hover:bg-[#5C34A4] text-white"
                  }`}
                >
                  <span>{plan.ctaLabel}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
