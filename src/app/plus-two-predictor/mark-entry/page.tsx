"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";

const Background3D = dynamic(
  () => import("@/components/predictor/Background3D"),
  { ssr: false }
);

interface SubjectMarkInput {
  code: string;
  name: string;
  maxTe: number;
  maxCe: number;
  te: string;
  ce: string;
}

function PlusTwoPredictorMarkEntryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get("name") || "";
  const phone = searchParams.get("phone") || "";
  const district = searchParams.get("district") || "";
  const stream = searchParams.get("stream") || "Science";

  const [marks, setMarks] = useState<SubjectMarkInput[]>([
    { code: "ENG", name: "English", maxTe: 80, maxCe: 20, te: "", ce: "20" },
    { code: "MAL", name: "Malayalam / Language", maxTe: 80, maxCe: 20, te: "", ce: "20" },
    { code: "PHY", name: "Physics", maxTe: 60, maxCe: 20, te: "", ce: "20" },
    { code: "CHE", name: "Chemistry", maxTe: 60, maxCe: 20, te: "", ce: "20" },
    { code: "MAT", name: "Mathematics", maxTe: 60, maxCe: 20, te: "", ce: "20" },
    { code: "CSC", name: "Computer Science / Bio", maxTe: 60, maxCe: 20, te: "", ce: "20" },
  ]);

  const handleMarkChange = (code: string, field: "te" | "ce", value: string) => {
    setMarks((prev) =>
      prev.map((item) => {
        if (item.code === code) {
          const maxVal = field === "te" ? item.maxTe : item.maxCe;
          // Validate number is within max range
          const numVal = parseInt(value);
          if (!isNaN(numVal) && (numVal < 0 || numVal > maxVal)) {
            return item; // Ignore out of bounds
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all marks are filled
    for (const item of marks) {
      if (item.te === "" || item.ce === "") {
        alert(`Please enter marks for ${item.name}`);
        return;
      }
    }

    const randomId = Math.random().toString(36).substring(2, 10);
    const query = new URLSearchParams();
    query.set("name", name);
    query.set("phone", phone);
    query.set("district", district);
    query.set("stream", stream);
    
    marks.forEach((item) => {
      query.set(`p1_${item.code}_te`, item.te);
      query.set(`p1_${item.code}_ce`, item.ce);
    });

    router.push(`/plus-two-predictor/results/${randomId}?${query.toString()}`);
  };

  return (
    <div className="min-h-screen relative py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800 overflow-x-hidden">
      <Background3D />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        {/* Top Branding Navigation */}
        <div className="flex justify-between items-center">
          <Link href="/plus-two-predictor" className="flex items-center gap-2">
            <Image
              src="/smartup-logo-v2.png"
              alt="SmartUp"
              width={30}
              height={30}
              className="object-contain block flex-shrink-0 drop-shadow-sm"
            />
            <span className="text-slate-800 text-md tracking-[0.15em] uppercase leading-none font-black drop-shadow-sm">
              SMART UP
            </span>
          </Link>
          <Link
            href={`/plus-two-predictor?name=${encodeURIComponent(name)}&phone=${encodeURIComponent(phone)}&district=${encodeURIComponent(district)}`}
            className="text-xs bg-white/70 hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-slate-700 transition shadow-sm"
          >
            ← Back
          </Link>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/80 backdrop-blur-xl border border-white/80 p-6 md:p-8 rounded-3xl shadow-lg shadow-purple-500/5 space-y-6"
        >
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-800">
              Enter Plus One Marks
            </h2>
            <p className="text-xs text-slate-500">
              Hi {name || "Student"}, please enter your Continuous Evaluation (CE) and Theory Exam (TE) marks.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              {marks.map((sub) => (
                <div key={sub.code} className="p-4 bg-white/55 backdrop-blur-sm border border-slate-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="font-extrabold text-sm text-slate-700 sm:w-1/3">{sub.name}</div>
                  
                  <div className="flex gap-4 sm:w-2/3">
                    {/* Continuous Evaluation */}
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">CE (Max {sub.maxCe})</label>
                      <input
                        type="number"
                        min="0"
                        max={sub.maxCe}
                        value={sub.ce}
                        onChange={(e) => handleMarkChange(sub.code, "ce", e.target.value)}
                        placeholder="CE"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 text-sm shadow-sm"
                        required
                      />
                    </div>

                    {/* Theory Exam */}
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Theory (Max {sub.maxTe})</label>
                      <input
                        type="number"
                        min="0"
                        max={sub.maxTe}
                        value={sub.te}
                        onChange={(e) => handleMarkChange(sub.code, "te", e.target.value)}
                        placeholder="TE"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5f2ea8] focus:border-transparent text-slate-800 text-sm shadow-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              className="w-full p-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-xl transition shadow-lg shadow-purple-500/10 cursor-pointer uppercase tracking-wider text-sm"
            >
              Get My Prediction
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function PlusTwoPredictorMarkEntry() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-400">
        Loading mark form...
      </div>
    }>
      <PlusTwoPredictorMarkEntryContent />
    </Suspense>
  );
}
