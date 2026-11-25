import React from "react";
import { BookCheck, LineChart, PlayCircle, Target } from "lucide-react";
import { CORE_HIGHLIGHTS } from "@/data/enquiry-content";

const ICONS = [Target, PlayCircle, BookCheck, LineChart];

export default function HighlightsSection() {
  return (
    <section
      id="highlights"
      className="scroll-mt-20 bg-white py-12 sm:py-14 border-b border-slate-100"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORE_HIGHLIGHTS.map((item, idx) => {
            const Icon = ICONS[idx] || Target;
            return (
              <div
                key={item.title}
                className="rounded-2xl bg-[#FAFAFC] border border-slate-200/75 p-5 flex items-start gap-3.5"
              >
                <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] text-[#5C34A4] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
