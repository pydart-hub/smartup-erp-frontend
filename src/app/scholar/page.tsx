"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Trophy,
  User,
  ArrowRight,
  Lock,
  BarChart2,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";

// Official SmartUp Colors from mockup:
// Primary Brand Purple: #5C34A4 / #673AB7 (Gradient & Buttons)
// Light Purple Bg: #FAF9FD / White
// Class pill active: #5B32A3

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
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.replace(/\D/g, "").length < 10) {
      alert("Please enter a valid student name and 10-digit mobile number.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFE] text-slate-800 flex flex-col justify-between selection:bg-[#5C34A4] selection:text-white font-sans relative overflow-x-hidden">
      {/* Top Navigation Bar */}
      <header className="w-full bg-transparent py-5 px-6 sm:px-12 md:px-16">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp"
                width={40}
                height={40}
                priority
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-slate-900 leading-none">
                SMART UP
              </span>
              <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">
                Scholarship Exam
              </span>
            </div>
          </div>

          {/* Right Navigation Links */}
          <nav className="flex items-center gap-6 sm:gap-8">
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 hover:text-[#5C34A4] transition-colors"
            >
              About
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-slate-600 hover:text-[#5C34A4] transition-colors"
            >
              FAQ
            </a>
            <div className="bg-[#EFEBFA] text-[#5C34A4] px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide">
              Batch 2026-27
            </div>
          </nav>
        </div>
      </header>

      {/* Main Hero Container */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 md:px-16 py-6 sm:py-10 w-full flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* Left Column: Headline, Subtitle & Student Graphic with Floating Badges */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Tag / Eyebrow */}
            <div className="text-[12px] font-bold tracking-widest text-[#7C5CB7] uppercase mb-3">
              Smartup Scholarship Exam
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-slate-900 tracking-tight leading-[1.12] mb-4">
              Your Potential <br />
              <span className="text-[#5C34A4]">Our Support</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-500 max-w-xl font-normal leading-relaxed mb-8">
              Take the <strong className="text-slate-700 font-semibold">SmartUp Scholarship Exam</strong> for Classes 8, 9, 10, +1 &amp; +2 and get a chance for 100% tuition fee waiver.
            </p>

            {/* Visual Hero Area: Student Image & Floating Badges */}
            <div className="relative w-full max-w-[460px] mx-auto lg:mx-0 flex justify-center items-end pt-4 pb-2">
              {/* Circular Soft Purple Glow Backdrop */}
              <div className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-[#EFEBFA]/80 -z-10 bottom-6 left-1/2 -translate-x-1/2" />
              <div className="absolute w-96 h-96 rounded-full bg-purple-100/40 -z-20 blur-2xl bottom-0 left-1/2 -translate-x-1/2" />

              {/* Student Image */}
              <div className="relative w-[310px] h-[340px] sm:w-[360px] sm:h-[390px]">
                <Image
                  src="/scholar-hero-student.jpg"
                  alt="SmartUp Student"
                  fill
                  priority
                  className="object-cover object-top rounded-full"
                  sizes="(max-width: 640px) 310px, 360px"
                />
              </div>

              {/* Left Floating Badge: Learn Grow Achieve */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute left-0 bottom-24 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl shadow-purple-950/5 border border-slate-100 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-[#5C34A4]">
                  <BarChart2 className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-semibold text-slate-700">Learn</span>
                  <span className="text-[11px] font-semibold text-slate-700">Grow</span>
                  <span className="text-[11px] font-bold text-[#5C34A4]">Achieve</span>
                </div>
              </motion.div>

              {/* Right Floating Badge: Graduation Cap Circle */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute right-4 top-16 w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-white/95 backdrop-blur-md shadow-lg shadow-purple-950/5 border border-slate-100 flex items-center justify-center text-[#5C34A4]"
              >
                <GraduationCap className="w-7 h-7 stroke-[2]" />
              </motion.div>
            </div>
          </div>

          {/* Right Column: Register Now Form Card */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-[440px] bg-white rounded-[28px] p-7 sm:p-9 shadow-2xl shadow-purple-950/8 border border-slate-100/90"
            >
              {/* Form Title & Subtitle */}
              <div className="mb-6">
                <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight">
                  Register Now
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                  Free Exam Slot Registration
                </p>
              </div>

              {isSubmitted ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-[#EFEBFA] text-[#5C34A4] flex items-center justify-center mx-auto">
                    <Trophy className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-slate-900">Registration Complete!</h3>
                    <p className="text-xs text-slate-600">
                      Welcome, <strong className="text-[#5C34A4]">{name}</strong>. Your slot for{" "}
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
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-50 text-[11px] text-[#5C34A4] text-left flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>Exam schedule & link will be dispatched to your WhatsApp/SMS.</span>
                  </div>

                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs font-bold text-slate-500 hover:text-[#5C34A4] hover:underline cursor-pointer pt-1"
                  >
                    ← Register another student
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Student Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="Enter student name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition"
                      />
                    </div>
                  </div>

                  {/* Class / Grade */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Class / Grade <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {CLASSES.map((c) => {
                        const isSelected = selectedClass === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedClass(c.id)}
                            className={`py-2 px-1 text-center rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#5C34A4] text-white shadow-md shadow-purple-900/20"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Phone Number & District */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#5C34A4]/20 focus-within:border-[#5C34A4] transition">
                        <span className="inline-flex items-center px-3 text-xs font-semibold bg-slate-50 text-slate-600 border-r border-slate-200">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          placeholder="10 digits"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-3 py-2.5 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* District */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        District <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full appearance-none px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C34A4]/20 focus:border-[#5C34A4] transition cursor-pointer pr-9"
                        >
                          {KERALA_DISTRICTS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Register for Exam Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full py-3.5 px-6 font-semibold text-sm text-white bg-[#5C34A4] hover:bg-[#4E2B8E] active:bg-[#43237E] rounded-full transition-all shadow-lg shadow-purple-900/25 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Register for Exam</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 pt-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Your information is secure</span>
                  </div>
                </form>
              )}
            </motion.div>
          </div>

        </div>
      </main>

      {/* Footer (Empty / Minimal) */}
      <footer className="py-4 text-center text-xs text-slate-400">
        {/* Subtle spacing holder */}
      </footer>
    </div>
  );
}
