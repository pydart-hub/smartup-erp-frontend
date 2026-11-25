"use client";

import React from "react";
import { BookOpen, Sparkles, AlertCircle } from "lucide-react";
import type {
  CrashCourseClass,
  CrashCourseLanguage,
} from "@/lib/types/crashCourse";
import {
  AVAILABLE_LANGUAGES,
  isLanguageAddonAllowed,
  formatINR,
  LANGUAGE_SINGLE_RATE,
  LANGUAGE_BUNDLE_3_RATE,
} from "@/lib/utils/crashCoursePricing";

interface Props {
  classLevel: CrashCourseClass;
  selectedLanguages: CrashCourseLanguage[];
  onChange: (langs: CrashCourseLanguage[]) => void;
}

export function LanguageSelector({
  classLevel,
  selectedLanguages,
  onChange,
}: Props) {
  const isAllowed = isLanguageAddonAllowed(classLevel);

  function toggleLanguage(lang: CrashCourseLanguage) {
    if (!isAllowed) return;
    if (selectedLanguages.includes(lang)) {
      onChange(selectedLanguages.filter((l) => l !== lang));
    } else {
      onChange([...selectedLanguages, lang]);
    }
  }

  function selectAll() {
    if (!isAllowed) return;
    onChange([...AVAILABLE_LANGUAGES]);
  }

  function clearAll() {
    onChange([]);
  }

  if (!isAllowed) {
    return (
      <div className="p-4 rounded-xl border border-border bg-muted/30 text-text-muted text-sm flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-text-secondary">
            Sunday Language Classes: Not Applicable for {classLevel}
          </p>
          <p className="text-xs mt-0.5">
            Sunday optional language classes (English, Hindi, Malayalam) are
            strictly reserved for Classes 9 and 10 per the Crash Course
            specifications.
          </p>
        </div>
      </div>
    );
  }

  const isAllSelected = selectedLanguages.length === AVAILABLE_LANGUAGES.length;

  return (
    <div className="p-5 rounded-xl border border-border bg-surface space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Optional Sunday Language Classes
            </h4>
            <p className="text-xs text-text-muted">
              Available for Classes 9 & 10 on Sundays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={selectAll}
            className={`px-2.5 py-1 rounded-md font-medium border transition-colors ${
              isAllSelected
                ? "bg-primary/10 border-primary/30 text-primary"
                : "border-border hover:bg-muted text-text-secondary"
            }`}
          >
            Select All 3 (Bundle Deal)
          </button>
          {selectedLanguages.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-text-muted hover:text-text-secondary underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Pricing info pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-lg border border-border bg-muted/20">
          <span className="font-semibold text-text-primary">Single Language:</span>{" "}
          <span className="text-text-secondary">{formatINR(LANGUAGE_SINGLE_RATE)} per subject</span>
        </div>
        <div className="p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
          <div>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">
              All 3 Languages:
            </span>{" "}
            <span className="text-text-secondary">{formatINR(LANGUAGE_BUNDLE_3_RATE)}</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            Save ₹498
          </span>
        </div>
      </div>

      {/* Interactive language chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AVAILABLE_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguages.includes(lang);
          return (
            <button
              key={lang}
              type="button"
              onClick={() => toggleLanguage(lang)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5 text-primary shadow-sm"
                  : "border-border hover:border-border-hover hover:bg-muted/30 text-text-secondary"
              }`}
            >
              <div>
                <span className="block font-medium text-sm text-text-primary">
                  {lang}
                </span>
                <span className="text-xs text-text-muted">Sunday Morning</span>
              </div>
              <div
                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-primary border-primary text-white"
                    : "border-border bg-surface"
                }`}
              >
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
