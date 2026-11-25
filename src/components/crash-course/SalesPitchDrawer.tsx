"use client";

import React, { useState } from "react";
import { MessageSquare, ChevronDown, ChevronUp, CheckCircle, Clock, BookOpen, Award, Users, PlusCircle } from "lucide-react";

export function SalesPitchDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const points = [
    {
      title: "Focused Morning Classes (6:15 AM – 8:00 AM)",
      description:
        "Helps students use their day effectively without missing or conflicting with regular school hours. Builds discipline and morning study habits.",
      icon: Clock,
    },
    {
      title: "Intensive Revision & Practice in 3 Subjects",
      description:
        "Dedicated revision in Physics, Chemistry & Mathematics with rigorous examination-oriented problem-solving and concept strengthening.",
      icon: BookOpen,
    },
    {
      title: "Three Progress Tracking Examinations",
      description:
        "3 structured milestone examinations evaluate continuous student progress and simulate board/annual exam environments.",
      icon: Award,
    },
    {
      title: "Affordable All-Inclusive Pricing",
      description:
        "Clear pricing with Course Fee + ₹299 Exam & Materials. No hidden material fees or mid-session charges.",
      icon: CheckCircle,
    },
    {
      title: "Guaranteed Limited Batch Size (20–50)",
      description:
        "Capped at 50 students per class per branch so instructors can give focused attention and answer individual doubts.",
      icon: Users,
    },
    {
      title: "Plus Two Mathematics Extension Included",
      description:
        "Additional support extending up to 13 February 2027 specifically for Plus Two Mathematics at no extra cost.",
      icon: PlusCircle,
    },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Sales Team Focus & Parent Pitch Script
            </h4>
            <p className="text-xs text-text-muted">
              6 core points to highlight when speaking with parents
            </p>
          </div>
        </div>
        <div className="text-primary p-1">
          {isOpen ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="mt-4 pt-4 border-t border-primary/15 grid grid-cols-1 md:grid-cols-2 gap-3">
          {points.map((pt, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1"
            >
              <div className="flex items-center gap-2 font-semibold text-text-primary">
                <pt.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <span>
                  {idx + 1}. {pt.title}
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed pl-5.5">
                {pt.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
