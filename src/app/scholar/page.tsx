"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  MapPin,
  Phone,
  School,
  Sparkles,
  Trophy,
  User,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

// Official SmartUp Color Palette:
// Primary Brand Purple: #673AB7 (Hover: #512DA8, Soft: #EDE7F6)
// Secondary Accent Green: #82C35B (Hover: #6FAF48, Soft: #EFF8E8)

const KERALA_DISTRICTS = [
  "Ernakulam",
  "Thiruvananthapuram",
  "Kollam",
  "Pathanamthitta",
  "Alappuzha",
  "Kottayam",
  "Idukki",
  "Thrissur",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Wayanad",
  "Kannur",
  "Kasaragod",
];

const CLASSES = [
  "Class 8",
  "Class 9",
  "Class 10",
  "Plus One (+1)",
  "Plus Two (+2)",
];

export default function ScholarRegistrationPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [district, setDistrict] = useState("Ernakulam");
  const [school, setSchool] = useState("");
  const [agree, setAgree] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid student name and 10-digit mobile number.");
      return;
    }
    if (!agree) {
      alert("Please agree to receive exam updates.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800 flex flex-col justify-between selection:bg-[#673AB7] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/smartup-logo-v2.png"
              alt="SmartUp"
              width={42}
              height={42}
              priority
              className="object-contain"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-wider text-slate-900 uppercase leading-none">
                  SMART UP
                </span>
                <span className="w-2 h-2 rounded-full bg-[#82C35B]" />
              </div>
              <span className="text-[11px] font-bold text-[#673AB7] tracking-widest uppercase mt-0.5">
                Scholarship Exam Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF8E8] text-[#4E8F27] border border-[#82C35B]/30">
              <span className="w-2 h-2 rounded-full bg-[#82C35B] animate-pulse" />
              Batch 2026-27
            </span>
          </div>
        </div>
      </header>

      {/* Main Registration Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 w-full flex-1 flex items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Branding, Value Props & Slabs */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EDE7F6] text-[#673AB7] text-xs font-bold tracking-wide">
              <Sparkles className="w-4 h-4 text-[#673AB7]" />
              <span>SmartUp Talent & Scholarship Search 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Register for SmartUp{" "}
              <span className="text-[#673AB7]">Scholarship Exam</span> & Win Up To{" "}
              <span className="text-[#82C35B] underline decoration-[#82C35B]/40 decoration-wavy">
                100% Fee Waiver
              </span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Enter your student details to book an exam slot. Evaluated by senior faculty mentors with instant performance analytics and certified fee waiver vouchers.
            </p>

            {/* Benefit Badges */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-[#EDE7F6] text-[#673AB7] flex items-center justify-center font-bold text-sm">
                  100%
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                  Tuition Fee Waiver for Top Performers (Super 30 Diamond)
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-[#EFF8E8] text-[#4E8F27] flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                  Open for Classes 8, 9, 10, Plus One (+1) & Plus Two (+2)
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-[#EDE7F6] text-[#673AB7] flex items-center justify-center font-bold text-sm">
                  ⚡
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-800">
                  Instant Computerized Result & Digital Scholarship Certificate
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Detail Entry Card */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-lg bg-white border border-slate-200/90 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 space-y-6"
            >
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="p-2.5 rounded-2xl bg-[#EDE7F6] text-[#673AB7]">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Student Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter details to reserve your scholarship test
                  </p>
                </div>
              </div>

              {isSubmitted ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#EFF8E8] text-[#4E8F27] flex items-center justify-center mx-auto border border-[#82C35B]/30">
                    <Trophy className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900">Registration Complete!</h3>
                    <p className="text-sm text-slate-600">
                      Welcome, <strong className="text-[#673AB7]">{name}</strong>. Your details for{" "}
                      <strong className="text-slate-800">{selectedClass}</strong> have been recorded.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 text-left">
                    <div><strong>Number:</strong> +91 {phone}</div>
                    <div><strong>District:</strong> {district}</div>
                    {school && <div><strong>School:</strong> {school}</div>}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-xs font-bold text-[#673AB7] hover:underline cursor-pointer"
                    >
                      Register another student
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Student Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Enter student name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Phone & Class in 2 Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mobile Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-3 text-xs font-bold bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10-digit number"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-r-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* Class */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Class / Grade <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs cursor-pointer"
                        >
                          {CLASSES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* District (Full width) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      District <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3.5 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs cursor-pointer"
                    >
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* School Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      School Name (Optional)
                    </label>
                    <div className="relative">
                      <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="e.g. St. Albert's Higher Secondary School"
                        value={school}
                        onChange={(e) => setSchool(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#673AB7] focus:ring-[#673AB7] transition cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-xs text-slate-500 leading-snug cursor-pointer select-none">
                      I agree to the exam terms and consent to receiving exam timetable & scholarship updates from SmartUp.
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 font-bold text-sm text-white bg-[#673AB7] hover:bg-[#512DA8] active:bg-[#4527A0] rounded-xl transition-all shadow-md shadow-[#673AB7]/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>Proceed to Scholarship Exam</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#82C35B]" />
                    <span>Free registration • Official SmartUp Academic Evaluation</span>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-slate-200/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartUp Learning Ventures © {new Date().getFullYear()} • All rights reserved</span>
          <span className="font-mono text-slate-400">scholar.smartuplearning.net</span>
        </div>
      </footer>
    </div>
  );
}
