"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Trophy,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
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
  { id: "Class 8", label: "Class 8" },
  { id: "Class 9", label: "Class 9" },
  { id: "Class 10", label: "Class 10" },
  { id: "Plus One (+1)", label: "+1" },
  { id: "Plus Two (+2)", label: "+2" },
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
      alert("Please agree to the exam terms.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFD] text-slate-800 flex flex-col justify-between selection:bg-[#673AB7] selection:text-white font-sans relative overflow-hidden">
      {/* Subtle Glow Backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#673AB7]/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-[#82C35B]/5 rounded-full blur-3xl" />
      </div>

      {/* Clean Minimal Header */}
      <header className="w-full border-b border-slate-100/80 bg-white/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-[#673AB7] uppercase">
            SmartUp Academic Evaluation
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Official Portal
          </span>
        </div>
      </header>

      {/* Main Content: Focused Two-Column Layout */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10 sm:py-16 w-full flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Minimal Brand Logo & Inspiring Quote */}
          <div className="lg:col-span-6 space-y-8 lg:pr-8">
            <div className="flex items-center gap-3">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp"
                width={56}
                height={56}
                priority
                className="object-contain"
              />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black tracking-wider text-slate-900 uppercase leading-none">
                    SMART UP
                  </span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#82C35B]" />
                </div>
                <span className="text-xs font-bold text-[#673AB7] tracking-widest uppercase mt-1">
                  Scholarship Exam
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <blockquote className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.25]">
                “Education is the key that unlocks your true potential.”
              </blockquote>
              <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                Take the SmartUp Scholarship Exam to measure your academic strengths and earn certified tuition fee waivers.
              </p>
            </div>
          </div>

          {/* Right Column: Clean, Friction-Free Form Card */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-lg shadow-slate-900/5 space-y-5"
            >
              {/* Form Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#EDE7F6] text-[#673AB7]">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Student Details</h2>
                    <p className="text-xs text-slate-500">Free Exam Slot Registration</p>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-[#4E8F27] bg-[#EFF8E8] border border-[#82C35B]/30 px-2.5 py-0.5 rounded-full">
                  Free
                </span>
              </div>

              {isSubmitted ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-[#EFF8E8] text-[#4E8F27] flex items-center justify-center mx-auto border border-[#82C35B]/30">
                    <Trophy className="w-7 h-7" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900">Registration Complete!</h3>
                    <p className="text-xs text-slate-600">
                      Welcome, <strong className="text-[#673AB7]">{name}</strong>. Your slot for{" "}
                      <strong className="text-slate-800">{selectedClass}</strong> has been logged.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 text-left">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Number:</span>
                      <span className="font-mono font-bold">+91 {phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">District:</span>
                      <span>{district}</span>
                    </div>
                    {school && (
                      <div className="flex justify-between truncate">
                        <span className="text-slate-500">School:</span>
                        <span className="truncate max-w-[180px]">{school}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#EDE7F6]/70 border border-[#673AB7]/20 text-[11px] text-[#673AB7] text-left flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Exam schedule & link will be dispatched to your WhatsApp/SMS.</span>
                  </div>

                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs font-bold text-slate-500 hover:text-[#673AB7] hover:underline cursor-pointer pt-1"
                  >
                    ← Register another student
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Student Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
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
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* Class Selection Pills */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      Class / Grade <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {CLASSES.map((c) => {
                        const isSelected = selectedClass === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClass(c.id)}
                            className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#673AB7] text-white border-[#673AB7] shadow-sm"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone Number & District in 2 Columns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Mobile Number */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <div className="flex">
                        <span className="inline-flex items-center px-2.5 text-xs font-bold bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl text-slate-600">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10 digits"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-r-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                        />
                      </div>
                    </div>

                    {/* District */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs cursor-pointer"
                      >
                        {KERALA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* School Name (Optional) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                      School Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. St. Albert's HSS"
                      value={school}
                      onChange={(e) => setSchool(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#673AB7]/20 focus:border-[#673AB7] transition shadow-2xs"
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start gap-2 pt-0.5">
                    <input
                      type="checkbox"
                      id="consent"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#673AB7] focus:ring-[#673AB7] transition cursor-pointer"
                    />
                    <label htmlFor="consent" className="text-[11px] text-slate-500 leading-tight cursor-pointer select-none">
                      I agree to the exam terms and consent to receiving exam timetable & scholarship updates.
                    </label>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    className="w-full py-3 px-5 font-bold text-sm text-white bg-[#673AB7] hover:bg-[#512DA8] active:bg-[#4527A0] rounded-xl transition-all shadow-md shadow-[#673AB7]/25 flex items-center justify-center gap-2 cursor-pointer mt-1"
                  >
                    <span>Proceed to Scholarship Exam</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#82C35B]" />
                    <span>Free registration • Official SmartUp Evaluation</span>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="w-full bg-white border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartUp Learning Ventures © {new Date().getFullYear()}</span>
          <span className="font-mono text-slate-400 text-[11px]">scholar.smartuplearning.net</span>
        </div>
      </footer>
    </div>
  );
}
