"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  MapPin,
  Phone,
  School,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Zap,
} from "lucide-react";

// Official SmartUp Color Palette:
// Primary Purple: #673AB7 (Hover: #512DA8, Deep: #4527A0, Midnight: #0E071A)
// Secondary Green (Logo icon accent): #82C35B (Hover: #6FAF48, Light: #EFF8E8, Glow: #9BE06E)

const SCHOLARSHIP_TIERS = [
  {
    tier: "Super 30 Diamond",
    percentage: "100%",
    criteria: "Top 5% Performers (Score 90%+)",
    badge: "100% Tuition Fee Waiver",
    border: "border-[#82C35B]/60",
    badgeBg: "bg-[#82C35B]/15 text-[#82C35B] border border-[#82C35B]/30",
    accentColor: "text-[#82C35B]",
    glow: "shadow-[0_0_30px_rgba(130,195,91,0.15)]",
  },
  {
    tier: "Gold Scholar",
    percentage: "75%",
    criteria: "Score 80% – 89%",
    badge: "75% Scholarship",
    border: "border-[#9575CD]/40",
    badgeBg: "bg-[#673AB7]/25 text-[#D1C4E9] border border-[#7E57C2]/40",
    accentColor: "text-[#D1C4E9]",
    glow: "shadow-[0_0_30px_rgba(103,58,183,0.15)]",
  },
  {
    tier: "Silver Scholar",
    percentage: "50%",
    criteria: "Score 70% – 79%",
    badge: "50% Scholarship",
    border: "border-white/10",
    badgeBg: "bg-white/5 text-slate-300 border border-white/10",
    accentColor: "text-white",
    glow: "",
  },
  {
    tier: "Bronze Scholar",
    percentage: "25%",
    criteria: "Score 55% – 69%",
    badge: "25% Scholarship",
    border: "border-white/10",
    badgeBg: "bg-white/5 text-slate-300 border border-white/10",
    accentColor: "text-slate-200",
    glow: "",
  },
];

const ELIGIBLE_CLASSES = [
  {
    level: "Class 8",
    curriculum: "Science & Maths Foundation",
    duration: "45 Mins",
    marks: "60 Marks",
  },
  {
    level: "Class 9",
    curriculum: "Physics, Chemistry, Maths & Bio",
    duration: "45 Mins",
    marks: "60 Marks",
  },
  {
    level: "Class 10",
    curriculum: "Board Mastery & Aptitude",
    duration: "45 Mins",
    marks: "60 Marks",
  },
  {
    level: "Plus One (+1)",
    curriculum: "Science (PCMB / PCMC)",
    duration: "60 Mins",
    marks: "80 Marks",
  },
  {
    level: "Plus Two (+2)",
    curriculum: "Entrance Foundation (NEET/JEE)",
    duration: "60 Mins",
    marks: "80 Marks",
  },
];

const BRANCHES = [
  "Smart Up Kadavanthara",
  "Smart Up Edappally",
  "Smart Up Vennala",
  "Smart Up Eraveli",
  "Smart Up Fortkochi",
  "Smart Up Chullickal",
  "Smart Up Palluruthy",
  "Smart Up Thopumpadi",
  "Smart Up Moolamkuzhi",
];

export default function ScholarDemoPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedClass, setSelectedClass] = useState("Class 10");
  const [school, setSchool] = useState("");
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || phone.replace(/\D/g, "").length < 10) {
      alert("Please provide a valid student name and 10-digit mobile number.");
      return;
    }
    setIsSubmitted(true);
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0514] text-slate-100 selection:bg-[#82C35B] selection:text-[#0A0514]">
      {/* Ambient background light gradients with exact SmartUp Purple & Green */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* SmartUp Brand Purple Glow Top Center */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-gradient-to-b from-[#673AB7]/30 via-[#512DA8]/20 to-transparent blur-[140px] opacity-80" />
        
        {/* SmartUp Green Accent Glow Right */}
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-[#82C35B]/10 blur-[130px]" />
        
        {/* SmartUp Purple Bottom Left */}
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-[#4527A0]/25 blur-[150px]" />
      </div>

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0A0514]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative p-1 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
              <Image
                src="/smartup-logo-v2.png"
                alt="SmartUp"
                width={40}
                height={40}
                className="object-contain drop-shadow"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-wider text-white uppercase leading-none">
                  SMART UP
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#82C35B]" />
              </div>
              <span className="text-[11px] font-bold text-[#82C35B] tracking-widest uppercase mt-0.5">
                Scholarship Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#82C35B]/10 text-[#82C35B] border border-[#82C35B]/25">
              <span className="w-2 h-2 rounded-full bg-[#82C35B] animate-pulse" />
              Registration Open 2026
            </span>
            <a
              href="#register"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#673AB7] to-[#512DA8] hover:from-[#7E57C2] hover:to-[#673AB7] rounded-xl transition-all shadow-lg shadow-[#673AB7]/30 hover:scale-[1.02] active:scale-[0.98] border border-[#9575CD]/30"
            >
              Register Now
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#82C35B]/30 bg-[#82C35B]/10 text-[#82C35B] text-xs sm:text-sm font-bold tracking-wide backdrop-blur-md shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#82C35B]" />
            <span>SmartUp Talent & Scholarship Search 2026</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.1]"
          >
            Unlock Up To{" "}
            <span className="bg-gradient-to-r from-[#82C35B] via-[#A5D6A7] to-[#82C35B] bg-clip-text text-transparent drop-shadow-sm">
              100% Scholarship
            </span>{" "}
            On Your Tuition Fees
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal"
          >
            Empowering students of Classes 8, 9, 10, Plus One & Plus Two.
            Take the online scholarship exam, showcase your potential, and claim fee waivers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-4 pt-2"
          >
            <a
              href="#register"
              className="flex items-center gap-2.5 px-8 py-4 text-base font-bold text-white bg-gradient-to-r from-[#673AB7] via-[#5E35B1] to-[#512DA8] hover:opacity-95 rounded-2xl transition-all shadow-xl shadow-[#673AB7]/35 hover:scale-[1.02] active:scale-[0.98] border border-[#7E57C2]/40"
            >
              <Zap className="w-5 h-5 text-[#82C35B]" />
              <span>Register for Exam</span>
              <ChevronRight className="w-4 h-4" />
            </a>
            <a
              href="#tiers"
              className="flex items-center gap-2 px-6 py-4 text-base font-semibold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-2xl transition-all"
            >
              <span>View Scholarship Tiers</span>
            </a>
          </motion.div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t border-white/10 text-left">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
              <div className="text-2xl font-black text-[#82C35B]">100%</div>
              <div className="text-xs text-slate-400 font-medium">Max Tuition Fee Waiver</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
              <div className="text-2xl font-black text-[#B39DDB]">Classes 8–12</div>
              <div className="text-xs text-slate-400 font-medium">State & CBSE Syllabus</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
              <div className="text-2xl font-black text-white">45 Mins</div>
              <div className="text-xs text-slate-400 font-medium">Objective MCQ Format</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-1">
              <div className="text-2xl font-black text-[#82C35B]">Instant</div>
              <div className="text-xs text-slate-400 font-medium">Verified Scorecard</div>
            </div>
          </div>
        </section>

        {/* Scholarship Slabs */}
        <section id="tiers" className="space-y-10 scroll-mt-28">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#82C35B] uppercase tracking-widest">
              <span>Transparent Rewards</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Scholarship Award Tiers
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Merit-based scholarships designed to reward top talent across Kerala branches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SCHOLARSHIP_TIERS.map((tier, idx) => (
              <motion.div
                key={tier.tier}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className={`relative p-6 rounded-3xl bg-[#130B24]/70 border ${tier.border} ${tier.glow} backdrop-blur-xl flex flex-col justify-between space-y-6 hover:border-[#82C35B]/60 transition-all group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {tier.tier}
                    </span>
                    <Award className={`w-5 h-5 ${tier.accentColor}`} />
                  </div>
                  <div>
                    <div className={`text-5xl font-black tracking-tight ${tier.accentColor}`}>
                      {tier.percentage}
                    </div>
                    <div className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg mt-2.5 ${tier.badgeBg}`}>
                      {tier.badge}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pt-3 border-t border-white/[0.08]">
                    {tier.criteria}
                  </p>
                </div>

                <div className="pt-2 flex items-center gap-2 text-xs font-medium text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-[#82C35B] flex-shrink-0" />
                  <span>Applicable for 2026-27 Batches</span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Classes Covered */}
        <section className="space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Eligible Classes & Structure
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
              Questions are created by expert SmartUp mentors based on standard academic curriculums.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ELIGIBLE_CLASSES.map((c) => (
              <div
                key={c.level}
                className="p-5 rounded-2xl bg-[#130B24]/60 border border-white/[0.08] hover:border-[#673AB7] transition-all space-y-3 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-white group-hover:text-[#82C35B] transition-colors">
                    {c.level}
                  </span>
                  <GraduationCap className="w-5 h-5 text-[#9575CD]" />
                </div>
                <div className="text-xs text-slate-300 font-medium">
                  {c.curriculum}
                </div>
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#82C35B]" /> {c.duration}
                  </span>
                  <span className="font-semibold text-slate-300">{c.marks}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Registration Form */}
        <section id="register" className="scroll-mt-28">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Form Info */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#82C35B]/10 border border-[#82C35B]/30 text-[#82C35B] text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Free Online Scholarship Registration</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Register Candidate for Exam
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                Fill in student details to book an exam slot for the SmartUp Scholarship Exam.
                Our academic counsellors will share the syllabus and online test details.
              </p>

              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-[#82C35B] flex-shrink-0 mt-0.5" />
                  <span>Objective test grading with instant detailed strengths & weaknesses report</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-[#82C35B] flex-shrink-0 mt-0.5" />
                  <span>Digital Scholarship Certificate redeemable at any SmartUp Learning branch</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-[#82C35B] flex-shrink-0 mt-0.5" />
                  <span>Free career & course guidance session with senior mentors</span>
                </div>
              </div>
            </div>

            {/* Registration Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-[#130B24]/90 border border-[#673AB7]/30 backdrop-blur-2xl shadow-2xl shadow-[#673AB7]/20 relative">
                {isSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-10 space-y-5"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#82C35B]/20 border border-[#82C35B]/40 text-[#82C35B] flex items-center justify-center mx-auto shadow-lg shadow-[#82C35B]/20">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black text-white">Registration Demo Confirmed!</h3>
                      <p className="text-sm text-slate-300 max-w-sm mx-auto">
                        Thank you, <span className="text-[#82C35B] font-bold">{name}</span>. Your slot for{" "}
                        <span className="text-[#82C35B] font-bold">{selectedClass}</span> has been logged.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-slate-300 space-y-1.5 text-left">
                      <div><strong className="text-white">Mobile:</strong> +91 {phone}</div>
                      <div><strong className="text-white">Preferred Branch:</strong> {branch}</div>
                      {school && <div><strong className="text-white">School:</strong> {school}</div>}
                    </div>

                    <div className="pt-3">
                      <button
                        onClick={() => setIsSubmitted(false)}
                        className="text-xs font-semibold text-[#82C35B] hover:underline cursor-pointer"
                      >
                        Register another candidate
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Student Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Menon"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-[#1A1033] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#82C35B] focus:ring-1 focus:ring-[#82C35B] transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Mobile Number *
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            required
                            maxLength={10}
                            placeholder="10-digit number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-[#1A1033] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#82C35B] focus:ring-1 focus:ring-[#82C35B] transition"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                          Grade / Class *
                        </label>
                        <div className="relative">
                          <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 text-sm bg-[#1A1033] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#82C35B] focus:ring-1 focus:ring-[#82C35B] transition appearance-none"
                          >
                            {ELIGIBLE_CLASSES.map((c) => (
                              <option key={c.level} value={c.level}>
                                {c.level}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        School Name (Optional)
                      </label>
                      <div className="relative">
                        <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="e.g. Bhavan's Vidya Mandir"
                          value={school}
                          onChange={(e) => setSchool(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-[#1A1033] border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-[#82C35B] focus:ring-1 focus:ring-[#82C35B] transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Preferred SmartUp Branch
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <select
                          value={branch}
                          onChange={(e) => setBranch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 text-sm bg-[#1A1033] border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#82C35B] focus:ring-1 focus:ring-[#82C35B] transition appearance-none"
                        >
                          {BRANCHES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-3 py-4 font-bold text-sm text-white bg-gradient-to-r from-[#673AB7] via-[#5E35B1] to-[#512DA8] hover:from-[#7E57C2] hover:to-[#673AB7] rounded-xl transition shadow-lg shadow-[#673AB7]/30 cursor-pointer border border-[#82C35B]/30 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      Book Scholarship Exam Slot
                    </button>

                    <p className="text-[11px] text-center text-slate-400 pt-1">
                      By registering, you agree to receive exam details & admission updates from SmartUp.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#07030E] py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">SmartUp Learning Ventures</span>
            <span>•</span>
            <span className="text-[#82C35B] font-medium">All rights reserved © 2026</span>
          </div>
          <div>
            <span>Portal: </span>
            <span className="font-mono text-[#82C35B]">scholar.smartuplearning.net</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
