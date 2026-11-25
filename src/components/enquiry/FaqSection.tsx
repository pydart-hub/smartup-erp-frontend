"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { FAQS } from "@/data/enquiry-content";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-12 sm:py-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">
          Quick Answers
        </h2>

        <div className="divide-y divide-slate-200/80 border-y border-slate-200/80">
          {FAQS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="w-full py-4 flex items-center justify-between gap-4 text-left cursor-pointer group"
                >
                  <span className="text-sm font-bold text-slate-900 group-hover:text-[#5C34A4] transition-colors">
                    {item.question}
                  </span>
                  <Plus
                    className={`w-4 h-4 text-[#5C34A4] shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-45" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <p className="pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed pr-8">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
